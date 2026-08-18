# Fase 3 · Tanda 1 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.

**Objetivo:** sacar el salón de devolución a la sede, **desempaquetar `products.description`** —que hoy
publica el estado de los equipos—, ampliar el FAQ y mover el formulario de datos a la primera reserva.

**Enfoque:** tres migraciones —la **27** añade el salón, la **28** desempaqueta, la **29** añade las dos
columnas del perfil— y el código de aplicación que cada una arrastra. La tarea de riesgo, el
desempaquetado, va la **segunda**: si falla, cambia la tanda entera.

**Stack:** Postgres 15 sobre Supabase · pgTAP · Next.js 16 (App Router) · TypeScript estricto · Vitest ·
Playwright.

**Diseño:** [`../FASE_3_DISENO.md`](../FASE_3_DISENO.md) — se lee junto con este plan, no en su lugar.
Decisiones que ejecuta: **D-77, D-78, D-79, D-82**.

---

## Correcciones al diseño

*(Las cinco primeras son de la propia escritura del plan, antes de ejecutar nada.)*

1. ⚠ **El `seed.sql` local no tiene NI UNA descripción con la forma de producción.** Siembra cuatro
   productos con descripciones normales —`'Camara full frame sin espejo, 24 MP'`—, ninguna con
   `Lab: … | … | Obs: …`. **La migración del desempaquetado no tocaría ni una fila en local**, y su prueba
   pasaría **vacía**: cero filas cambiadas es indistinguible de cero filas que cambiar. Es la trampa nº 1
   del proyecto otra vez, en su forma más pura. **Se resuelve con una función**, ver la corrección 2.
2. **El desempaquetado va en una función `private.desempaquetar_descripciones()`, no en un `UPDATE`
   suelto.** El diseño no lo decía porque no sabía lo de la corrección 1. Motivo: una migración corre
   **una vez y antes que el seed**, así que ninguna prueba puede ejercitarla; una función la prueba puede
   **volver a llamarla** sobre filas con la forma real, insertadas como fixture. **Se prueba el código que
   corrió, no una copia suya pegada en el test.** La función se queda en `private`, sin `grant` para
   nadie, y su comentario dice que existe por esto.
3. **Son TRES migraciones y no cuatro: el copiado y el recorte van juntos, en la 28.** El diseño los
   describía como dos pasos con una comprobación en medio. **Juntos es más seguro, no menos:** en una sola
   transacción, o se copian las observaciones **y** se recorta la columna, o no pasa ninguna de las dos.
   Separados hay un instante en que las notas están duplicadas —inofensivo— pero también uno en que un
   fallo deja el trabajo a medias. La comprobación «llegaron antes de recortar» **no desaparece: la hace
   la prueba pgTAP antes de que esto se acerque al remoto**, que es el modelo del proyecto entero.
4. **`campuses` NO necesita una línea de `grant`, y `alumnos` SÍ.** No es simetría: `campuses` tiene
   `grant insert, update, delete on public.campuses to authenticated` **a nivel de tabla**
   *(`20260805195304_catalog_policies.sql:29-32`)*, así que una columna nueva queda cubierta sola. `alumnos`
   tiene `grant update (nombre, apellido, carrera_id)` **con las columnas enumeradas**
   *(`20260805194848_alumno_policies.sql:27`)*, así que una columna nueva **no** queda cubierta. **Es la
   trampa exacta que la migración 26 documentó** y que ninguna herramienta local ve: `typecheck`, `lint` y
   `build` pasan, porque un privilegio no está en el tipo.
5. **Los tests pgTAP nuevos son archivos nuevos.** Van hoy de `00` a `34`, y el patrón es que cada
   migración traiga el suyo: la 23 trajo el `31`, la 24 el `32`, la 25 el `33`, la 26 el `34`. Los nuevos
   son **`35`**, **`36`** y **`37`**, y ninguno de los anteriores se toca.
6. **El salón NO puede salir por donde la ficha pinta las sedes.** La ficha usa
   `disponibilidadPorSede()`, que sale de la **vista** `product_availability` — y la vista no tiene la
   columna. **La primera versión de la Tarea 4 decía `campuses(name, salon_devolucion)` y era código que
   no existe.** Se usa `sedesActivas()`, que sí consulta `campuses`, y se casan las dos listas por `id`.
   Cuesta un `Map` y un `.map()` de traducción, porque `salon_devolucion` y `salonDevolucion` no se llaman
   igual.
7. **`reservar/page.tsx` no resuelve la sesión: la hereda del layout**, y **un layout no le pasa props a
   su página en el App Router**. La primera versión de la Tarea 6 usaba un `supabase` y un `sub` que no
   están en ese ámbito. La página los resuelve por su cuenta. **Esto contesta el punto a verificar V-2
   antes de ejecutar**, que es donde sale barato.

---

## Restricciones globales

*Valen para todas las tareas y no se repiten en cada una.*

- **PowerShell 5.1:** sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Un comando por bloque.
- **Migraciones solo por CLI versionada.** Se crean con `npx supabase migration new <nombre>`, nunca
  escribiendo el archivo a mano con una marca de tiempo inventada.
- **Ninguna migración toca el remoto sin haber pasado por el Docker local y por `npx supabase test db`.**
- **Docker Desktop tiene que estar arrancado**, y `db reset` exige el stack completo: falla si se arrancó
  con `-x`.
- **Mensajes de commit sin acentos.** Los documentos, con tildes.
- **Ningún control de autorización en el cliente.** Quien decide es RLS.
- **Comentarios de SQL sin acentos**, como los de las 26 migraciones que ya hay.
- **No se empuja al remoto.** El plan entrega los comandos; los ejecuta Alejandro.

---

## Mapa de archivos

**Se crean:**

| Archivo | De qué responde |
|---|---|
| `supabase/migrations/<ts>_salon_devolucion.sql` | `campuses.salon_devolucion` y sus dos valores |
| `supabase/migrations/<ts>_desempaquetar_descripcion.sql` | La función y su única llamada |
| `supabase/migrations/<ts>_perfil_profesor.sql` | Las dos columnas de `alumnos` y **su grant** |
| `supabase/tests/35_salon_devolucion.sql` | Que la columna existe y que las dos sedes la tienen |
| `supabase/tests/36_desempaquetar_descripcion.sql` | **Las tres formas**, sobre fixtures con la forma real |
| `supabase/tests/37_perfil_profesor.sql` | Las dos columnas **y el privilegio**, que es lo que se olvida |

**Se modifican:**

| Archivo | Qué cambia |
|---|---|
| `lib/catalogo/consultas.ts` | La ficha trae el salón de la sede |
| `app/(alumno)/catalogo/[id]/page.tsx` | Lo muestra |
| `app/(publico)/faq/page.tsx` | Tres preguntas nuevas *(D-78)* |
| `app/(alumno)/layout.tsx:37` | **Deja de** redirigir a `/completar-perfil` |
| `lib/auth/destino.ts:70` | Ídem: tras entrar se va al catálogo |
| `app/(alumno)/catalogo/[id]/reservar/page.tsx` | **Gana** la comprobación de perfil |
| `app/(perfil)/completar-perfil/page.tsx` | Los dos campos nuevos |
| `app/(perfil)/completar-perfil/actions.ts` | Los guarda |
| `lib/database.types.ts` | Regenerado |

---

## Tarea 0 · La rama y el punto de partida

- [ ] **Paso 1: abrir la rama desde `develop` actualizado**

```powershell
git checkout develop
```

```powershell
git pull
```

```powershell
git checkout -b feature/fase-3-tanda-1
```

- [ ] **Paso 2: levantar el stack local completo**

```powershell
npx supabase start
```

**Esperado:** las URL de API, DB y Studio. **Si falla:** Docker Desktop está apagado.

- [ ] **Paso 3: dejar la base en el estado de la rama, y contar de dónde se parte**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

**Esperado:** `26 migraciones aplicadas` y las pruebas en `PASS`. **Anotar el número de aserciones y de
archivos que imprime** — es el «antes» contra el que se mide el cierre. El valor esperado es **159
aserciones en 27 archivos**; si no coincide, **parar y averiguar por qué antes de seguir**.

