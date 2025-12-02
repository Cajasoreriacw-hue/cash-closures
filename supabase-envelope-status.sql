-- Agregar columna de estado a la tabla de sobres
alter table public.cash_envelopes 
add column if not exists status text not null default 'activo en tienda';

-- Agregar constraint para validar los valores permitidos
alter table public.cash_envelopes
add constraint cash_envelopes_status_check 
check (status in (
  'activo en tienda',
  'retirado por rafael cepeda',
  'retirado por juan osorio',
  'apertura de sobre',
  'sin sobre'
));

-- Actualizar sobres existentes que tienen 'SIN SOBRE' como número
update public.cash_envelopes
set status = 'sin sobre'
where envelope_number = 'SIN SOBRE';

