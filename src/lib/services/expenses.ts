import type { SupabaseClient } from '@supabase/supabase-js';
import Fuse from 'fuse.js';
import { Logger } from '$lib/utils/logger';

export type ExpenseRecord = {
    id?: string;
    date: string;
    store_id?: string;
    store_name_raw: string;
    provider: string;
    expense_type: string;
    total: number;
    taxes: number;
    invoice_number?: string;
    needs_review: boolean;
    created_at?: string;
    updated_at?: string;
};

export type ExpenseCSVRow = {
    'Fecha Gasto': string;
    Negocio: string;
    Proveedor: string;
    'Tipo de gasto': string;
    Total: string;
    Impuestos: string;
    'Número de Factura'?: string;
};

export type ProcessedExpense = {
    expense: ExpenseRecord;
    matchedStore?: { id: string; name: string; confidence: number };
};

export type ExpenseStats = {
    totalExpenses: number;
    totalAmount: number;
    byCategory: { category: string; total: number; count: number }[];
    byStore: { store: string; total: number; count: number }[];
    byMonth: { month: string; total: number; count: number }[];
};

/**
 * Clean store name by removing common prefixes
 */
export const cleanStoreName = (storeName: string): string => {
    if (!storeName) return '';

    // Remove common prefixes (case insensitive)
    const prefixesToRemove = [
        'GRUPO TCW SAS - THE CHEESE WHEEL - ',
        'GRUPO TCW SAS - ',
        'THE CHEESE WHEEL - ',
        'TCW - '
    ];

    let cleaned = storeName.trim();

    for (const prefix of prefixesToRemove) {
        // Case insensitive replacement
        const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        cleaned = cleaned.replace(regex, '');
    }

    return cleaned.trim();
};

/**
 * Fuzzy match store name from CSV to database stores
 */
