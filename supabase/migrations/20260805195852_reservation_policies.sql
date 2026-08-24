-- Reservas y encuestas: lectura acotada, escritura por ninguna puerta.
--
-- inventory_reservations no recibe INSERT, UPDATE ni DELETE para nadie. La unica
-- via sera la RPC de la tanda 2, y de ahi sale la propiedad que buscaba la Fase 1:
-- las reglas de negocio -ventana movil, feriados, limite diario, buffer, duracion
-- por producto- no se pueden esquivar llamando a la API directamente. Eso cierra
-- P1-9.
--
-- La politica de la linea base leia alumnos desde dentro, lo que formaba un ciclo
-- con la politica nueva de alumnos que consulta reservas. Se reemplaza por el
-- helper SECURITY DEFINER, que resuelve el alumno de la sesion sin pasar por RLS.
--
-- Las politicas de encuesta tenian el mismo defecto que alumnos_update_own:
-- UPDATE con USING y sin WITH CHECK. Un alumno podia reasignar su respuesta a
-- otro alumno_id. Se rehacen las tres.

grant select on public.inventory_reservations to authenticated;

drop policy if exists reservations_select_own on public.inventory_reservations;

create policy reservations_select_own on public.inventory_reservations
  for select to authenticated
  using (alumno_id = (select private.current_alumno_id()));

-- El personal ve todas: el operador tiene que entregarlas y recibirlas, y el
-- admin las gestiona.
create policy reservations_select_staff on public.inventory_reservations
  for select to authenticated
  using ((select private.is_staff()));


drop policy if exists surveys_select_own on public.final_satisfaction_surveys;
drop policy if exists surveys_insert_own on public.final_satisfaction_surveys;
drop policy if exists surveys_update_own on public.final_satisfaction_surveys;

grant select, insert, update on public.final_satisfaction_surveys to authenticated;

create policy surveys_select_own on public.final_satisfaction_surveys
  for select to authenticated
  using (alumno_id = (select private.current_alumno_id()));

create policy surveys_insert_own on public.final_satisfaction_surveys
  for insert to authenticated
  with check (alumno_id = (select private.current_alumno_id()));

create policy surveys_update_own on public.final_satisfaction_surveys
  for update to authenticated
  using (alumno_id = (select private.current_alumno_id()))
  with check (alumno_id = (select private.current_alumno_id()));