---

## Tarea 1 · Migración 27: el salón es de la sede *(D-77)*

**Archivos:**
- Crear: `supabase/migrations/<ts>_salon_devolucion.sql`
- Crear: `supabase/tests/35_salon_devolucion.sql`

**Interfaces:**
- Produce: `public.campuses.salon_devolucion text` — lo consumen la Tarea 4 (la ficha) y la Tarea 5 (el FAQ).

- [ ] **Paso 1: escribir la prueba que falla**

Crear `supabase/tests/35_salon_devolucion.sql`:

```sql
-- D-77: el salon de devolucion es de la sede, no del producto.
--
-- POR QUE POR NOMBRE Y NO POR ID: el seed local y produccion comparten los
-- nombres 'Monterrico' y 'San Miguel' -comprobado el 2026-08-18- pero NO los
-- id, que en el seed son literales 'cccccccc-...'. Una prueba por id pasaria
-- en local y no diria nada del proyecto real.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

select has_column(
  'public', 'campuses', 'salon_devolucion',
  'campuses tiene la columna del salon de devolucion'
);

select is(
  (select salon_devolucion from public.campuses where name = 'San Miguel'),
  'SM-SB608',
  'San Miguel devuelve en SM-SB608'
);

select is(
  (select salon_devolucion from public.campuses where name = 'Monterrico'),
  'MO-UH40',
  'Monterrico devuelve en MO-UH40'
);

-- CONTROL NEGATIVO: sin el, una columna que devolviera el mismo texto para
-- cualquier fila pasaria las dos comprobaciones de arriba.
select isnt(
  (select salon_devolucion from public.campuses where name = 'San Miguel'),
  (select salon_devolucion from public.campuses where name = 'Monterrico'),
  'las dos sedes NO comparten salon'
);

select * from finish();

rollback;
```

- [ ] **Paso 2: verla fallar**

```powershell
npx supabase test db
```

**Esperado:** `35_salon_devolucion.sql` en rojo, con `column "salon_devolucion" does not exist`.
**Si pasa, la prueba está mal escrita** y hay que arreglarla antes de seguir.

- [ ] **Paso 3: crear la migración**

```powershell
npx supabase migration new salon_devolucion
```

- [ ] **Paso 4: escribir la migración**

En el archivo que acaba de crear la CLI:

```sql
-- D-77: el salon de devolucion es de la sede, no del producto.
--
-- MEDIDO EN PRODUCCION EL 2026-08-18, no supuesto: hay exactamente DOS salones
-- -SM-SB608 y MO-UH40- y NINGUN producto tiene unidades en las dos sedes, los
-- 34 tienen una sola. Ponerlo en el producto repetiria el mismo texto 34 veces
-- para dos valores distintos.
--
-- De donde sale el dato: estaba dentro de products.description, empaquetado
-- como "Lab: SM-SB608 | ...". La migracion siguiente lo saca de ahi.
--
-- SIN LINEA DE GRANT, Y NO ES UN OLVIDO: campuses tiene
-- "grant select ... to anon, authenticated" y "grant insert, update, delete ...
-- to authenticated" A NIVEL DE TABLA -20260805195304_catalog_policies.sql:21-32-,
-- asi que una columna nueva queda cubierta sola. Esto NO vale para alumnos ni
-- para app_settings, que enumeran columnas; ver la migracion de esta misma
-- tanda que toca alumnos.
--
-- NULLABLE a proposito: una sede nueva puede darse de alta antes de saber en
-- que salon se devuelve, y un NOT NULL con default '' mentiria diciendo que ya
-- se sabe y que es la cadena vacia.

alter table public.campuses
  add column salon_devolucion text;

comment on column public.campuses.salon_devolucion is
  'Salon donde se devuelven los equipos de esta sede. Se muestra en el FAQ y en la ficha del producto.';

-- POR NOMBRE Y NO POR ID: los id de campuses son distintos en el seed local y
-- en produccion; los nombres coinciden.
update public.campuses set salon_devolucion = 'SM-SB608' where name = 'San Miguel';
update public.campuses set salon_devolucion = 'MO-UH40'  where name = 'Monterrico';
```

- [ ] **Paso 5: verla pasar**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

**Esperado:** todo en `PASS`, con **4 aserciones más** que en la Tarea 0: **163 en 28 archivos**.

- [ ] **Paso 6: commit**

```powershell
git add supabase/migrations supabase/tests/35_salon_devolucion.sql
```

```powershell
git commit -m "feat(db): migracion 27, el salon de devolucion es de la sede" -m "D-77. Medido en produccion: dos salones y ningun producto en dos sedes. Sin linea de grant porque campuses los tiene a nivel de tabla, al reves que alumnos y app_settings."
```

---

## Tarea 2 · Migración 28: el desempaquetado *(D-82)* — **la tarea de riesgo**

**Archivos:**
- Crear: `supabase/migrations/<ts>_desempaquetar_descripcion.sql`
- Crear: `supabase/tests/36_desempaquetar_descripcion.sql`

**Interfaces:**
- Consume: nada de la Tarea 1. Son independientes.
- Produce: `private.desempaquetar_descripciones() returns void` — la llama la propia migración y **la
  vuelve a llamar la prueba**. Ningún rol tiene `execute`.

> **Va la segunda a propósito.** Es la única de la tanda que **mueve datos y borra texto**, y si su forma
> no es la que se midió, cambia el plan entero. Sale mucho más barato saberlo ahora que después de
> escribir el FAQ.

- [ ] **Paso 1: escribir la prueba que falla**

Crear `supabase/tests/36_desempaquetar_descripcion.sql`:

```sql
-- D-82: products.description empaqueta tres datos con tres publicos.
--
-- POR QUE HAY FIXTURES Y NO SE USA EL SEED: el seed.sql NO tiene ni una
-- descripcion con la forma de produccion -siembra 'Camara full frame sin
-- espejo, 24 MP'-. Sin estas filas la prueba pasaria VACIA, y cero filas
-- cambiadas es indistinguible de cero filas que cambiar.
--
-- POR QUE SE LLAMA A LA FUNCION Y NO SE COPIA SU SQL: una migracion corre una
-- vez y antes que el seed, asi que ninguna prueba puede ejercitarla. La funcion
-- si. Se prueba el codigo que corrio, no una copia suya.
--
-- LAS TRES FORMAS, medidas en produccion el 2026-08-18 sobre los 34 productos:
--   16 son  Lab | especificacion | Obs
--   16 son  Lab | algo                  (sin observacion)
--    2 son  Lab | Obs                   (SIN especificacion)
-- La tercera es la trampa: un split_part(description, ' | ', 2) a ciegas le
-- deja a esos dos "Obs: ..." COMO DESCRIPCION PUBLICA, que es justo lo que
-- D-82 existe para esconder.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);

-- Tres productos, uno por forma, con una unidad cada uno para que la nota
-- tenga donde caer.
insert into public.products (id, name, category, description, sort_order) values
  ('dddddddd-0000-0000-0000-000000000001', 'FIXTURE TRES PARTES', 'Cables',
   'Lab: MO-UH40 | O.C 999001 CABLE DE PRUEBA 2M | Obs: Correcto funcionamiento', 90),
  ('dddddddd-0000-0000-0000-000000000002', 'FIXTURE DOS PARTES', 'Tablets',
   'Lab: SM-SB608 | IPAD', 91),
  ('dddddddd-0000-0000-0000-000000000003', 'FIXTURE LAB Y OBS', 'Audio',
   'Lab: SM-SB608 | Obs: falta bateria', 92);

insert into public.inventory_units (id, product_id, campus_id, unit_code, status) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-001', 'active'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002',
   (select id from public.campuses where name = 'San Miguel'), 'FIX-002', 'active'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000003',
   (select id from public.campuses where name = 'San Miguel'), 'FIX-003', 'active');

select private.desempaquetar_descripciones();

-- Forma 1: se queda la especificacion, sin el salon y sin la observacion.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000001'),
  'O.C 999001 CABLE DE PRUEBA 2M',
  'tres partes: queda solo la especificacion'
);

-- Forma 2: se queda lo que habia en medio, aunque sea un tipo y no una
-- descripcion. La funcion no inventa texto.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000002'),
  'IPAD',
  'dos partes sin Obs: queda el trozo del medio tal cual'
);

-- Forma 3, LA QUE IMPORTA: la observacion se muda y la descripcion queda VACIA,
-- no con el texto de la observacion dentro.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000003'),
  '',
  'Lab + Obs: la descripcion queda vacia, NO con la observacion'
);

-- Y la contraria de la anterior, que es la que detecta el fallo de verdad.
select unlike(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000003'),
  '%bateria%',
  'la observacion NO se queda publicada como descripcion'
);

-- Las observaciones llegaron a su tabla, una por unidad del producto.
select is(
  (select note from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000003'),
  'falta bateria',
  'la observacion de la forma 3 esta en las notas de unidad'
);

select is(
  (select note from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'Correcto funcionamiento',
  'la observacion de la forma 1 esta en las notas de unidad'
);

-- CONTROL NEGATIVO: el producto sin observacion no genera nota. Sin esta
-- comprobacion, una funcion que escribiera una nota por unidad pasase lo que
-- pasase daria verde en las dos de arriba.
select is(
  (select count(*)::int from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  0,
  'el producto sin observacion NO genera nota'
);

select * from finish();

rollback;
```

