-- Migracion 32: borra los datos de demo de produccion (D-84).
--
-- ES LA UNICA OPERACION DE LA FASE 3 QUE BORRA FILAS DE PRODUCCION, y la
-- confirmo Alejandro el 2026-08-19 con la lista contada por delante.
--
-- QUE BORRA, medido contra el proyecto real y no supuesto:
--   4 alumnos sin cuenta de Auth, sembrados el 2026-08-13 como demo
--   8 reservas suyas
--   3 filas de reservation_status_log, que se van por CASCADE
-- El usuario real -u20241b820@upc.edu.pe- tiene 0 reservas, asi que no hay
-- nada suyo que esto pueda rozar.
--
-- POR QUE POR LISTA DE IDS Y NO POR CONDICION. Dos criterios que parecen
-- mejores y son peores:
--   `auth_user_id is null` -- alumnos.auth_user_id lleva ON DELETE SET NULL
--     sobre auth.users -alumnos_auth_user_id_fkey, medido-, asi que un alumno
--     REAL cuya cuenta de Auth se borrara algun dia quedaria con NULL y
--     entraria en un barrido por esa condicion.
--   `email like 'demo.%'` -- es una convencion de nombres, no una regla del
--     sistema. Nada impide que una persona real se llame asi.
--
-- EL ORDEN NO ES OPCIONAL, y el diseno de la fase se equivocaba al respecto:
-- avisaba de que el borrado "arrastra por on delete cascade", y la arista
-- inventory_reservations -> alumnos es NO ACTION. Borrar el alumno con
-- reservas NO arrastra: FALLA. Las reservas van primero.
--
-- POR QUE UNA FUNCION Y NO UN DELETE SUELTO: una migracion corre una vez y
-- ANTES que el seed, asi que ninguna prueba puede ejercitarla. La funcion si.
-- Es el patron que ya validaron la 28 y la 30.
--
-- POR QUE NO ES `security definer`, al reves que la 31: solo la llaman esta
-- migracion y la prueba, las dos como postgres. Sin definer, una ejecucion
-- inesperada correria con los privilegios de quien llama y RLS la pararia.
create or replace function private.borrar_alumnos_demo(p_ids uuid[])
returns integer
language plpgsql set search_path = ''
as $func$
declare
  v_borrados integer;
begin
  -- Primero las reservas. reservation_status_log cuelga de ellas con CASCADE,
  -- asi que se va sola; final_satisfaction_surveys cuelga del alumno, tambien
  -- con CASCADE.
  delete from public.inventory_reservations where alumno_id = any(p_ids);

  delete from public.alumnos where id = any(p_ids);
  get diagnostics v_borrados = row_count;

  return v_borrados;
end;
$func$;


-- "No conceder" no es "nadie puede": Postgres concede EXECUTE a PUBLIC en
-- toda funcion nueva, y private tiene grant usage para authenticated.
revoke all on function private.borrar_alumnos_demo(uuid[]) from public;


comment on function private.borrar_alumnos_demo(uuid[]) is
  'D-84: borra alumnos por lista de ids, con sus reservas primero. Existe como '
  'funcion y no como DELETE suelto para que la prueba pgTAP pueda ejercitarla.';


-- LA LLAMADA. En local no toca ni una fila -- estos ids no existen en el
-- seed -- y eso es correcto, no un fallo: cero filas cambiadas es
-- indistinguible de cero filas que cambiar, asi que lo que verifica la funcion
-- es la prueba 40 sobre fixtures, y lo que verifica ESTA llamada es la sonda
-- contra produccion despues del db push.
select private.borrar_alumnos_demo(array[
  '4c4a4c5a-ba68-4391-a542-56cc57cdda4a'::uuid,  -- demo.ana.torres@upc.edu.pe
  '64293784-dceb-4972-846f-20ea17fd5383'::uuid,  -- demo.bruno.diaz@upc.edu.pe
  '4e66e2f0-1a58-4656-afe5-4fe2e232b076'::uuid,  -- demo.diego.luna@upc.edu.pe
  '56cb0cd5-53eb-4b13-9d4e-e2588905fd22'::uuid   -- demo.carla.rojas@upc.edu.pe
]);
