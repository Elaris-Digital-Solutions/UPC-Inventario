-- Trazabilidad (D-2): saber quien entrego y quien recibio cada equipo.
--
-- El motivo explicito de D-2 es poder auditar un equipo perdido. Eso solo sirve
-- si el registro no se puede falsear ni borrar.
--
-- created_by no lo rellena un trigger: lo pone un DEFAULT auth.uid(), y al
-- cliente no se le concede privilegio sobre esa columna. No puede escribirla, asi
-- que tampoco mentir en ella.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$insert into public.inventory_unit_notes (unit_id, note)
    values ('dddddddd-0000-0000-0000-000000000001', 'Rayon en la carcasa')$$,
  'el operador puede anotar sobre una unidad');

select is(
  (select created_by from public.inventory_unit_notes where note = 'Rayon en la carcasa'),
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  'created_by se rellena solo con quien escribe');

select throws_ok(
  $$insert into public.inventory_unit_notes (unit_id, note, created_by)
    values ('dddddddd-0000-0000-0000-000000000001', 'falsa',
            'a0000000-0000-0000-0000-00000000000a')$$,
  '42501', null,
  'nadie puede falsear created_by: no hay privilegio sobre esa columna');

select throws_ok(
  $$insert into public.reservation_status_log (reservation_id, new_status)
    values ('dddddddd-0000-0000-0000-000000000001', 'active')$$,
  '42501', null,
  'la auditoria no se escribe a mano: solo la escribe el trigger');

reset role;


-- Ni el admin edita la auditoria. Es solo-anexar para todos.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$delete from public.reservation_status_log$$,
  '42501', null,
  'ni el admin borra lineas de la auditoria');

-- Borrar no es la unica forma de falsear una auditoria: reescribirla tambien.
select throws_ok(
  $$update public.reservation_status_log set new_status = 'completed'$$,
  '42501', null,
  'ni el admin edita una linea de la auditoria');

reset role;


select * from finish();

rollback;
