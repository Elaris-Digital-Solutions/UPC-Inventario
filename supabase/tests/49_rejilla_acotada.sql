-- H-10: available_slots solo arma la rejilla para una duracion que
-- create_reservation aceptaria.
--
-- Cada valor rechazado viola UNA sola regla, para que cada asercion pruebe una:
-- 0 solo el minimo, 270 solo el maximo del producto, 45 solo el multiplo del
-- bloque. Las tres ofrecian franjas antes de la migracion 41 (29, 20 y 27,
-- medido el 2026-09-18).
--
-- 30 y 240 son el CONTROL NEGATIVO: sin ellas, un cero no distingue "filtra lo
-- invalido" de "no ofrece nada".
--
-- Camara: max 4 h, minimo 30, bloques de 30, horario 08:00-22:00.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

delete from public.disabled_days;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;


-- 1) y 2) Las dos puntas validas se siguen ofreciendo.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 30)),
  28,
  'la duracion minima (30) ofrece sus 28 franjas');

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 240)),
  21,
  'la duracion maxima del producto (240) ofrece sus 21 franjas');

-- 3) a 5) Lo que create_reservation rechaza, la rejilla no lo ofrece.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 0)),
  0,
  'por debajo del minimo no ofrece nada');

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 270)),
  0,
  'por encima del maximo del producto no ofrece nada');

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 45)),
  0,
  'una duracion que no es multiplo del bloque no ofrece nada');

-- 6) EL ATAQUE: con -2147483648 la rejilla tenia 71 582 788 filas y la llamada
--    agotaba los 8 s del statement_timeout de authenticated. Va la ultima porque
--    antes de la correccion no falla: la cortan, y el corte aborta la transaccion.
set local statement_timeout = '2s';

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 30), -2147483648)),
  0,
  'la duracion negativa extrema contesta vacio y al instante');

reset role;


select * from finish();

rollback;
