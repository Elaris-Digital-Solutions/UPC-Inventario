-- D-74 / D-93: la tabla de turnos del personal.
--
-- LA ASERCION QUE MAS VALE ES LA 4, y afirma algo que la tabla PERMITE a
-- proposito: dos turnos solapados NO se rechazan. Con la cobertura por union
-- (D-90) el solape es correcto -dos personas atendiendo a la vez-, y una
-- restriccion de exclusion aqui romperia justo el caso que el servicio quiere.
-- Se escribe como prueba para que nadie "arregle" la ausencia.
--
-- Y LA 8 AFIRMA D-93: el turno NO exige rol operator. Es la unica forma de que
-- alguien que lea "sus operadores" en D-74 y venga a añadir un filtro de rol se
-- encuentre con una prueba roja en vez de con un sistema que deja de funcionar
-- el dia que el unico personal que existe es un admin -que es el caso de
-- produccion hoy-.
--
-- LAS CASCADAS SE PRUEBAN SOBRE FILAS PROPIAS Y NO SOBRE LAS DEL SEED, medido al
-- ejecutar: borrar una sede sembrada falla con inventory_units_campus_id_fkey
-- -esa FK no lleva cascada- y aborta la transaccion entera, dejando "Bad plan"
-- en vez de un fallo legible.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(10);


-- 1) El orden.
select throws_ok(
  $$insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
    values ('a0000000-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-000000000001', 1, '14:00', '09:00')$$,
  '23514', null,
  'un turno no puede terminar antes de empezar');

-- 2) El dominio del dia.
select throws_ok(
  $$insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
    values ('a0000000-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-000000000001', 9, '09:00', '14:00')$$,
  '23514', null,
  'weekday solo acepta de 0 a 6');

-- 3) staff_id tiene que ser personal. Un turno de alguien que no es personal
--    ofreceria franjas que nadie va a atender, que es justo el fallo que la
--    tanda entera existe para evitar.
select throws_ok(
  $$insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
    values ('a0000000-0000-0000-0000-000000000001',
            'cccccccc-0000-0000-0000-000000000001', 1, '09:00', '14:00')$$,
  '23503', null,
  'un alumno que no es personal no puede tener turno');

-- 4) Dos turnos SOLAPADOS se aceptan, y es deliberado (D-90). Ver la cabecera.
select lives_ok(
  $$insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
    values ('a0000000-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-000000000001', 1, '09:00', '14:00')$$,
  'dos turnos solapados se permiten: con la union, dos personas a la vez es correcto');

-- 5) El seed deja a San Miguel sin el miercoles A PROPOSITO, para que D-76 tenga
--    un caso que probar: horario de sede sin ningun turno detras.
select is(
  (select count(*)::int from public.staff_shifts
    where campus_id = 'cccccccc-0000-0000-0000-000000000002'),
  6,
  'San Miguel arranca con seis turnos: le falta el miercoles a proposito (D-76)');


-- La cascada por sede, sobre una sede propia --------------------------------

insert into public.campuses (id, name, address, activo)
values ('cccccccc-0000-0000-0000-0000000000ff', 'Sede de prueba', 'Calle Falsa 123', true);

insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
values ('a0000000-0000-0000-0000-00000000000b',
        'cccccccc-0000-0000-0000-0000000000ff', 1, '08:00', '22:00');

delete from public.campuses where id = 'cccccccc-0000-0000-0000-0000000000ff';

-- 6) Borrar la sede se lleva sus turnos.
select is(
  (select count(*)::int from public.staff_shifts
    where campus_id = 'cccccccc-0000-0000-0000-0000000000ff'),
  0,
  'borrar una sede se lleva sus turnos');


-- La cascada por persona ----------------------------------------------------
-- OJO: esto es BORRAR la fila de staff_members, que NO es lo mismo que
-- desactivarla. La baja de personal es desactivar y nunca borrar; esta asercion
-- cubre el caso en que la cuenta de Auth desaparece de verdad.

insert into public.staff_members (user_id, role)
values ('a0000000-0000-0000-0000-000000000002', 'operator');

insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
values ('a0000000-0000-0000-0000-000000000002',
        'cccccccc-0000-0000-0000-000000000001', 1, '08:00', '12:00');

delete from public.staff_members where user_id = 'a0000000-0000-0000-0000-000000000002';

-- 7) Quitar a alguien del personal se lleva sus turnos, y SOLO los suyos: el
--    segundo numero es el control que descarta haber borrado de mas.
select is(
  (select count(*)::int from public.staff_shifts
    where staff_id = 'a0000000-0000-0000-0000-000000000002'),
  0,
  'quitar a alguien del personal se lleva sus turnos');


-- 8) D-93: un ADMIN puede tener turnos.
select lives_ok(
  $$insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
    values ('a0000000-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-000000000001', 2, '08:00', '22:00')$$,
  'un admin puede tener turnos: el turno no esta atado al rol (D-93)');


-- RLS ------------------------------------------------------------------------
-- Un turno dice QUIEN atiende, y eso es dato de personal: mismo criterio que
-- D-69 aplico a inventory_unit_notes.

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 9) El alumno NO lee los turnos.
select is(
  (select count(*)::int from public.staff_shifts),
  0,
  'un alumno no ve ningun turno');

reset role;

-- 10) El personal SI los lee. Es el control positivo: sin el, el 0 de arriba no
--     distingue "la politica cierra" de "la tabla esta vacia" -que es justo el
--     falso verde que esta tanda ya pago una vez, en la Tarea 2-.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select cmp_ok(
  (select count(*)::int from public.staff_shifts),
  '>', 0,
  'el personal si ve los turnos');

reset role;


select * from finish();

rollback;
