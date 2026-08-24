-- Q-18 / D-69: las notas de unidad las lee solo el personal.
--
-- La politica anterior era `for select to authenticated using (true)`
-- -20260805195549_traceability.sql:37-38-, sin recorte por rol ni por unidad.
-- Medido el 2026-08-12 contra el proyecto real, no deducido: un JWT de alumno
-- recibia HTTP 200 con la nota que describia la falta de OTRO alumno, la que se
-- acababa de escribir desde el mostrador.
--
-- ESTO ACOTA D-2, NO LO REVOCA. La trazabilidad sigue siendo legible; lo que
-- cambia es QUIEN la lee. Y el argumento que decide no es el costo de escribir
-- la politica: la lectura amplia NO SOSTIENE NINGUNA PANTALLA. La unica
-- consulta del arbol es notasPorUnidad() -lib/mostrador/notas.ts:36-, y sus dos
-- consumidores -app/(personal)/mostrador/page.tsx:88 y
-- app/(personal)/admin/inventario/[id]/page.tsx:41- viven los dos bajo el
-- layout de personal. Recortar la lectura no le quita una capacidad a nadie que
-- la estuviera usando.
--
-- EL NOMBRE CAMBIA A PROPOSITO. `unit_notes_select_auth` significaba
-- "cualquiera con sesion", y eso es justo lo que deja de ser cierto: un nombre
-- que afirma algo falso es peor que uno feo, porque el proximo lector deja de
-- comprobarlo. Mismo criterio que D-65, donde un comentario se corrigio para
-- decir lo que la cosa hace.
--
-- EL GRANT NO SE TOCA. `grant select on public.inventory_unit_notes to
-- authenticated` sigue igual: el privilegio decide que COLUMNAS y la politica
-- decide que FILAS. El personal tambien es `authenticated`, asi que revocar el
-- grant romperia justo a quien si debe leer.
--
-- Las otras dos politicas de la tabla -unit_notes_insert_staff y
-- unit_notes_delete_admin- ya estaban acotadas desde la Fase 1 y no se tocan.
--
-- A private.is_staff() se le CONCEDE execute, y esta concedido desde
-- 20260805193357_private_helpers.sql:92. Revocarselo rompe la politica: una
-- politica se evalua como el usuario que consulta, al reves que una funcion de
-- trigger, a la que invoca el motor.

drop policy if exists unit_notes_select_auth  on public.inventory_unit_notes;
drop policy if exists unit_notes_select_staff on public.inventory_unit_notes;

create policy unit_notes_select_staff on public.inventory_unit_notes
  for select to authenticated
  using ((select private.is_staff()));
