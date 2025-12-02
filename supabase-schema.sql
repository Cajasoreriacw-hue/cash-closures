-- Tablas base para la app de cierres de caja

-- Cajeros
create table if not exists public.cashiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Tiendas / sedes
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Cierres de caja
create table if not exists public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  note text default ''::text,
  cashier_id uuid not null references public.cashiers(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,

  ef_base numeric not null,
  ef_ventas numeric not null,
  ef_gastos numeric not null,
  ef_ingresos numeric not null,
  ef_egresos numeric not null,
  ef_pos numeric not null,
  ef_real numeric not null,
  ef_diferencia numeric not null,

  created_at timestamptz not null default now()
);

-- Canales de pago por cierre (datáfono, rappi, justo)
create table if not exists public.cash_closure_channels (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.cash_closures(id) on delete cascade,
  channel_name text not null check (channel_name in ('dataphone', 'rappi', 'justo')),
  system_amount numeric not null,
  real_amount numeric not null
);

-- Índices útiles
create index if not exists cash_closures_date_idx on public.cash_closures(date);
create index if not exists cash_closures_cashier_idx on public.cash_closures(cashier_id);
create index if not exists cash_closures_store_idx on public.cash_closures(store_id);
create index if not exists cash_closure_channels_closure_idx on public.cash_closure_channels(closure_id);

-- Datos iniciales opcionales para cajeros y tiendas
insert into public.cashiers (name)
values ('yeseldis cordoba'), ('andres laureano')
on conflict (name) do nothing;

insert into public.stores (name)
values
  ('CC Palatino'),
  ('CC Gran Estación'),
  ('CC Plaza Claro'),
  ('Santa Barbará'),
  ('Green Office'),
  ('Quinta Camacho')
on conflict (name) do nothing;
