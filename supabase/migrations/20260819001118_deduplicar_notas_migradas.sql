-- Limpia los duplicados que dejo la migracion 28 en inventory_unit_notes.
--
-- QUE PASO, medido en produccion el 2026-08-19 DESPUES de aplicar la 28:
--   109 notas totales
--    50 insertadas por la migracion 28, una por unidad, en 50 unidades
--    59 preexistentes -58 sin autor, del 2026-02-24, y 1 escrita por un
--       operador desde el mostrador-
--    41 de las 50 nuevas son COPIA EXACTA de una que ya existia
--
-- LA MIGRACION 28 NO SE EQUIVOCO AL INSERTAR: metio exactamente una nota por
-- unidad, que es lo que D-82 pedia. Lo que fallo fue la MEDICION PREVIA. El
-- diseno midio el catalogo -34 descripciones, tres formas, 92 unidades- y NO
-- miro la tabla de DESTINO, que ya llevaba esas mismas observaciones desde
-- febrero. Se conto de donde salia el dato y no si ya habia llegado.
--
-- POR QUE IMPORTA Y POR QUE NO ES GRAVE: no es una fuga. El alumno no lee esta
-- tabla desde la migracion 25 -D-69, cierra Q-18-. El dano es que el personal
-- ve la misma observacion dos veces en el historial de 41 unidades, o sea
-- ruido en la pantalla donde se relata el estado de un equipo.
--
-- EL CRITERIO ES "DUPLICADO EXACTO SIN AUTOR: SE QUEDA EL MAS ANTIGUO", y no
-- "borrar lo insertado el 2026-08-19". Dos motivos:
--   1. No clava una fecha, asi que la funcion sirve si el caso se repite.
--   2. Conserva la nota que lleva mas tiempo, que es la que puede estar
--      referenciada por lo que alguien ya leyo.
-- Medido contra produccion antes de escribir esto: borra 41, conserva 67 sin
-- autor -las 58 de febrero mas las 9 nuevas que SI aportan texto-, y deja
-- intacta la unica con autor. Y el control que hace valida la eleccion:
-- de las 41 que borra, NINGUNA es de febrero.
--
-- NUNCA TOCA UNA NOTA CON AUTOR. `created_by is null` esta en la particion y
-- en el filtro: una nota escrita por una persona desde el mostrador no entra
-- en este barrido ni aunque repita el texto de otra, porque ahi la repeticion
-- es informacion -alguien la escribio a proposito- y no un artefacto.
--
-- POR QUE UNA FUNCION Y NO UN DELETE SUELTO: el mismo motivo que en la 28. Una
-- migracion corre UNA VEZ y ANTES que el seed, asi que ninguna prueba puede
-- ejercitarla, y el seed local no tiene ni un duplicado. La funcion se queda
-- para que 38_deduplicar_notas.sql pueda llamarla sobre un fixture con el caso
-- real. Se prueba el codigo que corrio, no una copia suya pegada en el test.
--
-- ES IDEMPOTENTE: tras la primera pasada no queda ningun grupo con mas de una
-- fila, asi que una segunda llamada borra cero. La prueba lo comprueba.
--
-- NO ES SECURITY DEFINER, igual que private.desempaquetar_descripciones(): solo
-- la llaman la migracion y la prueba, las dos como postgres.

create or replace function private.deduplicar_notas_migradas() returns integer
  language plpgsql set search_path = '' as $$
  declare
    v_borradas integer;
  begin
    with ordenadas as (
      select id,
             row_number() over (
               partition by unit_id, note
               order by created_at, id
             ) as puesto
        from public.inventory_unit_notes
       where created_by is null
    )
    delete from public.inventory_unit_notes n
     using ordenadas o
     where n.id = o.id
       and o.puesto > 1;

    get diagnostics v_borradas = row_count;
    return v_borradas;
  end $$;

comment on function private.deduplicar_notas_migradas() is
  'Borra los duplicados exactos sin autor que dejo la migracion 28, conservando el mas antiguo de cada grupo. Devuelve cuantas filas borro. Se queda para que la prueba pgTAP pueda ejercitar el mismo codigo que corrio la migracion: el seed no tiene duplicados.';

-- POSTGRES CONCEDE EXECUTE A PUBLIC EN TODA FUNCION NUEVA, asi que "no
-- conceder" NO es lo mismo que "nadie puede". Misma linea que la migracion 28.
revoke all on function private.deduplicar_notas_migradas() from public;

-- La unica llamada. En produccion borra 41 filas; en local, 0, porque el seed
-- no siembra duplicados -y eso NO deja la migracion sin verificar: lo que la
-- verifica es la prueba 38, que llama a la funcion sobre filas con el caso.
select private.deduplicar_notas_migradas();