export const matchStoreName = (
    csvStoreName: string,
    stores: { id: string; name: string }[]
): { id: string; name: string; confidence: number } | undefined => {
    if (!csvStoreName || stores.length === 0) return undefined;

    // Clean the CSV store name first
    const cleanedName = cleanStoreName(csvStoreName);

    // Try exact match first (case insensitive)
    const exactMatch = stores.find(
        (s) => s.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (exactMatch) {
        return {
            id: exactMatch.id,
            name: exactMatch.name,
            confidence: 1.0 // 100% confidence for exact match
        };
    }

    // If no exact match, use fuzzy matching
    const fuse = new Fuse(stores, {
        keys: ['name'],
        threshold: 0.4, // 0 = exact match, 1 = match anything
        includeScore: true
    });

    const results = fuse.search(cleanedName);

    if (results.length > 0 && results[0].score !== undefined) {
        const match = results[0];
        const score = match.score ?? 1; // Default to 1 if undefined
        const confidence = 1 - score; // Convert score to confidence (higher is better)

        return {
            id: match.item.id,
            name: match.item.name,
            confidence: confidence
        };
    }

    return undefined;
};

/**
 * Parse CSV row to ExpenseRecord
 */
export const parseExpenseRow = (
    row: ExpenseCSVRow,
    stores: { id: string; name: string }[]
): ProcessedExpense => {
    // Parse date (assuming format DD/MM/YYYY or YYYY-MM-DD)
    let date = row['Fecha Gasto'];
    if (date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // Parse numbers
    const total = parseFloat(row.Total.replace(/[^0-9.-]/g, '')) || 0;
    const taxes = parseFloat(row.Impuestos.replace(/[^0-9.-]/g, '')) || 0;

    // Match store
    const matchedStore = matchStoreName(row.Negocio, stores);

    const expense: ExpenseRecord = {
        date,
        store_name_raw: row.Negocio,
        provider: row.Proveedor,
        expense_type: row['Tipo de gasto'],
        total,
        taxes,
        invoice_number: row['Número de Factura'] || undefined,
        needs_review: !matchedStore || matchedStore.confidence < 0.8, // Mark for review if no match or low confidence
        store_id: matchedStore?.id
    };

    return {
        expense,
        matchedStore
    };
};

/**
 * Batch insert expenses with optimized upsert
 */
export const batchInsertExpenses = async (
    supabase: SupabaseClient,
    expenses: ExpenseRecord[],
    batchSize: number = 100
): Promise<{ success: number; errors: number; duplicates: number }> => {
    let success = 0;
    let errors = 0;
    let duplicates = 0;

    // Process in batches
    for (let i = 0; i < expenses.length; i += batchSize) {
        const batch = expenses.slice(i, i + batchSize);

        try {
            // Use upsert to handle duplicates based on invoice_number
            const { data, error } = await supabase.from('expenses').upsert(batch, {
                onConflict: 'invoice_number',
                ignoreDuplicates: false // Update existing records
            });

            if (error) {
                Logger.error(`Batch insert error (batch ${i / batchSize + 1}):`, error);
                errors += batch.length;
            } else {
                success += batch.length;
            }
        } catch (err) {
            Logger.error(`Batch insert exception (batch ${i / batchSize + 1}):`, err);
            errors += batch.length;
        }

        // Small delay to avoid overwhelming the database
        if (i + batchSize < expenses.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    return { success, errors, duplicates };
};

/**
 * Get expense statistics with filters
 */
export const getExpenseStats = async (
    supabase: SupabaseClient,
    filters: {
        startDate?: string;
        endDate?: string;
        storeId?: string;
        category?: string;
    } = {}
): Promise<ExpenseStats> => {
    let query = supabase.from('expenses').select(`
    id,
    date,
    store_id,
    expense_type,
    total,
    stores (name)
  `);

    // Apply filters
    if (filters.startDate) {
        query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('date', filters.endDate);
    }
    if (filters.storeId) {
        query = query.eq('store_id', filters.storeId);
    }
    if (filters.category) {
        query = query.eq('expense_type', filters.category);
    }

    const { data, error } = await query;

    if (error) {
        Logger.error('Error fetching expense stats:', error);
        throw error;
    }

    // Calculate statistics
    const totalExpenses = data?.length || 0;
    const totalAmount = data?.reduce((sum, exp) => sum + (exp.total || 0), 0) || 0;

    // Group by category
    const categoryMap = new Map<string, { total: number; count: number }>();
    data?.forEach((exp) => {
        const cat = exp.expense_type || 'Sin categoría';
        const current = categoryMap.get(cat) || { total: 0, count: 0 };
        categoryMap.set(cat, {
            total: current.total + (exp.total || 0),
            count: current.count + 1
        });
    });

    const byCategory = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({ category, ...stats }))
        .sort((a, b) => b.total - a.total);

    // Group by store
    const storeMap = new Map<string, { total: number; count: number }>();
    data?.forEach((exp: any) => {
        const store = exp.stores?.name || 'Sin asignar';
        const current = storeMap.get(store) || { total: 0, count: 0 };
        storeMap.set(store, {
            total: current.total + (exp.total || 0),
            count: current.count + 1
        });
    });

    const byStore = Array.from(storeMap.entries())
        .map(([store, stats]) => ({ store, ...stats }))
        .sort((a, b) => b.total - a.total);

    // Group by month
    const monthMap = new Map<string, { total: number; count: number }>();
    data?.forEach((exp) => {
        const month = exp.date.substring(0, 7); // YYYY-MM
        const current = monthMap.get(month) || { total: 0, count: 0 };
        monthMap.set(month, {
            total: current.total + (exp.total || 0),
            count: current.count + 1
        });
    });

    const byMonth = Array.from(monthMap.entries())
        .map(([month, stats]) => ({ month, ...stats }))
        .sort((a, b) => a.month.localeCompare(b.month));

    return {
        totalExpenses,
        totalAmount,
        byCategory,
        byStore,
        byMonth
    };
};

/**
 * Get expense categories (distinct expense types)
 */
export const getExpenseCategories = async (supabase: SupabaseClient): Promise<string[]> => {
    const { data, error } = await supabase
        .from('expenses')
        .select('expense_type')
        .order('expense_type');

    if (error) {
        Logger.error('Error fetching expense categories:', error);
        return [];
    }

    // Get unique categories
    const categories = [...new Set(data?.map((e) => e.expense_type) || [])];
    return categories;
};