- [ ] **Paso 2: verla fallar**

```powershell
npx supabase test db
```

**Esperado:** rojo con `function private.desempaquetar_descripciones() does not exist`.

- [ ] **Paso 3: crear la migración**

```powershell
npx supabase migration new desempaquetar_descripcion
```

- [ ] **Paso 4: escribir la migración**

```sql
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
-- informacion privada del personal el 2026-08-16. Se estaba publicando igual,
-- dentro de la descripcion que ve cualquier alumno, junto al numero de orden de
-- compra. El pendiente se cerro en la tabla donde se busco y quedo abierto en la
-- columna donde nadie miro.
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
-- SIN GRANT PARA NADIE: vive en private, que solo tiene usage para
-- authenticated, y no se le concede execute a ningun rol.
--
-- LA NOTA VA A CADA UNIDAD del producto, no una sola vez:
-- inventory_unit_notes cuelga de unit_id y la observacion venia del producto,
-- asi que describe al lote. created_by queda NULL -su default es auth.uid(),
-- que en una migracion no es nadie- y eso es honesto: no lo escribio ninguna
-- persona, salio de una hoja de calculo.
--
-- ES IDEMPOTENTE: el "where description like 'Lab: %'" hace que una segunda
-- llamada no encuentre nada que hacer.

create or replace function private.desempaquetar_descripciones() returns void
  language plpgsql security definer set search_path = '' as $$
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
      -- posicion que venga. Nunca hay mas de una: medido, el maximo de partes
      -- es 3 y la parte 1 siempre es el salon.
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

-- La unica llamada. A partir de aqui la columna solo guarda la especificacion.
select private.desempaquetar_descripciones();
```

- [ ] **Paso 5: verla pasar**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

**Esperado:** `PASS`, con **7 aserciones más**: **170 en 29 archivos**.

- [ ] **Paso 6: punto a verificar — que en local no rompió lo que ya había**

El seed tiene cuatro productos **sin** la forma `Lab: `. La función no debe tocarlos.

```powershell
npx supabase db reset
```

Luego, en el SQL Editor de Studio (`http://127.0.0.1:54323`):

```sql
select name, description from public.products order by sort_order;
```

**Desenlace A:** las cuatro descripciones del seed intactas → seguir.
**Desenlace B:** alguna cambió o quedó vacía → **el `where` de la función está mal**. Parar y arreglarlo
antes del commit; no es un detalle cosmético, es la diferencia entre filtrar y arrasar.

- [ ] **Paso 7: commit**

```powershell
git add supabase/migrations supabase/tests/36_desempaquetar_descripcion.sql
```

```powershell
git commit -m "feat(db): migracion 28, desempaquetar products.description" -m "D-82. El campo empaquetaba salon, especificacion y estado del equipo en 34 de 34 filas. El estado es lo que la migracion 25 hizo privado del personal y se seguia publicando." -m "Tres formas medidas, no dos: 2 productos son Lab + Obs sin especificacion, y a esos un split por posicion les dejaria la observacion como descripcion publica. La condicion es el prefijo." -m "Va en una funcion de private y no en un update suelto porque el seed no tiene ninguna fila con esa forma: un update aqui pasaria la prueba vacio."
```

---

## Tarea 3 · Migración 29: profesor y confirmación de facultad *(D-79)*

**Archivos:**
- Crear: `supabase/migrations/<ts>_perfil_profesor.sql`
- Crear: `supabase/tests/37_perfil_profesor.sql`

**Interfaces:**
- Produce: `public.alumnos.es_profesor boolean not null default false` y
  `public.alumnos.confirmo_facultad boolean not null default false`, **las dos con `UPDATE` para
  `authenticated`**. Las consume la Tarea 6.

- [ ] **Paso 1: escribir la prueba que falla**

Crear `supabase/tests/37_perfil_profesor.sql`:

```sql
-- D-79: el formulario de la primera reserva guarda dos datos mas.
--
-- LA TERCERA COMPROBACION ES LA QUE IMPORTA Y ES LA QUE SE OLVIDA: alumnos
-- tiene el grant de UPDATE con las columnas ENUMERADAS
-- -20260805194848_alumno_policies.sql:27-, asi que una columna nueva NO queda
-- cubierta sola. Sin la linea de grant, guardarPerfil() responde 42501 y
-- NINGUNA herramienta local lo ve: typecheck, lint y build pasan, porque un
-- privilegio no esta en el tipo. Es la leccion de la migracion 26, aplicada
-- antes de repetir el fallo y no despues.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

select has_column('public', 'alumnos', 'es_profesor',
  'alumnos tiene es_profesor');

select has_column('public', 'alumnos', 'confirmo_facultad',
  'alumnos tiene confirmo_facultad');

select col_default_is('public', 'alumnos', 'es_profesor', 'false',
  'es_profesor nace en false: nadie es profesor por omision');

-- EL PRIVILEGIO, contado y no supuesto. Cinco columnas exactas con UPDATE
-- para authenticated: las tres de siempre mas las dos nuevas.
select is(
  (select count(*)::int
     from information_schema.column_privileges
    where table_schema = 'public'
      and table_name   = 'alumnos'
      and grantee      = 'authenticated'
      and privilege_type = 'UPDATE'),
  5,
  'authenticated tiene UPDATE sobre exactamente cinco columnas de alumnos'
);

-- CONTROL POSITIVO del anterior: sin esto, un cero en la consulta de arriba
-- -por un nombre de tabla mal escrito, por ejemplo- no se distinguiria de una
-- sonda rota.
select is(
  (select count(*)::int
     from information_schema.column_privileges
    where table_schema = 'public'
      and table_name   = 'alumnos'
      and grantee      = 'authenticated'
      and privilege_type = 'UPDATE'
      and column_name  = 'confirmo_facultad'),
  1,
  'confirmo_facultad esta entre las columnas con UPDATE'
);

select * from finish();

rollback;
```

- [ ] **Paso 2: verla fallar**

```powershell
npx supabase test db
```

**Esperado:** rojo, con `column "es_profesor" does not exist`.

- [ ] **Paso 3: crear la migración**

```powershell
npx supabase migration new perfil_profesor
```

- [ ] **Paso 4: escribir la migración**

