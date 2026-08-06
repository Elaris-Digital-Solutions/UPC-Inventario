-- La RPC de reserva (P1-9): las reglas viven en el motor, no en el navegador.
--
-- Dos decisiones de esta bateria:
--
-- 1. Las horas se calculan relativas a la corrida, no literales. Una fecha fija
--    caeria fuera de la ventana movil de 7 dias en cuanto pasara una semana.
--    "Manana a las 10:00 en Lima" siempre esta dentro de la ventana y dentro del
--    horario 08:00-22:00.
--
-- 2. Se comprueba el mensaje y no el SQLSTATE. Los rechazos de negocio de la RPC
--    mezclan P0001 y 23514 segun la regla, asi que el codigo no distingue una de
--    otra; el mensaje si.
--
--    Y se usa throws_ilike, no throws_like: LIKE distingue mayusculas y los
--    mensajes empiezan con una. Con throws_like, "%completa tu perfil%" no casa
--    con "Completa tu perfil antes de reservar" y la prueba falla por la
--    capitalizacion, que es lo unico que no interesa comprobar.
--
-- El unico dia inhabilitado del seed es el 2026-12-25. Si la bateria corriera un
-- 24 de diciembre, "manana" caeria en feriado y la mitad de las pruebas fallarian
-- por el motivo equivocado. Se vacia la tabla dentro de la transaccion, que se
-- revierte igual.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(14);

delete from public.disabled_days;


-- 1 · Camino feliz. Producto 1 (camara, max 4 h) en Monterrico.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      120, 'Practica de fotografia')$$,
  'el alumno A reserva la camara para manana a las 10:00');

reset role;

select is(
  (select count(*)::int from public.inventory_reservations r
     join public.inventory_units u on u.id = r.unit_id
    where r.alumno_id = (select id from public.alumnos
                          where auth_user_id = 'a0000000-0000-0000-0000-000000000001')
      and r.status = 'reserved'
      and u.product_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and u.campus_id  = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'la reserva queda a su nombre, en reserved y con una unidad de la sede pedida');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 2 · Limite diario por producto (BR-09).
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '15:00') at time zone 'America/Lima',
      120, 'Otra vez')$$,
  '%ya tienes una reserva de este producto%',
  'no se puede reservar dos veces el mismo producto el mismo dia');


-- 3 · Rotacion justa (BR-12, M-8): dos reservas mas, en dias distintos para no
--     chocar con el limite diario. Hay 3 camaras en Monterrico y el orden es por
--     uso ascendente, asi que deben salir tres unidades distintas.
select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
  120, 'Dia 2');

select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 3) + time '10:00') at time zone 'America/Lima',
  120, 'Dia 3');

reset role;

select is(
  (select count(distinct r.unit_id)::int from public.inventory_reservations r
     join public.inventory_units u on u.id = r.unit_id
    where u.product_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  3,
  'tres reservas del mismo producto reparten las tres unidades');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 4 · Horario de atencion (C-7, M-7): 07:00 en Lima es antes de abrir.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '07:00') at time zone 'America/Lima',
      60, 'Muy temprano')$$,
  '%horario de atencion%',
  'fuera del horario de atencion se rechaza');

-- 5 · Alineacion con la grilla de bloques.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '10:07') at time zone 'America/Lima',
      60, 'A destiempo')$$,
  '%bloque%',
  'la hora de inicio tiene que caer en un bloque de slot_minutes');

-- 6 · Duracion contra el producto y no contra una constante (D-1). La camara
--     admite 4 h; se piden 5.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '10:00') at time zone 'America/Lima',
      300, 'Demasiado')$$,
  '%duracion%',
  'la duracion se valida contra max_duration_hours del producto');

-- 7 · En el pasado.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      now() - interval '1 day', 120, 'Ayer')$$,
  '%pasado%',
  'no se reserva hacia atras');

-- 8 · Ventana movil de 7 dias (D-3).
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 30) + time '10:00') at time zone 'America/Lima',
      120, 'Dentro de un mes')$$,
  '%ventana de reserva%',
  'fuera de la ventana movil se rechaza');

reset role;

-- 9 · Dia inhabilitado.
insert into public.disabled_days (date, reason)
values ((now() at time zone 'America/Lima')::date + 5, 'Feriado de prueba');

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 5) + time '10:00') at time zone 'America/Lima',
      120, 'Feriado')$$,
  '%no hay atencion%',
  'un dia inhabilitado se rechaza');

-- 10 · Sin unidades libres: el tripode tiene una sola unidad en Monterrico.
select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 6) + time '10:00') at time zone 'America/Lima',
  120, 'Tripode de A');

reset role;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000002',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 6) + time '12:00') at time zone 'America/Lima',
      60, 'Tripode de B')$$,
  '%no hay unidades disponibles%',
  'el buffer del producto deja sin unidades a la siguiente reserva');

reset role;

-- 11 · Perfil incompleto (D-9).
update public.alumnos set nombre = null
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
      60, 'Sin perfil')$$,
  '%completa tu perfil%',
  'sin perfil completo no se reserva');

reset role;

-- 12 · Sancion vigente (D-12). Se escribe como postgres porque banned_until no
--      tiene GRANT para nadie.
update public.alumnos
   set nombre = 'Bruno', banned_until = now() + interval '5 days'
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
      60, 'Sancionado')$$,
  '%sancion vigente%',
  'un alumno sancionado no reserva');

reset role;

-- 13 · La RPC no es publica.
set local role anon;

select throws_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      now() + interval '1 day', 120, 'Anonimo')$$,
  '42501', null,
  'anon no puede ejecutar la RPC');

reset role;


select * from finish();

rollback;
