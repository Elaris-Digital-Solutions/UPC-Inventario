-- M-12 / D-70, D-71: margen minimo para cancelar ANTES de que empiece.
--
-- D-38 (migracion 23) cerro la mitad de M-12: no se cancela una reserva que YA
-- EMPEZO. Esta es la otra mitad.
--
-- Las reservas se insertan DIRECTAS, como postgres y antes de cualquier
-- "set local role", por el mismo motivo que 31_cancel_before_start.sql:
-- create_reservation tiene sus propias reglas de horario y de cupo, y aca lo
-- que se prueba es la RPC de CANCELAR.
--
-- TRES UNIDADES DISTINTAS de la camara -hay tres en el seed- para que el
-- EXCLUDE anti-solape sea indiferente a que las tres reservas se pisen en el
-- tiempo. El cupo diario por producto no interviene: lo aplica
-- create_reservation, no un CHECK de la tabla.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

update public.app_settings set min_cancel_minutes = 60 where id;

create temporary table fx as
select a.id            as alumno_a,
       now() + interval '30 minutes' as t_dentro,
       now() + interval '3 hours'    as t_fuera
  from public.alumnos a
 where a.auth_user_id = 'a0000000-0000-0000-0000-000000000001';


-- R1: empieza en 30 min, o sea DENTRO del margen de 60. Aserciones 1, 2 y 5.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'dentro del margen, la cancelacion se rechaza', t_dentro, t_dentro + interval '2 hours'
  from fx;

-- R2: empieza en 3 h, o sea FUERA del margen. Asercion 3, el control positivo.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000002',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000002',
       alumno_a, 'fuera del margen, se cancela normal', t_fuera, t_fuera + interval '2 hours'
  from fx;

-- R3: dentro del margen, para que la cancele el PERSONAL. Asercion 4 (D-71).
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000003',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000003',
       alumno_a, 'dentro del margen, la cancela el personal', t_dentro, t_dentro + interval '2 hours'
  from fx;


-- 1) El alumno NO cancela dentro del margen.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000001', 'me arrepenti')$$,
  '%60 minutos antes%',
  'el alumno no cancela una reserva que empieza dentro del margen (M-12)');

-- 2) Y la fila NO se movio. El rechazo tiene que dejarla en reserved: falta de
-- politica deja un UPDATE en cero filas SIN error, asi que se comprueba el
-- efecto y no solo la excepcion.
select is(
  (select status::text from public.inventory_reservations
    where id = '34343434-0000-0000-0000-000000000001'),
  'reserved',
  'la reserva rechazada por el margen sigue en reserved');

-- 3) CONTROL POSITIVO: fuera del margen se cancela igual que siempre. Sin
-- esta, una regla rota que rechazara TODA cancelacion pasaria la 1 y la 2.
select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000002', 'ya no lo necesito')$$,
  'fuera del margen el alumno cancela normal (control positivo)');

reset role;


-- 4) El PERSONAL si cancela dentro del margen: D-71, misma exencion que D-38.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000003', 'aviso por telefono')$$,
  'el personal si cancela dentro del margen (D-71)');

reset role;


-- 5) Con el margen en CERO la regla se apaga, y R1 vuelve a ser cancelable.
-- Es lo que compra el `check (... between 0 and 1440)`: desactivar la regla sin
-- otra migracion. R1 empieza en 30 min, o sea todavia NO ha empezado, asi que
-- D-38 tampoco la bloquea.
update public.app_settings set min_cancel_minutes = 0 where id;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000001', 'con el margen apagado si')$$,
  'con min_cancel_minutes en 0 la regla se apaga y la reserva se cancela');

reset role;


select * from finish();

rollback;