```sql
-- D-79: el formulario de datos salta en la PRIMERA RESERVA y guarda dos datos
-- mas.
--
-- POR QUE SE GUARDA LA CONFIRMACION DE FACULTAD Y NO ES SOLO UN TEXTO: D-78
-- decide que el sistema NO comprueba la carrera -la verificacion es presencial,
-- con el TIU, en el mostrador-. Por eso la casilla es la UNICA constancia de
-- que a esa persona se le dijo la regla y la acepto. Guardarla cuesta una
-- columna; no guardarla deja la palabra del mostrador contra la del alumno.
--
-- LA CARRERA DEL PROFESOR ES carrera_id, la que ya existe. El cliente la pidio
-- "tambien para el profesor", y es el mismo campo: un profesor de Software
-- elige Software en el mismo desplegable.
--
-- DEFAULT FALSE Y NOT NULL: las cinco filas que ya hay pasan a false sin
-- migrar datos, y false es la verdad -nadie ha confirmado nada todavia-.
-- Un nullable diria "no se sabe", que aqui no es un estado util: quien no ha
-- confirmado, no ha confirmado.

alter table public.alumnos
  add column es_profesor       boolean not null default false,
  add column confirmo_facultad boolean not null default false;

-- ESTA LINEA ES LA QUE SE OLVIDA, Y ES LA MISMA TRAMPA DE LA MIGRACION 26.
-- alumnos tiene el grant de UPDATE con las columnas ENUMERADAS
-- -20260805194848_alumno_policies.sql:27: grant update (nombre, apellido,
-- carrera_id)-, asi que una columna nueva NO queda cubierta sola.
--
-- Sin esta linea, guardarPerfil() -app/(perfil)/completar-perfil/actions.ts-
-- afecta CERO FILAS o responde 42501, y ni typecheck, ni lint, ni build lo ven:
-- un privilegio no esta en el tipo.
--
-- Se reescribe la lista ENTERA y no solo las dos nuevas, porque
-- "grant update (a, b)" no reemplaza al anterior, lo suma; escribirla entera
-- deja el archivo diciendo cual es el conjunto final.
grant update (nombre, apellido, carrera_id, es_profesor, confirmo_facultad)
  on public.alumnos to authenticated;

-- La politica alumnos_update_own NO se toca: no enumera columnas y su USING ya
-- limita cada fila a su dueno.
```

- [ ] **Paso 5: verla pasar**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

**Esperado:** `PASS`, con **5 aserciones más**: **175 en 30 archivos**.

- [ ] **Paso 6: regenerar los tipos**

```powershell
npx supabase gen types typescript --local > lib/database.types.ts
```

**Esperado:** `git diff lib/database.types.ts` muestra `salon_devolucion`, `es_profesor` y
`confirmo_facultad`, y **nada más**. Si aparece cualquier otra cosa, el archivo se generó contra una base
que no es la de esta rama.

- [ ] **Paso 7: commit**

```powershell
git add supabase/migrations supabase/tests/37_perfil_profesor.sql lib/database.types.ts
```

```powershell
git commit -m "feat(db): migracion 29, es_profesor y confirmo_facultad en alumnos" -m "D-79. Con su grant de UPDATE, que en alumnos enumera columnas y por tanto no cubre una columna nueva sola: es la trampa que documento la migracion 26." -m "La confirmacion se guarda porque D-78 deja la verificacion en el mostrador: la casilla es la unica constancia de que se dijo la regla."
```

---

## Tarea 4 · El salón en la ficha del producto *(D-77)*

**Archivos:**
- Modificar: `lib/catalogo/consultas.ts`
- Modificar: `app/(alumno)/catalogo/[id]/page.tsx`

**Interfaces:**
- Consume: `campuses.salon_devolucion` de la Tarea 1.

> ⚠ **El camino obvio no sirve, y está medido.** La ficha pinta las sedes con
> `disponibilidadPorSede(producto.id)` *(`app/(alumno)/catalogo/[id]/page.tsx:46`)*, que devuelve
> `StockSede { campusId, campusName, unidades }` y **sale de la vista `product_availability`**, la cual no
> tiene `salon_devolucion` ni la va a tener sin tocar la vista. **Ampliar la vista es más invasivo de lo
> que vale un texto**, y embeber `campuses` desde una vista por PostgREST no es fiable. Se usa
> `sedesActivas()`, que **ya consulta `campuses` directamente** *(`lib/catalogo/consultas.ts:116-131`)*, y
> se casan las dos listas por `id`.

- [ ] **Paso 1: ampliar el tipo `Sede` y su consulta**

En `lib/catalogo/consultas.ts`, el tipo de la línea 106:

```ts
export type Sede = {
  id: string;
  name: string;
  // D-77. Nullable a proposito, igual que la columna: una sede puede darse de
  // alta antes de saber en que salon se devuelve.
  salonDevolucion: string | null;
};
```

Y en `sedesActivas()`, la consulta y el retorno:

```ts
  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, salon_devolucion')
    .eq('activo', true)
    .order('name');

  if (error) {
    console.error('sedesActivas: fallo la consulta a campuses', error.message);
    return [];
  }

  return data.map((fila) => ({
    id: fila.id,
    name: fila.name,
    salonDevolucion: fila.salon_devolucion,
  }));
```

**El `.map()` es nuevo:** hoy la función devuelve `data` tal cual porque las columnas de la base y las del
tipo se llamaban igual. `salon_devolucion` y `salonDevolucion` no, así que hay que traducir.

- [ ] **Paso 2: la ficha pide también las sedes**

En `app/(alumno)/catalogo/[id]/page.tsx`, ampliar el import de la línea 14 y la carga de datos:

```tsx
import {
  detalleProducto,
  disponibilidadPorSede,
  sedesActivas,
} from "@/lib/catalogo/consultas";
```

```tsx
  const sedes = await disponibilidadPorSede(producto.id);
  // D-77: el salon vive en `campuses` y `product_availability` no lo trae, asi
  // que se casa por id con la lista de sedes activas.
  const activas = await sedesActivas();
  const salonPorSede = new Map(
    activas.map((s) => [s.id, s.salonDevolucion]),
  );
```

- [ ] **Paso 3: mostrarlo**

En el bloque donde ya se listan las sedes con existencias, junto a cada una:

```tsx
{salonPorSede.get(sede.campusId) ? (
  <span className="text-muted-foreground text-sm">
    Se devuelve en {salonPorSede.get(sede.campusId)}
  </span>
) : null}
```

**El `? :` no es defensivo por costumbre:** la columna es `nullable` a propósito *(ver la migración 27)*,
así que una sede sin salón es un estado válido y no un error.

- [ ] **Paso 4: comprobarlo en el navegador, no por `typecheck`**

```powershell
npm run dev
```

Entrar a `/catalogo`, abrir un producto con unidades en las dos sedes, y ver **los dos salones distintos**.
**Ver un solo salón repetido es el fallo que el control negativo de la Tarea 1 previene en la base**, y hay
que mirarlo también aquí.

- [ ] **Paso 5: los comandos**

```powershell
npm run typecheck
```

```powershell
npm run lint
```

- [ ] **Paso 6: commit**

```powershell
git add lib/catalogo/consultas.ts "app/(alumno)/catalogo/[id]/page.tsx"
```

```powershell
git commit -m "feat(catalogo): la ficha dice en que salon se devuelve cada sede" -m "D-77. La sede ya venia en la consulta; faltaba la columna."
```

---

## Tarea 5 · El FAQ *(D-78)*

**Archivos:**
- Modificar: `app/(publico)/faq/page.tsx`

> **El FAQ no consulta la base** —lo dice su comentario de cabecera— y **esta tanda no lo cambia**. Los
> salones van escritos, y por eso llevan comentario con la fecha en que se midieron, como ya hacen las
> otras respuestas del archivo.

- [ ] **Paso 1: añadir la pregunta de los salones**

En la sección `"En qué sedes"` del array `SECCIONES`, añadir una fila:

```ts
{
  pregunta: "¿Dónde devuelvo el equipo?",
  // Medido contra produccion el 2026-08-18: campuses.salon_devolucion vale
  // 'MO-UH40' en Monterrico y 'SM-SB608' en San Miguel. Va escrito y no
  // consultado porque esta pagina no habla con la base (ver la cabecera).
  respuesta:
    "En el mismo salón donde lo recogiste: MO-UH40 en Monterrico y SM-SB608 en San Miguel. La devolución es presencial y la registra el operador delante tuyo.",
},
```

- [ ] **Paso 2: añadir la sección de quién puede pedir prestado**

