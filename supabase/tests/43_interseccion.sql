-- D-74 / D-90: la interseccion, y el control negativo que la hace valida.
--
-- ESTA BATERIA CONVIERTE EN REGRESION LO QUE LA TAREA DE RIESGO MIDIO A MANO.
-- Las cifras de abajo -13 y 8- salieron del stack local el 2026-08-20 antes de
-- escribir la migracion, y se escriben aqui para que dejen de depender de que
-- alguien se acuerde de repetir la medicion.
--
-- LA ASERCION QUE DECIDE ES LA 2: la franja de las 11:00 con dos turnos
-- consecutivos. Es la que no cabe entera en NINGUN turno y si tiene a alguien en
-- el mostrador todo el rato -se retira con A y se devuelve con B-. Si algun dia
-- alguien cambia la comprobacion a "el tramo cabe en un turno", esa asercion se
-- pone roja y ninguna otra lo haria.
--
-- Y LA 4 ES SU CONTROL NEGATIVO. Sin ella, un 13 no distingue "filtra bien" de
-- "no filtra nada": las dos hipotesis predicen exactamente el mismo numero
-- cuando los turnos cubren el dia entero.
--
-- El escenario se monta borrando los turnos del seed para ese dia y poniendo
-- solo los dos que interesan. Se hace como postgres porque montar el escenario
-- no es lo que se prueba.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(10);

delete from public.disabled_days;


-- El dia de trabajo: manana, siempre dentro de la ventana movil.
create temporary table t on commit drop as
select ((now() at time zone 'America/Lima')::date + 1)                       as fecha,
       extract(dow from ((now() at time zone 'America/Lima')::date + 1))::smallint as dow;

-- Escenario 1: dos turnos CONSECUTIVOS, 08:00-12:00 y 12:00-16:00.
delete from public.staff_shifts
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t);

insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
select 'a0000000-0000-0000-0000-00000000000b',
       'cccccccc-0000-0000-0000-000000000001', (select dow from t), v.a, v.b
  from (values (time '08:00', time '12:00'), (time '12:00', time '16:00')) v(a, b);


-- 1) El recuento entero.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120)),
  13,
  'dos turnos consecutivos de 08:00 a 16:00 ofrecen 13 franjas de dos horas');

-- 2) LA QUE DECIDE: la franja que cruza de un turno al otro se ofrece (D-90).
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120) s
    where (s.slot_start at time zone 'America/Lima')::time = time '11:00'),
  1,
  'la franja 11:00-13:00 se ofrece aunque no quepa en ningun turno solo');

-- 3) El techo lo pone el turno, no el cierre de la sede: la sede cierra a las
--    22:00 y la ultima franja termina a las 16:00.
select is(
  (select max(slot_start) at time zone 'America/Lima' from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120))::time,
  time '14:00',
  'el turno recorta el cierre de la sede: la ultima empieza a las 14:00');


-- Escenario 2: el CONTROL NEGATIVO. Un hueco de una hora entre los dos turnos.
update public.staff_shifts set ends_at = '11:00'
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t)
   and starts_at = '08:00';

-- 4) De 13 a 8.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120)),
  8,
  'con un hueco de una hora entre turnos, la rejilla baja de 13 a 8 franjas');

-- 5) Y la que desaparece es exactamente la que cruza el hueco.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120) s
    where (s.slot_start at time zone 'America/Lima')::time = time '11:00'),
  0,
  'la franja 11:00-13:00 desaparece cuando el hueco la parte');

-- 6) El borde: 09:00-11:00 termina justo donde acaba el turno y SI se ofrece.
--    Es lo que fija que ends_at se compara con >= y no con >.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120) s
    where (s.slot_start at time zone 'America/Lima')::time = time '09:00'),
  1,
  'la franja que termina exactamente en el borde del turno si se ofrece');


-- La RPC tiene que contestar igual que la rejilla ---------------------------

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 7) Con el hueco puesto, las 11:00 se rechazan, y por el motivo del OPERADOR.
--    Se comprueba el mensaje y no el SQLSTATE, como el resto de la casa: los
--    rechazos de negocio mezclan P0001 y 23514 segun la regla.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '11:00') at time zone 'America/Lima',
      120, 'cruza el hueco')$$,
  '%no hay ningun operador%',
  'la RPC rechaza la franja que cruza el hueco, y lo dice por el operador');

reset role;

-- Se quita el hueco: los dos turnos vuelven a ser consecutivos.
update public.staff_shifts set ends_at = '12:00'
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t)
   and starts_at = '08:00';

set local role authenticated;

-- 8) EL CONTROL POSITIVO DE LA 7. Sin el, el rechazo de arriba no distingue
--    "la cobertura filtra" de "la RPC rechaza esa hora siempre".
select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '11:00') at time zone 'America/Lima',
      120, 'sin hueco si entra')$$,
  'sin hueco, la misma franja de las 11:00 se acepta');

reset role;


-- D-76: cerrado y sin operador son DOS causas y se contestan distinto --------

-- 9) Sin ningun turno ese dia: la rejilla queda vacia.
delete from public.staff_shifts
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t);

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     (select fecha from t), 120)),
  0,
  'una sede con horario y sin ningun turno no ofrece nada');

-- 10) Y sin fila de campus_hours el mensaje es OTRO. Es lo unico que permite al
--     admin saber si le falta cargar el horario o el turno, que son dos
--     pantallas distintas.
delete from public.campus_hours
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      120, 'sede cerrada')$$,
  '%la sede no abre%',
  'sin horario de sede el mensaje habla de la SEDE, no del operador');

reset role;


select * from finish();

rollback;
