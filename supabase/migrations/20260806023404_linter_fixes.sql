-- Los dos avisos del linter que quedaban (tarea 1.9).
--
-- 1. product_availability sin security_invoker se evalua con los privilegios de
--    su DUENO, no con los de quien consulta. Es el 🔴 ERROR del linter, y no es
--    teorico: la tanda 1 decidio que el inventario fisico no es publico -un
--    anonimo no tiene por que saber cuantas camaras hay- y esta vista se lo
--    contaba igual, porque leia inventory_units saltandose el RLS. Medido antes
--    de arreglarlo: como anon, `select count(*) from product_availability`
--    devolvia filas sin error.
--
--    Con security_invoker = on, un anonimo deja de ver inventory_units y la vista
--    le devolveria una fila por producto con active_units = 0 e in_stock = false.
--    Decir "sin stock" de todo es peor que no decir nada, asi que se le revoca el
--    SELECT sobre la vista: la disponibilidad se ve con sesion. (D-18)
--
-- 2. fn_update_updated_at sin search_path fijo es el 🟡 WARN. La funcion viene de
--    la linea base y la usan cinco triggers; se recrea con el mismo cuerpo y la
--    misma firma, asi que los triggers no se tocan. now() sigue resolviendo con
--    search_path vacio porque vive en pg_catalog, que es implicito siempre.
--
-- El 🔵 INFO -reservation_status_log con RLS y cero politicas- ya lo cerro la
-- tanda 1 con log_select_own. El diseno pedia tres arreglos y solo quedaban dos.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 7.

alter view public.product_availability set (security_invoker = on);

revoke select on public.product_availability from anon;


create or replace function public.fn_update_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    new.updated_at = now();
    return new;
  end $$;