En la sección `"Quién puede reservar"`, añadir dos filas:

```ts
{
  pregunta: "¿Cualquier alumno de la UPC puede pedir equipos prestados?",
  respuesta:
    "No. El préstamo es solo para la Facultad de Ingeniería, y dentro de ella para las carreras de Ciencias de la Computación e Ingeniería de Software.",
},
{
  pregunta: "¿Cómo se comprueba que soy de esas carreras?",
  // D-78: el sistema NO lo comprueba. La verificacion es presencial y con el
  // TIU, en el mostrador. Esta respuesta dice la verdad a proposito: prometer
  // una comprobacion automatica que no existe seria peor que no decir nada.
  respuesta:
    "Con tu TIU, en el mostrador, cuando recoges el equipo. El sistema no lo verifica al reservar: si reservas sin pertenecer a esas carreras, la reserva se te rechaza al recogerla.",
},
```

- [ ] **Paso 3: completar el proceso de préstamo y devolución**

En la sección de cancelaciones y faltas, o en la de plazos si encaja mejor al leerla entera, añadir:

```ts
{
  pregunta: "¿Qué pasa paso a paso, desde que reservo hasta que devuelvo?",
  respuesta:
    "Reservas una franja para una sede. Vas al salón de esa sede en tu horario, muestras tu TIU y el operador te entrega el equipo y marca la entrega. Al terminar lo devuelves en el mismo salón, el operador lo revisa y marca la recepción. Si no lo recoges o no lo devuelves a tiempo, queda registrado y afecta a tus próximas reservas.",
},
```

- [ ] **Paso 4: verlo**

```powershell
npm run dev
```

Abrir `/faq` **sin sesión** —es pública— y comprobar que las cuatro preguntas nuevas están, se despliegan,
y que ninguna promete una comprobación que el sistema no hace.

- [ ] **Paso 5: los comandos**

```powershell
npm run typecheck
```

```powershell
npm run lint
```

- [ ] **Paso 6: commit**

```powershell
git add "app/(publico)/faq/page.tsx"
```

```powershell
git commit -m "docs(faq): salones de devolucion, proceso completo y facultad" -m "D-78. La restriccion de facultad y carreras es texto y control humano con el TIU: el sistema no la comprueba, y la respuesta lo dice en vez de disimularlo."
```

---

## Tarea 6 · El formulario se muda a la primera reserva *(D-79)*

**Archivos:**
- Modificar: `app/(alumno)/layout.tsx:37`
- Modificar: `lib/auth/destino.ts:70`
- Modificar: `app/(alumno)/catalogo/[id]/reservar/page.tsx`
- Modificar: `app/(perfil)/completar-perfil/page.tsx`
- Modificar: `app/(perfil)/completar-perfil/actions.ts`

**Interfaces:**
- Consume: `alumnos.es_profesor` y `alumnos.confirmo_facultad` de la Tarea 3.

> **Es la tarea que más puede romper de las de aplicación**, porque toca el reparto de navegación que la
> tanda 1 de la Fase 2 dejó verificado de punta a punta. Va la última de las de código a propósito.

- [ ] **Paso 1: quitar el desvío del layout**

En `app/(alumno)/layout.tsx`, borrar el bloque:

```tsx
if (!alumno.nombre || !alumno.apellido || !alumno.carrera_id) {
  redirect("/completar-perfil");
}
```

**La consulta de arriba se queda** —sigue haciendo falta comprobar que la fila existe y redirigir a
`/auth/error` si no—, y el `select` puede quedarse igual: pedir tres columnas que ya no se miran es más
barato que otra ronda de revisión.

- [ ] **Paso 2: cambiar el destino tras entrar**

En `lib/auth/destino.ts`, sustituir:

```ts
if (!alumno.nombre || !alumno.apellido || !alumno.carrera_id) {
  return '/completar-perfil';
}

return '/catalogo';
```

por:

```ts
// D-79: el perfil incompleto YA NO desvia al entrar. Se pide en la primera
// reserva, en /catalogo/[id]/reservar. Quien solo viene a mirar no da sus
// datos.
return '/catalogo';
```

- [ ] **Paso 3: poner la puerta donde se reserva**

> ⚠ **`reservar/page.tsx` NO resuelve la sesión: la hereda del layout.** Comprobado en el árbol: la página
> arranca con `params` y `searchParams` y salta directa a `detalleProducto(id)`; no hay ni cliente de
> Supabase ni `sub` en su ámbito. **Y un layout no le pasa props a su página en el App Router**, así que
> la página tiene que resolverla ella misma. Esto responde el punto a verificar **V-2** antes de ejecutar.

En `app/(alumno)/catalogo/[id]/reservar/page.tsx`, añadir a los imports:

```tsx
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
```

*(`notFound` ya se importa de `next/navigation`; se añade `redirect` a esa misma línea.)*

Y justo **después** del `if (sede === undefined) { notFound(); }` y **antes** de `detalleProducto(id)`:

```tsx
  // D-79: la puerta del perfil vive AQUI y no en el layout del grupo (alumno).
  // La sesion se resuelve de nuevo porque un layout no le pasa props a su
  // pagina: el layout ya comprobo que hay sesion, esto comprueba otra cosa.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  const { data: alumno } = await supabase
    .from("alumnos")
    .select("nombre, apellido, carrera_id, confirmo_facultad")
    .eq("auth_user_id", sub)
    .maybeSingle();

  if (!alumno) {
    redirect("/auth/error");
  }

  // `confirmo_facultad` entra en la condicion y `es_profesor` NO, y la
  // diferencia importa: no haber confirmado es un perfil incompleto, pero NO
  // SER PROFESOR ES UNA RESPUESTA VALIDA. Si es_profesor entrara aqui, ningun
  // alumno pasaria nunca de esta linea.
  if (
    !alumno.nombre ||
    !alumno.apellido ||
    !alumno.carrera_id ||
    !alumno.confirmo_facultad
  ) {
    // El destino viaja en la URL para que rellenar los datos no expulse de la
    // reserva que se estaba haciendo.
    const volverA = `/catalogo/${id}/reservar?sede=${sede}`;
    redirect(`/completar-perfil?volver=${encodeURIComponent(volverA)}`);
  }
```

**Va antes de `detalleProducto(id)` a propósito:** quien no tiene perfil no necesita que se consulte el
producto, y así la puerta no depende de que la consulta de arriba haya ido bien.

**`confirmo_facultad` entra en la condición y `es_profesor` no**, y la diferencia importa: no haber
confirmado es un estado incompleto, mientras que **no ser profesor es una respuesta válida** — si
`es_profesor` entrara en la condición, ningún alumno pasaría nunca.

- [ ] **Paso 4: que `/completar-perfil` sepa volver**

En `app/(perfil)/completar-perfil/page.tsx`, leer el parámetro `volver` de la URL y pasarlo al formulario
como campo oculto:

```tsx
<input type="hidden" name="volver" value={volver ?? ""} />
```

Y en `actions.ts`, al final, usarlo en lugar de `destino()` cuando venga:

```ts
const volver = formData.get("volver") as string | null;

// El parametro se comprueba antes de usarse: un redirect() a un valor que
// llega del cliente es un redirect abierto si no se ata. Solo se aceptan rutas
// internas, y cualquier otra cosa cae en el reparto de siempre.
if (volver && volver.startsWith("/") && !volver.startsWith("//")) {
  redirect(volver);
}

redirect(await destino());
```

- [ ] **Paso 5: los dos campos nuevos en el formulario**

En `app/(perfil)/completar-perfil/page.tsx`, después del desplegable de carrera:

```tsx
<div className="flex items-start gap-2">
  <input
    id="es_profesor"
    name="es_profesor"
    type="checkbox"
    defaultChecked={alumno?.es_profesor ?? false}
    className="mt-1"
  />
  <label htmlFor="es_profesor" className="text-sm">
    Soy profesor. La carrera de arriba es a la que pertenezco.
  </label>
</div>

<div className="flex items-start gap-2">
  <input
    id="confirmo_facultad"
    name="confirmo_facultad"
    type="checkbox"
    required
    defaultChecked={alumno?.confirmo_facultad ?? false}
    className="mt-1"
  />
  <label htmlFor="confirmo_facultad" className="text-sm">
    Confirmo que pertenezco a la Facultad de Ingeniería, en Ciencias de la
    Computación o Ingeniería de Software. Se verifica con el TIU al recoger el
    equipo.
  </label>
</div>
```

