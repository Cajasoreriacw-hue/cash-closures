import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 1000
): Promise<T> {
	let lastError: Error | null = null;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			// Don't retry on authentication errors
			if (error && typeof error === 'object' && 'code' in error) {
				const code = (error as any).code;
				if (code === 'PGRST301' || code === '401') {
					throw error;
				}
			}

			if (i < maxRetries - 1) {
				const delay = baseDelay * Math.pow(2, i);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error('Max retries exceeded');
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout !== null) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Batch multiple queries into a single request when possible
 */
export async function batchQueries<T extends Record<string, any>>(
	queries: Record<string, () => Promise<any>>
): Promise<T> {
	const entries = Object.entries(queries);
	const results = await Promise.all(entries.map(([_, query]) => query()));

	return Object.fromEntries(entries.map(([key], index) => [key, results[index]])) as T;
}
