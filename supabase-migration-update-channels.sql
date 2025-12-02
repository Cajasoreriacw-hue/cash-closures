-- Add new payment methods to the check constraint
ALTER TABLE public.cash_closure_channels
DROP CONSTRAINT cash_closure_channels_channel_name_check;

ALTER TABLE public.cash_closure_channels
ADD CONSTRAINT cash_closure_channels_channel_name_check
CHECK (channel_name IN ('dataphone', 'rappi', 'justo', 'apparta_pay', 'transferencia_nequi', 'transferencia_bancolombia'));

-- Add ef_percent column to cash_closures
ALTER TABLE public.cash_closures
ADD COLUMN IF NOT EXISTS ef_percent numeric;