**El `required` del segundo es comodidad del navegador, no un control.** Quien lo salte llega igual a la
puerta del Paso 3, que es la que decide.

- [ ] **Paso 6: guardarlos**

En `actions.ts`, ampliar la lectura y el `update`:

```ts
const es_profesor = formData.get("es_profesor") === "on";
const confirmo_facultad = formData.get("confirmo_facultad") === "on";
```

```ts
.update({ nombre, apellido, carrera_id, es_profesor, confirmo_facultad })
```

**El `.select("id")` del final no se toca:** sigue siendo lo que distingue «no tengo privilegio» —que da
`42501`— de «no tengo política» —que deja el `UPDATE` en cero filas **sin error**—. Si la migración 29 se
hubiera quedado sin su línea de `grant`, es **aquí** donde se nota.

- [ ] **Paso 7: el recorrido entero, en el navegador**

```powershell
npm run dev
```

Con una cuenta **sin perfil completo**:

1. Entrar → **cae en `/catalogo`**, no en el formulario. *(Esto es D-79; si cae en el formulario, el Paso 2
   no se aplicó.)*
2. Abrir un producto y mirarlo entero → **no pide nada**.
3. Pulsar Reservar → **cae en `/completar-perfil`** con `?volver=` en la URL.
4. Rellenar y guardar → **vuelve a la reserva que se estaba haciendo**, no al catálogo.
5. Volver a pulsar Reservar en otro producto → **ya no lo pide**.

**El paso 4 es el que falla si el parámetro no viaja**, y es justo el que hace que la mudanza valga la
pena: sin él, dar los datos expulsa de la reserva.

- [ ] **Paso 8: los comandos**

```powershell
npm run typecheck
```

```powershell
npm run lint
```

```powershell
npm test
```

- [ ] **Paso 9: commit**

```powershell
git add "app/(alumno)/layout.tsx" lib/auth/destino.ts "app/(alumno)/catalogo/[id]/reservar/page.tsx" "app/(perfil)/completar-perfil"
```

```powershell
git commit -m "feat(perfil): los datos se piden en la primera reserva, no al entrar" -m "D-79. La puerta se muda del layout del grupo (alumno) a la pagina de reservar, con el destino en la URL para que rellenar los datos no expulse de la reserva." -m "Dos campos nuevos: es_profesor y confirmo_facultad. Solo el segundo entra en la condicion de la puerta: no ser profesor es una respuesta valida, no un perfil incompleto."
```

---

## Tarea 7 · Verificación de punta a punta y cierre

> **Predicción escrita ANTES de medir**, para que el cierre se pueda contar y no solo narrar:
>
> | Métrica | Antes | Después, previsto |
> |---|---|---|
> | Migraciones | 26 | **29** |
> | Aserciones pgTAP | 159 | **175** |
> | Archivos de prueba pgTAP | 27 | **30** |
> | Pruebas de Vitest | 155 | **155** *(esta tanda no añade ninguna)* |
> | Pruebas E2E | 6 | **6** |
>
> **La de Vitest es la única estimada y no calculada**, así que es la candidata a fallar.

> **Medido el 2026-08-18 al ejecutar esta tarea.** Cuatro de las cinco filas salieron exactas y **la que
> falló no fue la señalada**: las aserciones pgTAP dieron **176** y no 175 *(corrección 12)*. La de Vitest,
> la única marcada como candidata, acertó. **Predecir cuál va a fallar es una predicción más, y también se
> comprueba.**
>
> ⚠ **Las casillas de las Tareas 0 a 6 quedaron sin marcar al ejecutarlas, y no se marcan ahora**: nadie
> las fue tachando y rellenarlas a posteriori sería reconstruir de memoria lo que ya cuentan **los seis
> commits y la bitácora**. Aquí sólo se marcan los pasos que ejecutó esta sesión. **Los pasos 7, 8 y 9
> los corre Alejandro** —publicar, `db push` y la verificación contra producción—, así que se quedan sin
> marcar hasta entonces.

- [x] **Paso 1: los cuatro comandos, sobre el árbol entero**

```powershell
npm run lint
```

```powershell
npm run typecheck
```

```powershell
npm test
```

```powershell
npm run build
```

- [x] **Paso 2: la base desde cero**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

**Comparar con la predicción de arriba y anotar las diferencias**, no corregir la predicción.

- [x] **Paso 3: el E2E, porque la Tarea 6 cambió la navegación**

```powershell
npm run test:e2e
```

**Esperado: 6/6.** El flujo de reservar pasa por la puerta nueva, así que **si algo se rompe, se rompe
aquí**. Y recordar lo que costó la Fase 2: **detener la tarea de fondo no mata `next start`**, y con
`reuseExistingServer: false` eso da un rojo que no dice nada del código.

- [x] **Paso 4: la comprobación que ninguna herramienta hace — que la fuga se cerró**

Con `npm run dev` levantado y sesión de **alumno**, en la consola del navegador:

```js
await (await fetch('/catalogo')).text().then(t => t.match(/Obs:|falta bateria|O\.C \d+/g))
```

**Desenlace A:** `null` → ninguna observación se publica. Seguir.
**Desenlace B:** cualquier coincidencia → la fuga sigue abierta en alguna pantalla que esta tanda no miró.
**Anotarlo y no taparlo.**

> **Control positivo, sin el cual el `null` no vale nada:** repetir la misma sonda buscando algo que **sí**
> tiene que estar, por ejemplo el nombre de un producto. Si eso también da `null`, la sonda está rota y el
> primer resultado no dice nada. Es la lección que este proyecto ya pagó dos veces.

- [x] **Paso 5: cerrar los documentos ANTES de pasar los comandos de git**

Actualizar, en este orden:

1. `MIGRATION_DOCS/PLANES/FASE_3_TANDA_1.md` — **la cabecera de correcciones**, con lo que la ejecución
   desmintió. Sin ella el plan miente por omisión.
2. `MIGRATION_DOCS/ESTADO_Y_PLAN.md` — la fila de la F3-T1 pasa a cerrada, la bitácora gana su entrada con
   las métricas medidas, y **Q-23 se actualiza con cuántas descripciones quedaron realmente vacías**.
3. `MIGRATION_DOCS/PLANES/README.md` — la fila del plan nuevo en la tabla.

- [x] **Paso 6: el commit de cierre**

```powershell
git add MIGRATION_DOCS
```

```powershell
git commit -m "docs: cierre de la F3-T1, tres migraciones y el desempaquetado" -m "Correcciones al plan en su cabecera. Metricas medidas contra la prediccion escrita antes de medirlas."
```

- [ ] **Paso 7: publicar y abrir el PR**

```powershell
git push -u origin feature/fase-3-tanda-1
```

Y abrir el PR contra `develop`, un PR por tanda.

- [ ] **Paso 8: el remoto, y solo después de que el CI esté verde**

> ⚠ **Las tres migraciones no están en producción hasta este paso, y hasta entonces la fuga sigue abierta
> para un alumno real.** El merge no las aplica: se aplican a propósito *(regla del `CLAUDE.md` global)*.

```powershell
npx supabase db push
```

```powershell
npx supabase migration list
```

**Esperado:** las 29 con `local` y `remote` idénticos.

- [ ] **Paso 9: verificar en producción POR EL EFECTO, no por el registro**

Que una migración figure aplicada no dice que el dato haya cambiado. Contra el proyecto real:

```sql
select
  (select count(*) from public.products where description like 'Lab: %') as quedan_sin_desempaquetar,
  (select count(*) from public.products where description like '%Obs:%') as publican_observacion,
  (select count(*) from public.products where btrim(description) = '') as quedan_vacias,
  (select count(*) from public.inventory_unit_notes where created_by is null) as notas_migradas,
  (select count(*) from public.campuses where salon_devolucion is not null) as sedes_con_salon;
```

