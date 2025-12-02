import type { SupabaseClient } from '@supabase/supabase-js';
import { dataCache } from '$lib/stores/cache';
import { Logger } from '$lib/utils/logger';

export type Cashier = {
	id: string;
	name: string;
};

export type Store = {
	id: string;
	name: string;
};

export type ChannelData = {
	name:
		| 'dataphone'
		| 'rappi'
		| 'justo'
		| 'apparta_pay'
		| 'transferencia_nequi'
		| 'transferencia_bancolombia';
	system: number;
	real: number;
};

export type EnvelopeData = {
	number: string;
	amount: number;
};

export type ClosureData = {
	date: string;
	note: string;
	cashierName: string; // We'll look up ID by name
	storeName: string; // We'll look up ID by name
	channels: ChannelData[];
	envelopes: EnvelopeData[];
	efectivo: {
		base: number;
		ventas: number;
		gastos: number;
		ingresos: number;
		egresos: number;
		pos: number;
		real: number;
		diferencia: number;
		porcentaje: number;
	};
};

export const getCashiers = async (supabase: SupabaseClient): Promise<string[]> => {
	// Check cache first
	const cached = dataCache.get<string[]>('cashiers');
	if (cached) {
		return cached;
	}

	const { data, error } = await supabase.from('cashiers').select('name').order('name');

	if (error) {
		Logger.error('Error fetching cashiers:', error);
		throw error;
	}

	const cashiers = data.map((c) => c.name);

	// Cache for 5 minutes
	dataCache.set('cashiers', cashiers, 5 * 60 * 1000);

	return cashiers;
};

export const getStores = async (supabase: SupabaseClient): Promise<string[]> => {
	// Check cache first
	const cached = dataCache.get<string[]>('stores');
	if (cached) {
		return cached;
	}

	const { data, error } = await supabase.from('stores').select('name').order('name');

	if (error) {
		Logger.error('Error fetching stores:', error);
		throw error;
	}

	const stores = data.map((s) => s.name);

	// Cache for 5 minutes
	dataCache.set('stores', stores, 5 * 60 * 1000);

	return stores;
};

export const createClosure = async (supabase: SupabaseClient, closure: ClosureData) => {
	// 1. Get Cashier ID
	const { data: cashierData, error: cashierError } = await supabase
		.from('cashiers')
		.select('id')
		.eq('name', closure.cashierName)
		.single();

	if (cashierError || !cashierData) {
		throw new Error(`Cajero no encontrado: ${closure.cashierName}`);
	}

	// 2. Get Store ID
	const { data: storeData, error: storeError } = await supabase
		.from('stores')
		.select('id')
		.eq('name', closure.storeName)
		.single();

	if (storeError || !storeData) {
		throw new Error(`Tienda no encontrada: ${closure.storeName}`);
	}

	// 3. Insert Closure
	const { data: closureResult, error: closureError } = await supabase
		.from('cash_closures')
		.insert({
			date: closure.date,
			note: closure.note,
			cashier_id: cashierData.id,
			store_id: storeData.id,
			ef_base: closure.efectivo.base,
			ef_ventas: closure.efectivo.ventas,
			ef_gastos: closure.efectivo.gastos,
			ef_ingresos: closure.efectivo.ingresos,
			ef_egresos: closure.efectivo.egresos,
			ef_pos: closure.efectivo.pos,
			ef_real: closure.efectivo.real,
			ef_diferencia: closure.efectivo.diferencia,
			ef_percent: closure.efectivo.porcentaje
		})
		.select()
		.single();

	if (closureError) {
		Logger.error('Error creating closure:', closureError);
		throw closureError;
	}

	// 4. Insert Channels
	const channelsToInsert = closure.channels.map((ch) => ({
		closure_id: closureResult.id,
		channel_name: ch.name,
		system_amount: ch.system,
		real_amount: ch.real
	}));

	const { error: channelsError } = await supabase
		.from('cash_closure_channels')
		.insert(channelsToInsert);

	if (channelsError) {
		Logger.error('Error creating channels:', channelsError);
		throw channelsError;
	}

	// 5. Insert Envelopes
	if (closure.envelopes.length > 0) {
		const envelopesToInsert = closure.envelopes.map((env) => ({
			closure_id: closureResult.id,
			envelope_number: env.number,
			amount: env.amount,
			status: env.number === 'SIN SOBRE' ? 'sin sobre' : 'activo en tienda'
		}));

		const { error: envelopesError } = await supabase
			.from('cash_envelopes')
			.insert(envelopesToInsert);

		if (envelopesError) {
			Logger.error('Error creating envelopes:', envelopesError);
			throw envelopesError;
		}
	}

	return closureResult;
};

