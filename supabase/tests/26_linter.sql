-- Los dos avisos del linter que quedaban de la linea base.
--
-- El 🔴 ERROR: product_availability sin security_invoker se evalua con los
-- privilegios de su dueno, asi que se salta el RLS de quien consulta. El 🟡 WARN:
-- fn_update_updated_at sin search_path fijo.
--
-- El 🔵 INFO -reservation_status_log con RLS y cero politicas- ya lo cerro la
-- tanda 1 con log_select_own.
--
-- D-18: sin sesion, sin stock. Al respetar el RLS, un anonimo dejaria de ver
-- inventory_units y la vista le devolveria ceros; decir "sin stock" de todo es
-- peor que no decir nada, asi que se le revoca el SELECT sobre la vista.
--
-- Los nulos van tipados: is() e isnt() son polimorficas y con un NULL sin tipo
-- Postgres no resuelve la firma.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);


select ok(
  (select 'security_invoker=on' = any(c.reloptions)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_availability'),
  'la vista respeta el RLS de quien consulta');

select isnt(
  (select p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_update_updated_at'),
  null::text[],
  'fn_update_updated_at tiene search_path fijo');


-- La vista deja de estar al alcance del anonimo (D-18).
set local role anon;

select throws_ok(
  $$select count(*) from public.product_availability$$,
  '42501', null,
  'un anonimo no consulta la disponibilidad');

reset role;


-- Con sesion, sigue diciendo la verdad. La camara tiene 3 unidades activas en
-- Monterrico; el microfono tiene 1 activa y 1 en mantenimiento en San Miguel.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select active_units::int from public.product_availability
    where product_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and campus_id  = 'cccccccc-0000-0000-0000-000000000001'),
  3,
  'con sesion, la vista cuenta las unidades activas');

select is(
  (select active_units::int from public.product_availability
    where product_id = 'bbbbbbbb-0000-0000-0000-000000000004'
      and campus_id  = 'cccccccc-0000-0000-0000-000000000002'),
  1,
  'la unidad en mantenimiento no cuenta como disponible');

reset role;


select * from finish();

rollback;
