-- Maquina de estados de la reserva (tarea 1.7, corrige P1-7).
--
-- P1-7 en el codigo viejo era un filtro de conflictos invertido: bloqueaba con
-- `completed` e ignoraba `active`. Arreglar el filtro no arregla el problema de
-- fondo, que es que el estado podia ir de cualquier sitio a cualquier otro. Con
-- este trigger, `active` pasa a ser un estado del que solo se sale por dos
-- puertas, y el admin deja de poder resucitar una reserva terminal.
--
--   reserved -> active, cancelled, not_picked_up
--   active   -> completed, not_returned
--   cancelled, completed, not_picked_up, not_returned -> terminales
--
-- El motivo obligatorio al cancelar (BR-17) vive aca y no en la RPC de cancelar,
-- a proposito: asi tambien lo cumple el personal cuando cancela por UPDATE. Una
-- regla que solo vive en una de las dos puertas no es una regla.
--
-- Quien puede mover el estado: TODO el personal (D-16, 2026-08-05). Quien esta en
-- el mostrador es quien sabe si el equipo se entrego, si volvio o si nadie lo
-- recogio. La maquina de estados ya impide los saltos absurdos, asi que partir la
-- politica entre admin y operador anadiria complejidad sin cerrar ningun agujero.
--
-- El alumno sigue sin poder tocar el estado: tiene el privilegio de columna -se
-- concede al rol `authenticated`, que lo incluye- pero ninguna politica de UPDATE
-- le aplica, asi que su sentencia afecta a cero filas SIN error. Su unica via es
-- la RPC cancel_reservation.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.3.


create or replace function public.enforce_reservation_transition() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    if new.status = old.status then
      return new;
    end if;

    if not (
      (old.status = 'reserved' and new.status in ('active', 'cancelled', 'not_picked_up'))
      or (old.status = 'active' and new.status in ('completed', 'not_returned'))
    ) then
      raise exception 'Transicion no permitida: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.status = 'cancelled'
       and coalesce(btrim(new.cancellation_reason), '') = '' then
      raise exception 'Cancelar exige un motivo'
        using errcode = 'check_violation';
    end if;

    return new;
  end $$;

create trigger trg_enforce_reservation_transition
  before update of status on public.inventory_reservations
  for each row execute function public.enforce_reservation_transition();


-- Solo estas dos columnas, y solo para el personal. start_at, end_at, unit_id y
-- alumno_id no se conceden a nadie: mover una reserva de franja o de dueno es
-- cancelar y volver a reservar, que pasa por las reglas.
grant update (status, cancellation_reason)
  on public.inventory_reservations to authenticated;

create policy reservations_update_staff on public.inventory_reservations
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));
