BEGIN;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.inventory_reservations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.inventory_reservations DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE public.inventory_reservations
ADD CONSTRAINT inventory_reservations_status_check
CHECK (status IN ('reserved', 'active', 'cancelled', 'completed', 'not_returned'));

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_user_status_start
ON public.inventory_reservations(user_id, status, start_at);

CREATE OR REPLACE FUNCTION public.apply_inventory_reservation_penalties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_no_show_count integer;
  v_permaban_until timestamptz := '9999-12-31 23:59:59+00'::timestamptz;
  v_temp_ban_until timestamptz := now() + interval '15 days';
  v_has_permaban boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Regla 1: Si no recoge 2 veces -> baneo 15 días
  IF OLD.status = 'reserved'
     AND NEW.status = 'cancelled'
     AND NEW.start_at <= now()
  THEN
    SELECT COUNT(*)
    INTO v_no_show_count
    FROM public.inventory_reservations r
    WHERE r.user_id = NEW.user_id
      AND r.status = 'cancelled'
      AND r.start_at <= now();

    IF v_no_show_count >= 2 THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.inventory_blacklist b
        WHERE b.user_id = NEW.user_id
          AND b.blocked_until >= v_permaban_until
      ) INTO v_has_permaban;

      IF NOT v_has_permaban THEN
        UPDATE public.inventory_blacklist
        SET blocked_until = GREATEST(blocked_until, v_temp_ban_until),
            reason = 'Baneo automático 15 días: no recogió la reserva en 2 ocasiones.'
        WHERE user_id = NEW.user_id;

        IF NOT FOUND THEN
          INSERT INTO public.inventory_blacklist (user_id, blocked_until, reason)
          VALUES (
            NEW.user_id,
            v_temp_ban_until,
            'Baneo automático 15 días: no recogió la reserva en 2 ocasiones.'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- Regla 2: Si recoge y no devuelve el mismo día -> PERMABAN
  IF OLD.status = 'active' AND NEW.status = 'not_returned' THEN
    UPDATE public.inventory_blacklist
    SET blocked_until = v_permaban_until,
        reason = 'PERMABAN automático: recogió el dispositivo y no lo devolvió el mismo día.'
    WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
      INSERT INTO public.inventory_blacklist (user_id, blocked_until, reason)
      VALUES (
        NEW.user_id,
        v_permaban_until,
        'PERMABAN automático: recogió el dispositivo y no lo devolvió el mismo día.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_reservation_penalties ON public.inventory_reservations;

CREATE TRIGGER trg_inventory_reservation_penalties
AFTER UPDATE OF status ON public.inventory_reservations
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_reservation_penalties();

COMMIT;
