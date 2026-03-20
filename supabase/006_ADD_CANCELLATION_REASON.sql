-- Add explicit cancellation reason for admin/user-triggered unexpected issues
ALTER TABLE public.inventory_reservations
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN public.inventory_reservations.cancellation_reason IS 'Reason provided when a reservation is cancelled (e.g. imprevistos).';
