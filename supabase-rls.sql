-- Enable RLS on all tables
alter table public.cashiers enable row level security;
alter table public.stores enable row level security;
alter table public.cash_closures enable row level security;
alter table public.cash_closure_channels enable row level security;
alter table public.cash_envelopes enable row level security;

-- Create policies
-- Allow authenticated users to read/write everything
-- (Adjust these policies if you need more granular control in the future)

-- Cashiers
create policy "Enable read access for authenticated users" on public.cashiers for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on public.cashiers for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on public.cashiers for update to authenticated using (true);

-- Stores
create policy "Enable read access for authenticated users" on public.stores for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on public.stores for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on public.stores for update to authenticated using (true);

-- Cash Closures
create policy "Enable read access for authenticated users" on public.cash_closures for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on public.cash_closures for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on public.cash_closures for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on public.cash_closures for delete to authenticated using (true);

-- Cash Closure Channels
create policy "Enable read access for authenticated users" on public.cash_closure_channels for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on public.cash_closure_channels for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on public.cash_closure_channels for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on public.cash_closure_channels for delete to authenticated using (true);

-- Cash Envelopes
create policy "Enable read access for authenticated users" on public.cash_envelopes for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on public.cash_envelopes for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on public.cash_envelopes for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on public.cash_envelopes for delete to authenticated using (true);
