-- Q-18 / D-69: las notas de unidad las lee SOLO el personal.
--
-- Hasta la migracion 25 la politica era `for select to authenticated using
-- (true)`, sin recorte por rol ni por unidad. Medido el 2026-08-12 contra el
-- proyecto real: un JWT de alumno recibia HTTP 200 con la nota que describia la
-- falta de OTRO alumno.
--
-- LAS DOS PUNTAS EN LA MISMA CORRIDA, y no es ceremonia: el modo de fallo de
-- esta migracion es que la politica no deje leer a NADIE, y eso daria el mismo
-- cero que la politica correcta. Las aserciones 1 y 2 son el control positivo.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);


-- Fixture: una nota escrita por el operador sobre una unidad de la camara.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

insert into public.inventory_unit_notes (unit_id, note)
  values ('dddddddd-0000-0000-0000-000000000001',
          'Q-18: esta nota solo la lee el personal');

-- 1) El OPERADOR que la escribio la lee. CONTROL POSITIVO.
select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  1::bigint,
  'el operador SI lee la nota (control positivo)');

reset role;


-- 2) El ADMIN tambien: is_staff() cubre los dos roles, no solo al operador.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  1::bigint,
  'el admin SI lee la nota (control positivo del otro rol de personal)');

reset role;


-- 3) El ALUMNO no la ve. CERO FILAS Y SIN ERROR: falta de politica no lanza
-- excepcion, deja el SELECT en cero. Por eso se comprueba el efecto con is() y
-- no con throws_ok().
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  0::bigint,
  'el alumno NO lee la nota del mostrador (Q-18 cerrado)');

-- 4) Y no ve NINGUNA nota de la tabla, no solo la de la fixture. Sin esta, una
-- politica que filtrara por el texto de la nota pasaria la 3 sin cerrar Q-18.
select is(
  (select count(*) from public.inventory_unit_notes),
  0::bigint,
  'el alumno no ve ninguna nota de la tabla, no solo la de la fixture');

reset role;


select * from finish();

rollback;
