-- Q-23: los dos productos que quedaron sin descripcion reciben una.
--
-- DE DONDE VIENEN ESOS DOS. El desempaquetado de D-82 -migracion 28- partio
-- products.description en tres destinos. Dos de los 34 productos tenian la
-- tercera forma, "Lab: <salon> | Obs: <estado>": SIN especificacion. Su unico
-- texto era una observacion de estado, que D-69 declaro privada del personal,
-- asi que se mudo a inventory_unit_notes y la descripcion publica quedo vacia.
-- Fue lo correcto -era eso o seguir publicando el estado del equipo- y dejo un
-- hueco que solo se puede llenar con texto nuevo.
--
-- POR QUE HASTA HOY NO SE LLENO: Q-23 decia, y con razon, que ese texto "no
-- existe en ninguna parte y no me lo puedo inventar". Lo que cambia hoy no es
-- el dato sino el permiso: Alejandro lo pidio y aprobo los dos textos el
-- 2026-08-22.
--
-- OJO: DE DONDE SALE CADA PALABRA, porque no es lo mismo en los dos.
--   UGREEN .... "ADAPTADOR USB-C 7 EN 1 CON SALIDA DE VIDEO 4K" sale ENTERO del
--               nombre del producto: no anade ni un dato.
--   JBL ....... "PARLANTE BLUETOOTH PORTATIL". Solo "PARLANTE" viene del
--               nombre; "BLUETOOTH PORTATIL" es lo que caracteriza a la linea
--               JBL Flip y lo aporta quien escribe esto, no el dato. Aprobado
--               explicitamente. Se deja dicho para que quien lea esta fila
--               dentro de un ano sepa cual de las dos es descripcion heredada y
--               cual es texto redactado.
--
-- SIN TILDES, como el resto de descripciones que vienen del Excel original
-- ("CAMARA POSTERIOR", "COLOR NEGOR"). No es descuido: es no mezclar dos
-- convenciones en la misma columna.
--
-- LA GUARDA ES LA CONDICION, NO EL id. El `and coalesce(description,'') = ''`
-- hace dos cosas: la migracion es idempotente -correrla dos veces no reescribe
-- nada- y, sobre todo, NO PISA un texto que alguien haya puesto entretanto
-- desde /admin/inventario. Un update por id a secas si lo pisaria, y en
-- silencio.
--
-- POR QUE UNA FUNCION: los dos ids son de PRODUCCION y en local no existen, asi
-- que aqui esto no toca ni una fila y un update suelto tendria su prueba VACIA.
-- La funcion si se puede ejercitar. Misma forma que las migraciones 28, 30 y 37.
--
-- NO ES SECURITY DEFINER: solo la llaman la migracion y la prueba, como postgres.

create or replace function private.sembrar_descripciones_faltantes() returns integer
  language plpgsql set search_path = '' as $$
  declare
    v_puestas integer;
  begin
    update public.products
       set description = case id
             when 'b93f7503-decb-4ae2-8087-b48b6f648c1a'::uuid
               then 'ADAPTADOR USB-C 7 EN 1 CON SALIDA DE VIDEO 4K'
             when 'b8d64304-177a-4a2a-99d9-08deb7463fcc'::uuid
               then 'PARLANTE BLUETOOTH PORTATIL'
           end
     where id in ('b93f7503-decb-4ae2-8087-b48b6f648c1a'::uuid,
                  'b8d64304-177a-4a2a-99d9-08deb7463fcc'::uuid)
       and coalesce(description, '') = '';

    get diagnostics v_puestas = row_count;
    return v_puestas;
  end $$;

comment on function private.sembrar_descripciones_faltantes() is
  'Pone descripcion a los dos productos que quedaron sin ella tras el desempaquetado de D-82, y solo si siguen vacias. Devuelve cuantas puso. Se queda para que la prueba pgTAP pueda ejercitar el mismo codigo que corrio la migracion: en local esos dos ids no existen.';

-- POSTGRES CONCEDE EXECUTE A PUBLIC EN TODA FUNCION NUEVA, asi que "no
-- conceder" NO es lo mismo que "nadie puede". Misma linea que las 28, 30 y 37.
revoke all on function private.sembrar_descripciones_faltantes() from public;

-- La unica llamada. En produccion pone 2; en local, 0, porque esos dos ids no
-- existen -y eso NO deja la migracion sin verificar: lo que la verifica es la
-- prueba 46, que llama a la funcion sobre filas con esos mismos ids.
select private.sembrar_descripciones_faltantes();
