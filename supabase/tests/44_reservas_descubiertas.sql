-- D-92, que cierra Q-21: el recuento de reservas que quedan DESCUBIERTAS al
-- borrar o acortar un turno.
--
-- ESTA BATERIA CONVIERTE EN REGRESION LA SONDA QUE LA TAREA 9 CORRIO A MANO. Sus
-- cinco cifras salieron del stack local el 2026-08-21 antes de escribir la
-- pantalla.
--
-- LA ASERCION QUE DECIDE ES LA 4: con un compañero que cubre el mismo tramo,
-- borrar un turno descubre CERO reservas. Es la unica que separa la cuenta
-- correcta de la ingenua -"las reservas que caian dentro de ese turno"-, que
-- daria 1. Las dos hipotesis coinciden en todas las demas, asi que si alguien
-- cambia la funcion por la version facil, solo esta se pone roja.
--
-- Y LA 5 ES SU CONTROL: el compañero existe pero solo cubre hasta las 11:00, asi
-- que la reserva de 10:00 a 12:00 vuelve a quedar descubierta. Sin ella, el cero
-- de la 4 no distingue "el compañero cubre" de "hay un compañero".
--
-- La 3 es el control POSITIVO de las dos primeras: "acortar" un turno al horario
-- que ya tenia no descubre nada. Sin ella, un 1 no distingue "cuenta bien" de
-- "cuenta siempre que se le pregunte".
--
-- El escenario se monta como postgres porque montarlo no es lo que se prueba.
-- La reserva se INSERTA directamente en vez de pasar por create_reservation: la
-- RPC exige sesion de alumno, limite diario y ventana movil, y ninguna de esas
-- tres es la propiedad que esta bateria mide.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

-- Manana a las 10:00-12:00 de Lima, en Monterrico, y el weekday que le toca.
create temporary table t on commit drop as
select ((now() at time zone 'America/Lima')::date + 1)                             as fecha,
       extract(dow from ((now() at time zone 'America/Lima')::date + 1))::smallint as dow,
       (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima'                                               as inicio,
       (((now() at time zone 'America/Lima')::date + 1) + time '12:00')
         at time zone 'America/Lima'                                               as fin;

-- Un solo turno para ese dia en Monterrico, 08:00-22:00, del operador del seed.
delete from public.staff_shifts
 where campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and weekday = (select dow from t);

insert into public.staff_shifts (id, staff_id, campus_id, weekday, starts_at, ends_at)
select '11111111-2222-3333-4444-555555555555',
       'a0000000-0000-0000-0000-00000000000b',
       'cccccccc-0000-0000-0000-000000000001',
       t.dow, '08:00', '22:00'
  from t;

-- La reserva viva que se va a quedar sin nadie.
insert into public.inventory_reservations (product_id, unit_id, alumno_id, start_at, end_at, status)
select u.product_id, u.id, a.id, t.inicio, t.fin, 'reserved'
  from public.inventory_units u
 cross join t
 cross join (select id from public.alumnos limit 1) a
 where u.campus_id = 'cccccccc-0000-0000-0000-000000000001'
   and u.status = 'active'
 limit 1;

select is(
  (select count(*)::int from public.inventory_reservations r cross join t
    where r.start_at = t.inicio and r.status = 'reserved'),
  1,
  'el fixture deja UNA reserva viva: sin ella los ceros de abajo no significarian nada'
);

-- 1 · Borrar el unico turno deja la reserva descubierta.
select is(
  public.reservas_descubiertas('11111111-2222-3333-4444-555555555555'),
  1,
  'borrar el unico turno que la cubria descubre la reserva'
);

-- 2 · Acortarlo a las 11:00 deja fuera la ultima hora del intervalo. Es el
--     [start_at, end_at) ENTERO y no solo el inicio: a las 10:00 sigue habiendo
--     alguien, y la DEVOLUCION de las 12:00 se queda sin nadie.
select is(
  public.reservas_descubiertas('11111111-2222-3333-4444-555555555555', '08:00', '11:00'),
  1,
  'acortar el turno a las 11:00 descubre la devolucion de una reserva que empieza a las 10:00'
);

-- 3 · Control positivo: "acortarlo" a lo que ya era no descubre nada.
select is(
  public.reservas_descubiertas('11111111-2222-3333-4444-555555555555', '08:00', '22:00'),
  0,
  'dejar el turno igual no descubre ninguna reserva'
);

-- 4 · LA QUE DECIDE: con un compañero que cubre el mismo tramo, borrar el turno
--     no descubre nada. La cuenta ingenua daria 1.
insert into public.staff_shifts (id, staff_id, campus_id, weekday, starts_at, ends_at)
select '66666666-7777-8888-9999-aaaaaaaaaaaa',
       'a0000000-0000-0000-0000-00000000000a',
       'cccccccc-0000-0000-0000-000000000001',
       t.dow, '08:00', '22:00'
  from t;

select is(
  public.reservas_descubiertas('11111111-2222-3333-4444-555555555555'),
  0,
  'con un compañero que cubre el mismo tramo, borrar el turno no descubre nada (D-90)'
);

-- 5 · Su control: el compañero solo llega a las 11:00, asi que vuelve a haber
--     una reserva descubierta. Distingue "hay compañero" de "el compañero cubre".
update public.staff_shifts
   set ends_at = '11:00'
 where id = '66666666-7777-8888-9999-aaaaaaaaaaaa';

select is(
  public.reservas_descubiertas('11111111-2222-3333-4444-555555555555'),
  1,
  'un compañero que solo cubre parte del tramo no salva la reserva'
);

select * from finish();

rollback;
