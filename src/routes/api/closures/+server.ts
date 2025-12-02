import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Logger } from '$lib/utils/logger';

export type Channel = {
  name: string;
  system: number;
  real: number;
};

export type CashClosure = {
  id: string;
  date: string;
  note: string;
  cashier: string; // cajero responsable
  store: string; // tienda / sede
  channels: {
    dataphone: Channel;
    rappi: Channel;
    justo: Channel;
  };
  efectivo: {
    base: number;
    ventas: number;
    gastos: number;
    ingresos: number;
    egresos: number;
    pos: number;
    real: number;
    diferencia: number;
  };
  createdAt: string;
};

export type Sobre = {
  id: string;
  date: string;
  cashier: string;
  store: string;
  valorSobre: number | null; // null cuando es "sin sobre"
  sinSobre: boolean;
  closureId: string;
  createdAt: string;
};

// Listas por defecto de cajeros y tiendas para usar en dropdowns del frontend
const defaultCashiers: string[] = [
  'yeseldis cordoba',
  'andres laureano'
];

const defaultStores: string[] = [
  'CC Palatino',
  'CC Gran Estación',
  'CC Plaza Claro',
  'Santa Barbará',
  'Green Office',
  'Quinta Camacho'
];

// Por ahora guardamos en memoria (se reinicia al reiniciar el servidor).
// Más adelante se puede cambiar a base de datos real.
const closures: CashClosure[] = [];
const sobres: Sobre[] = [];

export const GET: RequestHandler = async ({ request, locals: { supabase } }) => {
  // Si no hay configuración de Supabase, devolvemos los datos en memoria
  if (!supabase) {
    return json({
      closures,
      sobres,
      cashiers: defaultCashiers,
      stores: defaultStores
    });
  }

  // Leer cierres y canales desde Supabase y mapearlos a la estructura usada en el frontend
  // Leer cierres y canales desde Supabase y mapearlos a la estructura usada en el frontend
  let query = supabase
    .from('cash_closures')
    .select(
      `
        id,
        date,
        note,
        created_at,
        cashier:cashiers(name),
        store:stores(name),
        ef_base,
        ef_ventas,
        ef_gastos,
        ef_ingresos,
        ef_egresos,
        ef_pos,
        ef_real,
        ef_diferencia,
        channels:cash_closure_channels(
          channel_name,
          system_amount,
          real_amount
        )
      `
    )
    .order('date', { ascending: false });

  const limitParam = new URL(request.url).searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 50;

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;

  if (error) {
    Logger.error('Error fetching closures from Supabase', error);
    return json(
      {
        closures: [],
        sobres: [],
        cashiers: defaultCashiers,
        stores: defaultStores,
        error: 'Error al cargar cierres desde la base de datos'
      },
      { status: 500 }
    );
  }

  const mappedClosures: CashClosure[] = (rows ?? []).map((row: any) => {
    const channelsObj: CashClosure['channels'] = {
      dataphone: {
        name: 'Datáfono',
        system: 0,
        real: 0
      },
      rappi: {
        name: 'Rappi',
        system: 0,
        real: 0
      },
      justo: {
        name: 'Justo',
        system: 0,
        real: 0
      }
    };

    for (const ch of row.channels ?? []) {
      if (ch.channel_name === 'dataphone') {
        channelsObj.dataphone.system = Number(ch.system_amount ?? 0);
        channelsObj.dataphone.real = Number(ch.real_amount ?? 0);
      }
      if (ch.channel_name === 'rappi') {
        channelsObj.rappi.system = Number(ch.system_amount ?? 0);
        channelsObj.rappi.real = Number(ch.real_amount ?? 0);
      }
      if (ch.channel_name === 'justo') {
        channelsObj.justo.system = Number(ch.system_amount ?? 0);
        channelsObj.justo.real = Number(ch.real_amount ?? 0);
      }
    }

    const efectivo = {
      base: Number(row.ef_base ?? 0),
      ventas: Number(row.ef_ventas ?? 0),
      gastos: Number(row.ef_gastos ?? 0),
      ingresos: Number(row.ef_ingresos ?? 0),
      egresos: Number(row.ef_egresos ?? 0),
      pos: Number(row.ef_pos ?? 0),
      real: Number(row.ef_real ?? 0),
      diferencia: Number(row.ef_diferencia ?? 0)
    };

    const createdAtIso = row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString();

    return {
      id: row.id,
      date: row.date,
      note: row.note ?? '',
      cashier: row.cashier?.name ?? '',
      store: row.store?.name ?? '',
      channels: channelsObj,
      efectivo,
      createdAt: createdAtIso
    } satisfies CashClosure;
  });

  // Obtener listas de cajeros y tiendas desde las tablas correspondientes
  const [{ data: cashiersData }, { data: storesData }] = await Promise.all([
    supabase.from('cashiers').select('name'),
    supabase.from('stores').select('name')
  ]);

  const cashiers = (cashiersData ?? []).map((c: any) => c.name as string);
  const stores = (storesData ?? []).map((s: any) => s.name as string);

  return json({
    closures: mappedClosures,
    sobres: [], // Los sobres aún viven en memoria / lógica aparte
    cashiers: cashiers.length ? cashiers : defaultCashiers,
    stores: stores.length ? stores : defaultStores
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const data = (await request.json()) as Omit<CashClosure, 'id' | 'createdAt'>;

  const now = new Date().toISOString();
  const closureId = crypto.randomUUID();

  const closure: CashClosure = {
    ...data,
    id: closureId,
    createdAt: now
  };

  closures.push(closure);

  // calcular valor del sobre: efectivo real - base
  const valorSobreCalc = closure.efectivo.real - closure.efectivo.base;
  const sinSobre = valorSobreCalc < 0;

  const sobre: Sobre = {
    id: crypto.randomUUID(),
    date: closure.date,
    cashier: closure.cashier,
    store: closure.store,
    valorSobre: sinSobre ? null : valorSobreCalc,
    sinSobre,
    closureId,
    createdAt: now
  };

  sobres.push(sobre);

  return json({ closure, sobre }, { status: 201 });
};