**Esperado:** `0`, `0`, **2**, un número mayor que cero, y `2`.

**El `2` de `quedan_vacias` es la predicción de Q-23** —los dos productos con forma `Lab | Obs`—. Si sale
otro número, **la medición del 2026-08-18 se quedó corta y hay que decirlo en Q-23**, no ajustar la
expectativa en silencio.

---

## Puntos a verificar

*Lo que no se sabe con certeza, con los dos desenlaces y qué se hace en cada uno.*

| # | Duda | Si A | Si B |
|---|---|---|---|
| **V-1** | ¿La ficha del producto tiene un sitio donde quepa el salón sin rediseñar nada? | Cabe junto a la sede → Tarea 4 tal cual | No cabe → **se pone y no se ajusta la estética**: la fase visual la hace otra persona. Se anota y se sigue |
| ~~**V-2**~~ | ~~¿`reservar/page.tsx` resuelve la sesión antes del punto donde va la puerta?~~ ✅ **Contestado al escribir el plan: NO la resuelve**, la hereda del layout, y un layout no pasa props a su página. La Tarea 6 Paso 3 la resuelve por su cuenta *(corrección 7)* | — | — |
| **V-3** | ¿El E2E de reservar usa una cuenta con el perfil ya completo? | Sí → 6/6 sin tocar el arnés | No → **la puerta nueva lo rompe**. Se completa el perfil en el arnés, **por la superficie real y no por `psql`** *(D-62)* |
| **V-4** | ¿Quedan exactamente 2 descripciones vacías en producción? | Sí → Q-23 confirmado en 16 | No → **la estructura tiene una cuarta forma que no se midió**. Se cuenta, se escribe en Q-23 y se decide si hace falta otra migración |

**Desenlace de los cuatro, medido el 2026-08-18 al cerrar la tanda:**

- **V-1 → A.** El salón cabe junto a la sede en la ficha, sin rediseñar nada. No hizo falta la salida B.
- **V-2 → contestado antes de ejecutar**, al escribir el plan *(corrección 7)*. Es el que salió gratis.
- **V-3 → B, y se supo antes de romper nada.** Las cuatro specs entran como Ana, y la constante que la
  nombra —`ALUMNA_CON_PERFIL_COMPLETO`— la volvía mentira D-79, porque `confirmo_facultad` nace en `false`.
  Se arregló por el seed *(corrección 5)*. **La salida B se cumplió tal como estaba escrita**, incluida la
  parte de no tocar la base por `psql`.
- **V-4 → SIN CONTESTAR, y no por olvido: no se puede contestar en local.** Requiere consultar producción,
  y eso es el paso 9, que corre Alejandro. **Lo que sí se probó en local es el mecanismo que produce el 2**
  —la forma `Lab | Obs` termina con la descripción vacía— sobre el fixture de la corrección 9. Que el
  número sea 2 sigue siendo una **predicción**.

---

## Cabecera de correcciones

*(Se rellena al ejecutar. Si al terminar está vacía, es que no se miró.)*

1. ⚠ **La Tarea 1 no podía pasar en local, y el motivo estaba escrito en la corrección 1 de este mismo
   plan sin que yo lo aplicara a esa tarea.** `db reset` aplica las migraciones y **después** corre
   `seed.sql`, así que cuando el `update ... where name = 'San Miguel'` de la migración 27 se ejecuta,
   `campuses` está **vacía**: no toca ni una fila. Medido por el efecto y no deducido — tras el reset, las
   dos sedes salían con `salon_devolucion` en `NULL`, y la prueba 35 pasaba su aserción 1 —la columna
   existe— y fallaba las tres de valores.

   **En producción la migración sí funciona**, porque allí las dos sedes existen desde antes. El arreglo
   es que `seed.sql` siembre la columna con los valores reales, y **la consecuencia se dice en vez de
   disimularse: en local el dato lo pone el seed, así que el `UPDATE` de la migración NO queda verificado
   por `35_salon_devolucion.sql`.** Se verifica contra producción, en el **paso 9 de la Tarea 7**, que ya
   lo contempla con `sedes_con_salon = 2`.

   **Lo que enseña, y vale para las tres migraciones de esta tanda:** una corrección anotada para una
   tarea no se aplica sola a las demás. El plan avisaba de que el seed corre después de las migraciones y
   yo lo usé solo para diseñar la Tarea 2, que es donde lo había descubierto. La regla de releer las
   correcciones **antes de cada tarea, no al final de la tanda**, existe exactamente para esto.

2. **`unlike()` no existe en pgTAP.** El plan la usaba en la prueba 36. Medido al ejecutar:
   `function unlike(text, unknown, unknown) does not exist`. Las de patrón `LIKE` son **`alike` /
   `unalike`**; las de expresión regular, `matches` / `doesnt_match`. Se cambia por `unalike`.
   **Tres aserciones habían pasado antes de llegar a ella**, así que el fallo no era del SQL de la
   migración: era del instrumento que lo medía.

3. ⚠ **«No conceder» no es lo mismo que «nadie puede»: Postgres concede `EXECUTE` a `PUBLIC` en toda
   función nueva.** El plan decía «sin grant para nadie», y eso **no cierra nada** — `private` tiene
   `grant usage ... to authenticated`, así que la función habría quedado ejecutable por cualquiera con
   sesión. Se añade `revoke all on function ... from public`, que es lo mismo que ya hicieron
   `revoke_blanket_grants.sql` y `revoke_trigger_functions.sql`.

   **Verificado por el efecto y con control positivo**, no leyendo la migración:
   `has_function_privilege` da **`false`** para `authenticated` y para `anon` sobre la función, y **`true`**
   para `authenticated` sobre `create_reservation` — sin ese `true`, el `false` no distinguiría «revocado»
   de «la sonda pregunta mal».

   Se decidió además **no** hacerla `security definer`, al revés que los helpers de `private`: solo la
   llaman la migración y la prueba, las dos como `postgres`, y sin `definer` una ejecución inesperada
   correría con los privilegios de quien llama y RLS la pararía.

4. **La prueba 36 pasa de 7 aserciones a 8.** Las siete del plan miran las tres filas de fixture y
   **ninguna comprueba que la función deje en paz lo que no tiene la forma `Lab: `**. Una función sin
   `where` —o con uno mal escrito— arrasaría el catálogo entero y **las siete seguirían en verde**, porque
   ninguna mira una fila ajena. La octava afirma que `'Camara full frame sin espejo, 24 MP'` queda intacta.
   Por eso el recuento de la Tarea 2 sale en **171 y no en 170**.

5. **El E2E se rompía, y se supo antes de romperlo.** V-3 preguntaba si el arnés entra con el perfil
   completo. Medido: las **cuatro** specs entran como `alumno.a@upc.edu.pe`, y la constante que la nombra
   se llama `ALUMNA_CON_PERFIL_COMPLETO` — un nombre que D-79 volvía mentira, porque `confirmo_facultad`
   nace en `false`. **Tres de las seis pruebas habrían rebotado a `/completar-perfil`.** Se arregla en
   `seed.sql`: Ana se siembra con `confirmo_facultad = true` y **Bruno se queda sin confirmar a propósito**,
   para que exista un usuario con el perfil a medias con el que caminar la puerta nueva.
   Resultado tras el arreglo: **6/6**.

6. ⚠ **Un instrumento mintió, y esta vez era `curl`.** Antes del E2E maté el servidor de desarrollo y
   comprobé el puerto con `curl --max-time 3`, que devolvió **`000`**; lo leí como «puerto libre» y
   Playwright contestó `http://127.0.0.1:3000 is already used`. **`000` no es «no hay nada»: es «no
   contestó en tres segundos».** `netstat -ano` mostró el PID **30784** escuchando en `0.0.0.0:3000` y en
   `[::]:3000` — el `taskkill` anterior filtraba por título de ventana y no casó con nada. **Dos
   herramientas discrepaban y la que tenía razón era la que mira la tabla de sockets, no la que hace una
   petición y se rinde.**

