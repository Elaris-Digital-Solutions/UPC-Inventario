-- Q-24: el numero de orden de compra sale de la descripcion publica, y NO se
-- pierde: se muda a una tabla que solo lee el personal.
--
-- QUE HAY HOY, medido en produccion el 2026-08-22 sobre los 34 productos:
--   "O.C 115963 - SPACE GREY"
--    \_compras_/   \_ lo que describe al equipo _/
--
-- OJO: SON 13, NO 16. Q-24 decia "16 productos lo llevan" y esa cifra se
-- escribio el 2026-08-18, antes del desempaquetado, y nunca se volvio a contar.
-- Contado el 2026-08-22 con cuatro definiciones -prefijo exacto, "O.C" en
-- cualquier posicion, insensible a mayusculas seguido de digito, y "OC" sin
-- punto-: las tres primeras dan 13 y la cuarta da 0, que es el control negativo
-- que hace valer a las otras tres.
--
-- POR QUE SE MUDA Y NO SE BORRA: decidido por Alejandro el 2026-08-22 -"quitalo
-- de la descripcion, no de la base de datos"-. El numero es la trazabilidad de
-- la compra y este sistema no tiene otro sitio donde vivir. Se MUDA, igual que
-- D-82 mudo las observaciones de estado en vez de descartarlas.
--
-- OJO: POR QUE UNA TABLA Y NO UNA COLUMNA EN products. RLS FILTRA FILAS, NO
-- COLUMNAS. Una columna products.purchase_order la leeria cualquier alumno
-- pidiendo select=* a PostgREST, y NINGUNA politica de products puede impedirlo:
-- las politicas deciden que filas se ven, no que campos. La unica forma de que
-- un dato de producto sea privado del personal es que viva en otra tabla con su
-- propia politica. Es exactamente la forma de D-69 con inventory_unit_notes.
--
-- EL ORDEN IMPORTA: primero se copia y despues se limpia la descripcion. Al
-- reves se pierde el dato. Van en la misma funcion para que sea una sola
-- transaccion: en dos sentencias sueltas, un fallo entre medias lo perderia.
--
-- OJO: NINGUNA DESCRIPCION QUEDA VACIA, comprobado ANTES de escribir esto. Se
-- simulo el regexp_replace sobre las 13 filas reales y la mas corta deja 10
-- caracteres ("SPACE GREY"), asi que esto no puede crear un tercer producto sin
-- texto. Se mide el DESTINO y no solo el origen: es la leccion de la migracion
-- 28, que conto 34 descripciones con cuidado y no miro lo que la tabla de
-- destino ya tenia. Aqui el destino es una tabla NUEVA -0 filas, sin duplicados
-- posibles-, y el on conflict lo deja garantizado ademas de dicho.


-- 1 ------------------------------------------------------- donde vive el dato

create table public.product_purchase_orders (
  product_id     uuid primary key references public.products(id) on delete cascade,
  purchase_order text not null check (btrim(purchase_order) <> ''),
  created_at     timestamptz not null default now()
);

comment on table public.product_purchase_orders is
  'Numero de orden de compra de cada producto. Dato interno de compras: lo lee el personal y nunca el alumno. Vive aparte de products porque RLS filtra filas y no columnas.';

alter table public.product_purchase_orders enable row level security;

-- SOLO EL PERSONAL LEE. Mismo criterio y misma forma que unit_notes_select_staff
-- (migracion 25, D-69): un dato interno no se le sirve al alumno ni aunque no
-- lo identifique.
create policy purchase_orders_select_staff on public.product_purchase_orders
  for select to authenticated
  using ((select private.is_staff()));

-- OJO: NINGUNA POLITICA DE ESCRITURA, y es a proposito. Hoy no hay pantalla que
-- escriba aqui y la unica fuente es esta migracion. Sin politica, RLS deniega
-- toda escritura por API aunque el grant exista. Cuando haga falta editarlo se
-- anade la politica junto con la pantalla, no antes.
grant select on public.product_purchase_orders to authenticated;


-- 2 ------------------------------------------------------------ la mudanza
--
-- POR QUE UNA FUNCION Y NO DOS SENTENCIAS SUELTAS: una migracion corre UNA VEZ
-- y ANTES que el seed, asi que ninguna prueba puede ejercitarla. Y el seed.sql
-- no tiene ni una descripcion con este prefijo -0 de sus 4 productos-, asi que
-- un UPDATE aqui no tocaria ni una fila en local y su prueba pasaria VACIA.
-- Misma forma y mismo motivo que 20260818154552 y 20260819001118.
--
-- NO ES SECURITY DEFINER: solo la llaman la migracion y la prueba, las dos como
-- postgres.

create or replace function private.mover_orden_de_compra() returns integer
  language plpgsql set search_path = '' as $$
  declare
    v_movidas integer;
  begin
    insert into public.product_purchase_orders (product_id, purchase_order)
    select id, (regexp_match(description, '^O\.C\s+(\d+)'))[1]
      from public.products
     where description ~ '^O\.C'
    on conflict (product_id) do nothing;

    get diagnostics v_movidas = row_count;

    update public.products
       set description = regexp_replace(description, '^O\.C\s+\d+\s*[-/]?\s*', '')
     where description ~ '^O\.C';

    return v_movidas;
  end $$;

comment on function private.mover_orden_de_compra() is
  'Copia el numero de "O.C <numero>" a product_purchase_orders y lo quita de products.description, en ese orden y en una sola transaccion. Devuelve cuantas filas movio. Se queda para que la prueba pgTAP pueda ejercitar el mismo codigo que corrio la migracion: el seed no tiene ninguna descripcion con esa forma.';

-- POSTGRES CONCEDE EXECUTE A PUBLIC EN TODA FUNCION NUEVA, asi que "no
-- conceder" NO es lo mismo que "nadie puede". Misma linea que las 28 y 30.
revoke all on function private.mover_orden_de_compra() from public;

-- La unica llamada. En produccion mueve 13 filas; en local, 0, porque el seed
-- no siembra ninguna descripcion con el prefijo -y eso NO deja la migracion sin
-- verificar: lo que la verifica es la prueba 45, que llama a la funcion sobre
-- filas con las tres formas y ademas comprueba quien puede leer el resultado.
select private.mover_orden_de_compra();
