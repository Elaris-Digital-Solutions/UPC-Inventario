-- Cancelacion (BR-17).
--
-- Es RPC y no UPDATE por la misma razon que la creacion: asi el motivo
-- obligatorio se cumple en el motor. El alumno no tiene politica de UPDATE sobre
-- inventory_reservations, asi que esta es su unica via.
--
-- El personal tambien puede cancelar, por aca o por UPDATE directo: en los dos
-- casos el trigger de la maquina de estados exige el motivo. Una regla que solo
-- vive en una de las dos puertas no es una regla.
--
-- SECURITY DEFINER, asi que se comprueba la propiedad a mano: al correr como
-- dueno de la tabla, RLS no filtra nada y una reserva ajena seria perfectamente
-- visible desde dentro de la funcion.

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason         text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner     uuid;
  v_status    public.reservation_status;
  v_alumno_id uuid;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'La cancelacion exige un motivo' using errcode = 'check_violation';
  end if;

  select r.alumno_id, r.status into v_owner, v_status
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

  update public.inventory_reservations
     set status = 'cancelled',
         cancellation_reason = p_reason
   where id = p_reservation_id;
end $$;

revoke execute on function public.cancel_reservation(uuid, text) from public, anon;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