export const updateClosure = async (
	supabase: SupabaseClient,
	closureId: string,
	closure: ClosureData
) => {
	// 1. Get Cashier ID
	const { data: cashierData, error: cashierError } = await supabase
		.from('cashiers')
		.select('id')
		.eq('name', closure.cashierName)
		.single();

	if (cashierError || !cashierData) {
		throw new Error(`Cajero no encontrado: ${closure.cashierName}`);
	}

	// 2. Get Store ID
	const { data: storeData, error: storeError } = await supabase
		.from('stores')
		.select('id')
		.eq('name', closure.storeName)
		.single();

	if (storeError || !storeData) {
		throw new Error(`Tienda no encontrada: ${closure.storeName}`);
	}

	// 3. Update Closure
	const { data: closureResult, error: closureError } = await supabase
		.from('cash_closures')
		.update({
			date: closure.date,
			note: closure.note,
			cashier_id: cashierData.id,
			store_id: storeData.id,
			ef_base: closure.efectivo.base,
			ef_ventas: closure.efectivo.ventas,
			ef_gastos: closure.efectivo.gastos,
			ef_ingresos: closure.efectivo.ingresos,
			ef_egresos: closure.efectivo.egresos,
			ef_pos: closure.efectivo.pos,
			ef_real: closure.efectivo.real,
			ef_diferencia: closure.efectivo.diferencia,
			ef_percent: closure.efectivo.porcentaje
		})
		.eq('id', closureId)
		.select()
		.single();

	if (closureError) {
		Logger.error('Error updating closure:', closureError);
		throw closureError;
	}

	// 4. Delete existing channels and insert new ones
	const { error: deleteChannelsError } = await supabase
		.from('cash_closure_channels')
		.delete()
		.eq('closure_id', closureId);

	if (deleteChannelsError) {
		Logger.error('Error deleting channels:', deleteChannelsError);
		throw deleteChannelsError;
	}

	const channelsToInsert = closure.channels.map((ch) => ({
		closure_id: closureId,
		channel_name: ch.name,
		system_amount: ch.system,
		real_amount: ch.real
	}));

	const { error: channelsError } = await supabase
		.from('cash_closure_channels')
		.insert(channelsToInsert);

	if (channelsError) {
		Logger.error('Error creating channels:', channelsError);
		throw channelsError;
	}

	// 5. Update envelopes - Delete existing and insert new ones
	const { error: deleteEnvelopesError } = await supabase
		.from('cash_envelopes')
		.delete()
		.eq('closure_id', closureId);

	if (deleteEnvelopesError) {
		Logger.error('Error deleting envelopes:', deleteEnvelopesError);
		throw deleteEnvelopesError;
	}

	if (closure.envelopes.length > 0) {
		const envelopesToInsert = closure.envelopes.map((env) => ({
			closure_id: closureId,
			envelope_number: env.number,
			amount: env.amount,
			status: env.number === 'SIN SOBRE' ? 'sin sobre' : 'activo en tienda'
		}));

		const { error: envelopesError } = await supabase
			.from('cash_envelopes')
			.insert(envelopesToInsert);

		if (envelopesError) {
			Logger.error('Error creating envelopes:', envelopesError);
			throw envelopesError;
		}
	}

	return closureResult;
};
