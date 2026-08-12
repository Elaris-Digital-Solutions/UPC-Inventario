-- Q-17 / D-38: un alumno no cancela una reserva reserved cuyo start_at ya paso.
--
-- Hoy si puede, y eso blanquea la falta: cancelled es terminal, asi que el
-- personal ya no puede marcarla not_picked_up despues. La reserva deja de
-- reflejar que el alumno no se presento.
--
-- La comprobacion nueva es solo para el alumno, guardada por not private.is_staff().
-- El personal ya puede cancelar por UPDATE directo, gracias a la politica
-- reservations_update_staff, y ese UPDATE no mira la hora: asi que bloquearlo
-- aca tambien dejaria la RPC mas estricta que esa otra puerta sobre la misma
-- tabla. NO es que el personal pueda cancelar "cualquier" reserva -- solo las
-- que estan en reserved, empezadas o no. Cancelar una active no lo puede nadie:
-- active -> cancelled no esta en enforce_reservation_transition()
-- (20260806005731_reservation_state_machine.sql:38-39), y esa es la limitacion
-- que D-40 asume para el dia inhabilitado de la T3B.
--
-- CREATE OR REPLACE conserva los privilegios de la funcion: sin drop delante,
-- como ya esta medido en 20260806171347_duration_slot_multiple.sql. El revoke a
-- public y anon sigue en pie y no se repite aqui.

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason         text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner     uuid;
  v_status    public.reservation_status;
  v_start_at  timestamptz;
  v_alumno_id uuid;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'La cancelacion exige un motivo' using errcode = 'check_violation';
  end if;

  select r.alumno_id, r.status, r.start_at into v_owner, v_status, v_start_at
    from public.inventory_reservations r
   where r.id = p_reservation_id;
  if not found then
    raise exception 'Reserva inexistente' using errcode = 'no_data_found';
  end if;

  v_alumno_id := private.current_alumno_id();

  if not private.is_staff()
     and (v_alumno_id is null or v_alumno_id <> v_owner) then
    raise exception 'No puedes cancelar una reserva ajena' using errcode = '42501';
  end if;

  if v_status <> 'reserved' then
    raise exception 'Solo se cancela una reserva en estado reserved (esta en %)', v_status
      using errcode = 'check_violation';
  end if;

  -- Q-17 / D-38: solo para el alumno. El personal cancela una reserva ya
  -- empezada por esta misma RPC o por UPDATE directo; las dos puertas quedan
  -- iguales de permisivas para el.
  if not private.is_staff() and v_start_at <= now() then
    raise exception 'No puedes cancelar una reserva que ya empezo' using errcode = 'check_violation';
  end if;

  update public.inventory_reservations
     set status = 'cancelled',
         cancellation_reason = p_reason
   where id = p_reservation_id;
end $$;
