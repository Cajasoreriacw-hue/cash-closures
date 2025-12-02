-- Tabla para los sobres de efectivo
create table if not exists public.cash_envelopes (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.cash_closures(id) on delete cascade,
  envelope_number text not null,
  amount numeric not null check (amount >= 0)
);

create index if not exists cash_envelopes_closure_idx on public.cash_envelopes(closure_id);
