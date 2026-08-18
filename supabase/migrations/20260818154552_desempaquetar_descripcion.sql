-- D-82: products.description se desempaqueta en tres destinos.
--
-- QUE HAY HOY, medido en produccion el 2026-08-18 sobre los 34 productos:
--   "Lab: MO-UH40 | O.C 115962 CAMARA POSTERIOR... | Obs: falta bateria"
--    \___ salon __/ \______ especificacion _______/ \____ estado ______/
--
-- 34 de 34 empiezan por "Lab: ". Y hay TRES formas, no dos:
--   16 son  Lab | especificacion | Obs
--   16 son  Lab | algo                  (sin observacion)
--    2 son  Lab | Obs                   (SIN especificacion)
--
-- POR QUE ES DE SEGURIDAD Y NO DE ORDEN: "Obs: falta bateria" es informacion de
-- estado del equipo, y la migracion 25 -D-69, cierra Q-18- declaro esa clase de
-- informacion privada del personal. Se estaba publicando igual, dentro de la
-- descripcion que ve cualquier alumno, junto al numero de orden de compra. El
-- pendiente se cerro en la tabla donde se busco y quedo abierto en la columna
-- donde nadie miro.
--
-- LA CONDICION ES EL PREFIJO, NO LA POSICION. Un split_part(..., ' | ', 2)
-- aplicado a ciegas le deja a los dos productos de la tercera forma la
-- observacion COMO DESCRIPCION PUBLICA. Se muda lo que empiece por 'Obs: ',
-- este en la parte 2 o en la 3.
--
-- POR QUE UNA FUNCION Y NO UN UPDATE SUELTO: una migracion corre UNA VEZ y
-- ANTES que el seed, asi que ninguna prueba puede ejercitarla. Y el seed.sql no
-- tiene ni una descripcion con esta forma, asi que un UPDATE aqui no tocaria ni
-- una fila en local y su prueba pasaria VACIA. La funcion se queda para que
-- 36_desempaquetar_descripcion.sql pueda llamarla sobre filas de verdad.
--
-- LA NOTA VA A CADA UNIDAD del producto, no una sola vez:
-- inventory_unit_notes cuelga de unit_id y la observacion venia del producto,
-- asi que describe al lote. created_by queda NULL -su default es auth.uid(),
-- que en una migracion no es nadie- y eso es honesto: no lo escribio ninguna
-- persona, salio de una hoja de calculo.
--
-- ES IDEMPOTENTE: el "where description like 'Lab: %'" hace que una segunda
-- llamada no encuentre nada que hacer.
--
-- NO ES SECURITY DEFINER a proposito: solo la llaman la migracion y la prueba,
-- las dos como postgres. Sin definer, si alguien lograra ejecutarla correria
-- con SUS privilegios y RLS lo pararia.

create or replace function private.desempaquetar_descripciones() returns void
  language plpgsql set search_path = '' as $$
  declare
    v_partes text[];
    v_obs    text;
    v_spec   text;
    r        record;
  begin
    for r in
      select id, description
        from public.products
       where description like 'Lab: %'
    loop
      v_partes := string_to_array(r.description, ' | ');

      -- La observacion es la parte que empieza por 'Obs: ', venga en la
      -- posicion que venga. 'Obs: ' son cinco caracteres, de ahi el "from 6".
      v_obs := null;
      if array_length(v_partes, 1) >= 3 and v_partes[3] like 'Obs: %' then
        v_obs  := substring(v_partes[3] from 6);
        v_spec := v_partes[2];
      elsif array_length(v_partes, 1) >= 2 and v_partes[2] like 'Obs: %' then
        v_obs  := substring(v_partes[2] from 6);
        v_spec := '';
      elsif array_length(v_partes, 1) >= 2 then
        v_spec := v_partes[2];
      else
        v_spec := '';
      end if;

      -- PRIMERO la nota y DESPUES el recorte. Al reves se pierde el texto, y
      -- las dos van en la misma transaccion: o pasan las dos o no pasa ninguna.
      if v_obs is not null and btrim(v_obs) <> '' then
        insert into public.inventory_unit_notes (unit_id, note)
        select u.id, btrim(v_obs)
          from public.inventory_units u
         where u.product_id = r.id;
      end if;

      update public.products
         set description = btrim(v_spec)
       where id = r.id;
    end loop;
  end $$;

comment on function private.desempaquetar_descripciones() is
  'D-82. Separa salon, especificacion y observacion de products.description. Se queda para que la prueba pgTAP pueda ejercitar el mismo codigo que corrio la migracion: el seed no tiene filas con esa forma.';

-- POSTGRES CONCEDE EXECUTE A PUBLIC EN TODA FUNCION NUEVA, asi que "no
-- conceder" NO es lo mismo que "nadie puede". Es la misma clase de agujero que
-- cerraron 20260805193059_revoke_blanket_grants.sql y
-- 20260806035041_revoke_trigger_functions.sql, y se cierra igual: revocando.
revoke all on function private.desempaquetar_descripciones() from public;

-- La unica llamada. A partir de aqui la columna solo guarda la especificacion.
select private.desempaquetar_descripciones();
