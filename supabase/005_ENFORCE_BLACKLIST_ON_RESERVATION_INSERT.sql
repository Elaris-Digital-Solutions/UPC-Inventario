BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_blacklist_on_reservation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'No se puede registrar la reserva: user_id es obligatorio.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_blacklist b
    WHERE b.user_id = NEW.user_id
      AND b.blocked_until > now()
  ) THEN
    RAISE EXCEPTION 'Usuario bloqueado. No puede registrar reservas mientras su sanción esté vigente.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_blacklist_on_reservation_insert ON public.inventory_reservations;

CREATE TRIGGER trg_enforce_blacklist_on_reservation_insert
BEFORE INSERT ON public.inventory_reservations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_blacklist_on_reservation_insert();

COMMIT;
