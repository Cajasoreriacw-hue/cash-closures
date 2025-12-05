-- Tabla para gastos importados
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  store_id uuid references public.stores(id) on delete restrict,
  store_name_raw text not null, -- Nombre original del CSV para referencia
  provider text not null,
  expense_type text not null,
  total numeric not null,
  taxes numeric not null default 0,
  invoice_number text, -- Para evitar duplicados
  needs_review boolean default false, -- Para marcar registros que necesitan revisión manual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para optimizar consultas
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists expenses_store_idx on public.expenses(store_id);
create index if not exists expenses_type_idx on public.expenses(expense_type);
create index if not exists expenses_invoice_idx on public.expenses(invoice_number);
create index if not exists expenses_needs_review_idx on public.expenses(needs_review);

-- Índice único para evitar duplicados basados en número de factura
create unique index if not exists expenses_invoice_unique_idx 
  on public.expenses(invoice_number) 
  where invoice_number is not null;

-- Trigger para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_expenses_updated_at 
  before update on public.expenses
  for each row
  execute function update_updated_at_column();
