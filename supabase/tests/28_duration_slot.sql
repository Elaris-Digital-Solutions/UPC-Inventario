-- D-19: la duracion tiene que ser multiplo de slot_minutes (cierra Q-11).
--
-- La asercion que de verdad importa es la tercera. Cuando dos reglas rechazan la
-- misma entrada hay que contestar la mas fundamental, y 20 minutos viola las dos:
-- es menor que el minimo Y no es multiplo. Si el mensaje habla del multiplo, la
-- validacion quedo en el orden equivocado.
--
-- Es la leccion de la tanda 2 de la Fase 1, donde pedir una hora de ayer se
-- contestaba por la rejilla horaria en vez de por lo evidente. Por eso estas
-- pruebas afirman el MENSAJE y no el SQLSTATE: con throws_ok sobre el codigo,
-- las tres pasarian en verde con el mensaje equivocado.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

delete from public.disabled_days;


select is(
  (select min_duration_minutes::int from public.app_settings),
  30,
  'la duracion minima es un bloque entero');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- La camara admite hasta 4 h, asi que 45 min entra en rango y solo falla por el
-- multiplo. Sin ese cuidado, la prueba pasaria por el motivo equivocado.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      45, 'cuarenta y cinco')$$,
  '%multiplo de 30%',
  '45 minutos se rechaza por no ser multiplo del bloque');

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '15:00') at time zone 'America/Lima',
      30, 'media hora')$$,
  'un bloque exacto se acepta');

-- 20 minutos viola las dos reglas. Tiene que contestar el rango, no el multiplo.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '18:00') at time zone 'America/Lima',
      20, 'veinte')$$,
  '%rango permitido%',
  'por debajo del minimo contesta el rango, no el multiplo');

reset role;


select * from finish();

rollback;