7. **El desplegable de carrera no preselecciona, y mi propio cambio lo convierte en un defecto.**
   `defaultValue=""` estaba clavado en `completar-perfil/page.tsx`. **Antes daba igual**, porque esa
   pantalla solo aparecía con el perfil vacío; desde D-79 aparece también a quien **solo** le falta
   confirmar la facultad, y le obligaba a reelegir una carrera que ya había elegido. Se pasa a
   `defaultValue={alumno?.carrera_id ?? ""}`, y la consulta gana `carrera_id`. **Encontrado caminando la
   pantalla, no leyéndola:** el `typecheck` no sabe qué opción sale seleccionada.

8. ⚠ **El E2E necesita DOS condiciones a la vez —base limpia y Auth caliente— y los pasos 2 y 3 de la
   Tarea 7 se las quitan mutuamente.** El paso 2 es `db reset` y el paso 3 es el E2E, encadenados. Medido
   en cuatro corridas, no deducido:

   | Corrida | Base | Auth | Resultado |
   |---|---|---|---|
   | 1 | limpia, recién reseteada | recién arrancado, con el `build` compitiendo | **4/6** |
   | 2 · solo `cancelar.spec.ts` | sucia | caliente, 12 minutos de vida | **2/2** |
   | 3 · completa | sucia, 3 corridas acumuladas | caliente | **3/6** |
   | 4 | **limpia** | **calentada a propósito** | **6/6**, en 2,2 min |

   **Lo que rompe la corrida 1 no es el código de la tanda:** `npx supabase db reset` **para y vuelve a
   arrancar el contenedor de Auth** —`docker inspect` da `StartedAt = 22:08:38`—, y las dos primeras
   peticiones de magic link expiraron **dentro del propio servicio**: `POST /otp` → **504
   `context deadline exceeded` a los 10,97 s**, y la siguiente → **500 `error finding user: timeout:
   context canceled` a los 8,00 s**. La segunda no es del correo: es una consulta a `auth.users`. Las dos
   pruebas que caen son las de `cancelar.spec.ts`, que van primero por orden alfabético — **el que va
   primero paga**.

   **El error no estaba en el log de Playwright sino en la pantalla**, dentro del `error-context.md` que
   Playwright guarda al fallar: `Processing this request timed out, please retry after a moment.` El log
   de la corrida sólo decía «timeout esperando *Revisa tu correo*», que nombra el síntoma y no la causa.
   **Un instrumento más contestando otra pregunta que la hecha.**

   **Y la hipótesis se corrigió a mitad de camino, con la medición que la desmentía a la vista:** el
   arranque en frío **por sí solo no rompe nada** —tras el `db reset` de la corrida 4, `generate_link`
   respondió en **0,897 s** y bajó a 0,388 s—, y el `build` por sí solo tampoco, porque la corrida 2 lo
   pagó entero y pasó. **Es la coincidencia de los dos**: Auth recién arrancado *mientras* el `build` y el
   arranque del servidor le comen la CPU. Ninguno de los dos factores, aislado, reproduce el fallo.

   **Lo que desmiente la corrida 3, y es lo que no se habría visto parando en la 2:** el estado de la base
   se acumula entre corridas, y tres seguidas sin resetear dejaron a Ana con **seis reservas del mismo
   producto en la misma franja** —mié 19 ago, 08:00–08:30, sobre CAM-001, CAM-002 y CAM-003—. Con
   `buffer_minutes = 120` eso bloquea las tres unidades varias horas, y `e2e/apoyo/reserva.ts:85` toma
   **la primera franja libre**: cuando no queda ninguna, el fallo sale como un `toHaveURL` que no dice
   nada de su causa. **Un E2E verde no prueba que el siguiente lo esté: presupone una base que la corrida
   anterior ya ensució.**

   **Por qué el CI no lo ve y local sí:** `playwright.config.ts:23` es `retries: process.env.CI ? 2 : 0`.
   En GitHub Actions los dos reintentos **absorben** el arranque en frío; en local no hay ninguno. O sea
   que este modo de fallo **sólo se manifiesta donde no hay red de seguridad**, y por eso la sesión
   anterior pudo ver un 6/6 legítimo: su E2E no venía detrás de un `db reset`.

   **No se toca el arnés en esta tanda.** El arreglo de verdad —que el arnés espere a que Auth responda
   antes de la primera prueba— es código nuevo y crecería el alcance a mitad de tanda. Se anota como
   **Q-26**. Lo que sí queda escrito es el orden que funciona: **`db reset` → calentar Auth → E2E**.

9. ⚠ **El paso 4 no podía detectar la fuga en local, y es la trampa nº 1 del proyecto cometida sobre el
   paso que iba a comprobarla.** La sonda busca `Obs:` en `/catalogo`. Medido sobre la base local recién
   reseteada: **4 productos, 0 con `Lab: `, 0 con `Obs:`, 0 notas de unidad**. La sonda habría dado `null`
   **porque el dato peligroso no existe en local**, no porque la aplicación lo esconda — y cero
   coincidencias es indistinguible de cero coincidencias posibles. Es exactamente lo que la corrección 1
   dijo de la migración, repetido un paso más allá. **El control positivo que el plan sí previó —buscar el
   nombre de un producto— no lo tapa:** prueba que la sonda lee, que es otra pregunta.

   **Se resuelve reproduciendo en local el estado de producción DESPUÉS de la migración**, con un fixture
   que no se versiona: se siembran las dos formas que deciden —la completa y la tercera, `Lab | Obs`— y se
   llama a `private.desempaquetar_descripciones()`, que es el mismo código que corrió la migración. Los
   cuatro efectos previstos salieron a la vez: la forma completa quedó con su especificación, **la tercera
   quedó vacía en vez de publicar la observación**, las dos descripciones ajenas quedaron **intactas**, y
   la nota se copió a **cada unidad** —3 y 2, cinco notas—.

10. **La sonda del paso 4 marcaba como fuga algo que Q-24 decidió publicar.** Su patrón es
    `/Obs:|falta bateria|O\.C \d+/`, y el tercer término es el número de orden de compra, que **D-82 deja
    a propósito en la descripción pública** y que Q-24 anota sin decidir. En producción, donde 16
    productos lo llevan, la sonda habría dado coincidencia **siempre** y se habría leído como «la fuga
    sigue abierta». **Un patrón que contradice una decisión ya tomada no mide la fuga: mide el desacuerdo
    entre dos partes del mismo documento.** Se le quita ese término y se le da su papel real, que es el de
    **control positivo**: si `O.C` aparece, la sonda ve la columna.

11. **La sonda se hace por PostgREST con un token de alumno de verdad, y no por la consola del navegador.**
    El plan la escribía sobre el HTML de `/catalogo`, y la superficie de PostgREST es **más ancha**: lo que
    la tarjeta recorta con `line-clamp-2` viaja entero en el HTML igualmente, y lo que ninguna pantalla
    pinta se pide con la clave publicable. Es además el mismo camino con el que se cerró Q-18, así que
    compara contra una medición que ya existe. **Resultado, con control en las dos direcciones:** el alumno
    lee las 4 descripciones y **0 llevan observación de estado**; el control positivo dice que **3 tienen
    texto** y **1 lleva el `O.C` que Q-24 deja público**, o sea que la sonda ve lo que hay; y en
    `inventory_unit_notes` el alumno recibe **0 filas con HTTP 200** mientras el operador recibe **5** —sin
    ese 5, el vacío del alumno no probaría nada—. El 200 con lista vacía, en vez de un `42501`, es la
    misma firma que dejó escrita la migración 25: le falta la política, no el privilegio.

12. **Y una corrección de recuento a la predicción de esta misma tarea, que se anota en vez de ajustarse:**
    la tabla preveía **175** aserciones pgTAP y salieron **176**. No es una sorpresa nueva —la corrección 4
    ya explicó que la prueba 36 pasaba de 7 a 8 aserciones—, sino la predicción que se escribió sin
    incorporarla. **Es el mismo género que la corrección 1: una corrección anotada no se aplica sola al
    resto del documento.** Las otras cuatro filas de la predicción salieron exactas.
