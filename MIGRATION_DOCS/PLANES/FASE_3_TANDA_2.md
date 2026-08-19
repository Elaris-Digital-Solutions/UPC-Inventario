# Fase 3 · Tanda 2 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.
>
> **Y se releen las correcciones antes de CADA tarea, no al final de la tanda.** En la F3-T1 una
> corrección anotada para la Tarea 2 dejó muerto un paso de la Tarea 1 que nadie volvió a mirar.

**Objetivo:** dejar el sistema con **operadores reales dados de alta**, exponer la **fecha del primer
correo** donde el admin la ve *(D-80)*, y **borrar los datos de demo de producción**.

**Enfoque:** dos migraciones —la **31** expone el primer acceso, la **32** borra la demo— más la columna
en `/admin/personal`, el procedimiento de alta verificado y la séptima prueba E2E *(Q-25)*. **La tarea de
riesgo, el borrado, va la segunda:** es la única operación irreversible de la Fase 3, y si su forma cambia,
cambia la tanda.

**Stack:** Postgres 15 sobre Supabase · pgTAP · Next.js 16 (App Router) · TypeScript estricto · Vitest ·
Playwright.

**Diseño:** [`../FASE_3_DISENO.md`](../FASE_3_DISENO.md) §7 — se lee junto con este plan, no en su lugar.
Decisión que ejecuta: **D-80**. Cierra **Q-25**.

**Punto de partida, medido el 2026-08-18 y no citado:** `develop` limpio en `4681743`, sólo `develop` y
`main`; **30 migraciones** con `local` y `remote` idénticos; pgTAP **`Files=31, Tests=183, PASS`**; Vitest
**11 archivos, 155 pruebas**.

---

## Correcciones al diseño

*(Todas son de la escritura de este plan, antes de ejecutar nada.)*

1. ⚠ **El alta de operadores ya está construida entera, y el diseño la describe como si faltara.** §7 dice
   «se hace desde `/admin/personal`, que ya existe», y se queda corto: no es que exista la pantalla, es que
   existen **`darDeAltaPersonal()`, `cambiarRolPersonal()` y `cambiarActivoPersonal()`**
   *(`lib/admin/acciones.ts:1069`, `:1125`, `:1175`)*, con `TablaPersonal`
   *(`components/admin/tabla-personal.tsx`)* y `listarPersonal()` *(`lib/admin/personal.ts:85`)*. Se
   construyeron en la **Task 9 de la T3B** *(D-52, D-53)*. **Esta tanda no escribe ni una línea de alta:**
   verifica el camino de punta a punta y entrega el procedimiento. Es el mismo hallazgo que abrió la Fase 3
   —«tres de los cinco bloques ya existían a medias»— cometido una vez más sobre el cuarto.

2. ⚠ **Y por eso «0 operadores» no es un defecto de código: es una precondición con personas, y puede
   dejar la tanda sin cerrar.** `darDeAltaPersonal()` exige una fila en `alumnos` con **`auth_user_id` no
   nulo** *(`lib/admin/acciones.ts:1093-1103`)*, y esa columna la rellena el trigger `handle_new_auth_user`
   **al pedir el magic link**. Medido en producción: **1 fila en `auth.users`**, la de Alejandro. **No hay
   a quién dar de alta hasta que los operadores reales entren una vez.** La tanda puede terminar con todo
   el código verde y **0 operadores en producción**; eso se dice en el cierre, en la sección de lo que la
   tanda deja sin hacer, y no se disimula. **Es además el argumento del orden F3-T2 antes que F3-T4
   llevado hasta el final:** poblar antes de que exista el riesgo exige personas, no commits.

3. ⚠ **`confirmation_sent_at` es NULL en local, y la columna nueva saldría vacía con los cuatro comandos
   en verde.** Medido, no deducido: la columna es `timestamptz`, **nullable y SIN default**
   *(`information_schema.columns` contra el proyecto real)*, y el `seed.sql` **no la nombra** en su
   `insert into auth.users` *(`supabase/seed.sql:109-119`)* — las columnas que sí nombra están ahí porque
   su propio comentario explica cuáles fallan sin valor, y ésta no falla: se queda en NULL. **Los cinco
   usuarios locales nacerían sin fecha de primer correo**, la columna se pintaría vacía en las dos filas de
   personal, y `typecheck`, `lint`, `build` y el recorrido en navegador pasarían igual. **Es la trampa nº 1
   del proyecto**, la de `products.featured`, en su forma exacta: el dato existe en producción y no en
   local. **Arreglo:** el `seed.sql` la siembra explícita *(Tarea 1, paso 4)*. **Y la consecuencia se dice
   en vez de disimularse: en local ese valor lo pone el seed, así que la prueba 39 no verifica que Auth
   escriba esa columna** — eso se verifica contra producción, en la Tarea 6.

4. **Las cuatro fechas de `auth.users` son distintas, y por eso el fixture puede probar que la función
   devuelve la correcta.** Medido en el único usuario real:

   | Columna | Valor |
   |---|---|
   | `created_at` | `2026-08-08 03:55:22.145453+00` |
   | **`confirmation_sent_at`** | **`2026-08-08 03:55:22.219185+00`** |
   | `email_confirmed_at` | `2026-08-08 03:55:43.070526+00` |
   | `last_sign_in_at` | `2026-08-13 11:56:18.750125+00` |

   **Si el fixture las sembrara con el mismo valor, una función que devolviera `created_at` daría verde.**
   Por eso el seed y la prueba 39 las siembran **separadas a propósito**, y hay una aserción por cada una
   de las tres equivocadas. Es la misma lección que la prueba 38 dejó escrita: *cuál* de dos filas
   sobrevive es la mitad que un `count` no mira.

5. ⚠ **La cascada del borrado no es la que el diseño supone.** §7 avisa de que el `delete` «arrastra por
   `on delete cascade`». Medido en producción:

   | Arista | `on delete` |
   |---|---|
   | `inventory_reservations → alumnos` | **NO ACTION** |
   | `reservation_status_log → inventory_reservations` | CASCADE |
   | `final_satisfaction_surveys → alumnos` | CASCADE |

   **Borrar un alumno con reservas no arrastra nada: falla.** El aviso del diseño apuntaba al riesgo
   contrario al real. **El orden obligatorio es reservas primero, alumnos después**, y lo único que
   arrastra de verdad son las **3** filas de `reservation_status_log` y las **0** de encuestas.

6. ⚠ **El borrado va por lista de ids medidos, no por `email like` con el prefijo de demo ni por
   `auth_user_id is null`.** El segundo criterio es el que parece correcto y es el peligroso:
   **`alumnos.auth_user_id` lleva `ON DELETE SET NULL`** sobre `auth.users` —`alumnos_auth_user_id_fkey`,
   medido—, así que **un alumno real cuya cuenta de Auth se borrara quedaría con NULL y entraría en un
   barrido por esa condición**. Y el prefijo `demo.` es una convención de nombres, no una regla del
   sistema. **Los cuatro ids se fijan en la migración**, contados por delante:

   | Correo | id | Reservas | Log |
   |---|---|---|---|
   | `demo.ana.torres@upc.edu.pe` | `4c4a4c5a-ba68-4391-a542-56cc57cdda4a` | 2 | 0 |
   | `demo.bruno.diaz@upc.edu.pe` | `64293784-dceb-4972-846f-20ea17fd5383` | 2 | 1 |
   | `demo.diego.luna@upc.edu.pe` | `4e66e2f0-1a58-4656-afe5-4fe2e232b076` | 1 | 1 |
   | `demo.carla.rojas@upc.edu.pe` | `56cb0cd5-53eb-4b13-9d4e-e2588905fd22` | 3 | 1 |

   **Total: 4 alumnos, 8 reservas, 3 filas de log.** Y el dato que hace segura la operación: **el usuario
   real —`u20241b820@upc.edu.pe`— tiene 0 reservas**, así que no hay nada suyo que el borrado pueda rozar.

7. **La lógica del borrado va en `private.borrar_alumnos_demo(p_ids uuid[])`, no en un `delete` suelto**,
   con el patrón que ya validaron las migraciones 28 y 30: una migración corre **una vez y antes que el
   seed**, así que ninguna prueba puede ejercitarla; una función la prueba puede **volver a llamarla**
   sobre un fixture. **Se prueba el código que corrió, no una copia suya pegada en el test.** Y lleva
   `revoke all on function ... from public` explícito: **«no conceder» no es «nadie puede»** —Postgres
   concede `EXECUTE` a `PUBLIC` en toda función nueva y `private` tiene `grant usage` a `authenticated`—,
   que es la corrección 3 de la F3-T1 y costó descubrirla.

8. **La migración 32 no toca ni una fila en local, y eso es correcto, no un fallo.** Los cuatro ids no
   existen en el `seed.sql`. Es la misma asimetría que la migración 27 *(corrección 1 de la F3-T1)*: **la
   prueba 40 verifica la función sobre un fixture, y el `DELETE` real se verifica contra producción**, en
   la Tarea 6. Se escribe aquí para que nadie lea «0 filas» como un defecto.

9. **La función del primer acceso va en `public`, no en `private`.** La consume `listarPersonal()` por
   PostgREST con `.rpc()`, y el esquema `private` no está expuesto. Los cuatro helpers de `private` que el
   diseño cita como modelo son el modelo del **estilo** —`stable security definer set search_path = ''`—,
   no de la ubicación.

10. **El argumento que ata el borrado al primer correo es más débil de lo que §7 dice, y la tanda se
    sostiene igual.** §7 justifica la limpieza porque «la fecha del primer correo de cada usuario sobre
    cuatro usuarios que nunca recibieron uno no es un dato, es ruido». **Los cuatro de demo no son
    personal**, así que no aparecen en `/admin/personal` ni con la columna nueva: los dos bloques están
    menos acoplados de lo que el diseño creía. **Van juntos igual** —los dos son limpieza de producción
    antes de que la F3-T4 la pueble—, pero el motivo se corrige en vez de repetirse.

11. **Los tests pgTAP nuevos son el `39` y el `40`.** Van hoy de `00` a `38` —el `38` lo trajo la
    migración 30— y ninguno de los anteriores se toca.

---

## Restricciones globales

*Valen para todas las tareas y no se repiten en cada una.*

- **PowerShell 5.1:** sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Un comando por bloque.
- **Migraciones solo por CLI versionada.** Se crean con `npx supabase migration new <nombre>`, nunca
  escribiendo el archivo a mano con una marca de tiempo inventada.
- **Ninguna migración toca el remoto sin haber pasado por el Docker local y por `npx supabase test db`.**
- **Docker Desktop tiene que estar arrancado**, y `db reset` exige el stack completo: falla si se arrancó
  con `-x`. ⚠ **`npx supabase start` devuelve exit 0 aunque Docker esté parado** —medido el 2026-08-18—,
  así que se comprueba por el efecto: `docker ps` lista contenedores, o `netstat -ano` encuentra el 54322.
- **Mensajes de commit sin acentos.** Los documentos, con tildes.
- **Ningún control de autorización en el cliente.** Quien decide es RLS.
- **Comentarios de SQL sin acentos**, como los de las 30 migraciones que ya hay.
- **No se empuja al remoto.** El plan entrega los comandos; los ejecuta Alejandro.
- **El E2E necesita base limpia Y Auth caliente** *(Q-26)*. El orden que funciona: **`db reset` → calentar
  Auth → E2E**.
- **Si el `typecheck` falla con errores de SINTAXIS en `.next/dev/types/routes.d.ts`, no es el código:** es
  ese archivo generado, truncado al matar el servidor de desarrollo. `rm -rf .next` y vuelve a verde
  *(corrección 17 de la F3-T1)*.

---

## Mapa de archivos

**Se crean:**

| Archivo | De qué responde |
|---|---|
| `supabase/migrations/<ts>_primer_acceso_personal.sql` | La función `public.primer_acceso_personal()` y su `grant` |
| `supabase/migrations/<ts>_borrar_datos_demo.sql` | `private.borrar_alumnos_demo()` y su única llamada, con los 4 ids |
| `supabase/tests/39_primer_acceso.sql` | Que devuelve **`confirmation_sent_at` y no otra fecha**, y quién puede llamarla |
| `supabase/tests/40_borrar_datos_demo.sql` | Que borra lo suyo **y deja intacto lo ajeno** |
| `e2e/perfil.spec.ts` | La puerta de perfil de D-79 *(Q-25)* |

**Se modifican:**

| Archivo | Qué cambia |
|---|---|
| `supabase/seed.sql` | Siembra `confirmation_sent_at`, **distinta** de las otras tres fechas *(corrección 3)* |
| `lib/admin/personal.ts` | `listarPersonal()` trae el primer acceso y lo cruza por `user_id` |
| `components/admin/tabla-personal.tsx` | La columna nueva |
| `lib/database.types.ts` | Regenerado |

**No se toca, y se dice para que nadie lo intente:** `lib/admin/acciones.ts`. El alta de personal ya está
construida *(corrección 1)*.

---

## Tarea 0 · La rama y el punto de partida

*Un commit al final de la tanda no vale: si la Tarea 2 sale mal, hay que poder volver al estado de antes
sin arrastrar lo demás.*

- [ ] **Paso 1.** Comprobar que `develop` está limpio y al día. Esperado: rama `develop`, `git status`
      vacío, último commit `4681743`.
- [ ] **Paso 2.** Comprobar **por el efecto** que el stack local está arriba: `docker ps` lista
      `supabase_db_UPC-Inventario`. ⚠ **No basta con que `supabase start` haya devuelto 0** — medido el
      2026-08-18: con Docker Desktop parado, `npx supabase start` **falla y sale con código 0**.
- [ ] **Paso 3.** Crear la rama `feature/fase-3-tanda-2` desde `develop`.
- [ ] **Paso 4.** **Fijar la línea base contando, no citando:** `npx supabase test db` y `npm test`.
      Esperado: **`Files=31, Tests=183, PASS`** y **11 archivos, 155 pruebas**. Si no coinciden, se para y
      se averigua por qué antes de escribir nada — una base distinta de la que este plan supone invalida
      todas las predicciones de abajo.

**Comandos para Alejandro (PowerShell):**

```powershell
git checkout develop
```

```powershell
git pull
```

```powershell
git checkout -b feature/fase-3-tanda-2
```

**Commit:** ninguno. Esta tarea no cambia archivos.

---

## Tarea 1 · Migración 31: la fecha del primer acceso *(D-80)*

**Qué resuelve:** el admin necesita saber cuándo se le mandó a cada miembro del personal su primer magic
link. **El dato ya existe en `auth.users.confirmation_sent_at` y no se copia: se expone** *(D-80)* —
copiarlo a `alumnos` crearía una segunda copia que se desincroniza de la primera.

- [ ] **Paso 1.** Crear la migración:
      `npx supabase migration new primer_acceso_personal`.

- [ ] **Paso 2.** Escribir la función. **En `public` y no en `private`** *(corrección 9)*: la consume
      PostgREST con `.rpc()`.

      ```sql
      create or replace function public.primer_acceso_personal()
      returns table (user_id uuid, primer_acceso timestamptz)
      language sql stable security definer set search_path = ''
      as $func$
        select s.user_id, u.confirmation_sent_at
          from public.staff_members s
          join auth.users u on u.id = s.user_id
         where (select private.is_admin())
      $func$;
      ```

      **Tres cosas que deciden y no son adorno:**
      - **`security definer`** es lo único que permite leer `auth.users`: ese esquema no tiene `grant`
        para `authenticated`, que es justo por lo que ninguna consulta del proyecto lo toca hoy.
      - **`set search_path = ''`** y todo calificado, como los cuatro helpers de `private`
        *(`20260805193357_private_helpers.sql`)*. Una función `security definer` sin `search_path` fijo es
        una escalada de privilegios esperando a que alguien cree una tabla con el nombre adecuado.
      - **El filtro es `private.is_admin()` dentro del `where`, no un `raise`.** Quien no es admin recibe
        **cero filas**, no un error: un error distinto por rol le dice a quien pregunta qué existe.

- [ ] **Paso 3.** Los privilegios, **en este orden**:

      ```sql
      revoke all on function public.primer_acceso_personal() from public;
      grant execute on function public.primer_acceso_personal() to authenticated;
      ```

      ⚠ **El `revoke` va primero y no es redundante:** Postgres concede `EXECUTE` a `PUBLIC` en toda
      función nueva, así que sin él `anon` podría llamarla *(corrección 3 de la F3-T1)*. Con la función en
      `security definer`, eso importa el doble.

- [ ] **Paso 4.** **Arreglar el `seed.sql`** *(corrección 3)*. Añadir `confirmation_sent_at` a la lista de
      columnas del `insert into auth.users` *(`supabase/seed.sql:109-119`)* y darle a cada usuario un
      valor **distinto de `created_at` y de `email_confirmed_at`**. Sugerido: `now() - interval '10 days'`
      para `created_at`/`confirmation_sent_at` separados por segundos, y `email_confirmed_at` un minuto
      después. **El comentario del seed dice por qué**: sin esta columna, la función devolvería NULL en
      local para los cinco usuarios y la columna de pantalla se vería vacía con todo en verde.

- [ ] **Paso 5.** Escribir `supabase/tests/39_primer_acceso.sql`. **9 aserciones**, y el reparto importa:

      | # | Qué afirma | Por qué está |
      |---|---|---|
      | 1 | La función existe con esa firma | Base |
      | 2 | Es `security definer` | Sin esto no lee `auth.users` |
      | 3 | `anon` **no** puede ejecutarla | El `revoke` del paso 3 |
      | 4 | `authenticated` **sí** puede | **Control positivo del 3** — sin él, el `false` no distingue «revocado» de «la sonda pregunta mal» |
      | 5 | Como **admin**, devuelve una fila por miembro de `staff_members` | El caso de uso |
      | 6 | Como **operador**, devuelve **0 filas** | D-11: el operador no ve administración |
      | 7 | Como **alumno**, devuelve **0 filas** | El control que hace válido el 5 |
      | 8 | El valor devuelto **es igual a `confirmation_sent_at`** | Lo que la función existe para hacer |
      | 9 | Y **es distinto de `created_at`, de `email_confirmed_at` y de `last_sign_in_at`** | ⚠ **La aserción que decide.** Con las cuatro fechas separadas en el fixture, una función que devolviera la equivocada falla aquí y sólo aquí |

      **Los roles se montan con el patrón de `33_unit_notes_staff_only.sql:20-21`:**
      `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'` seguido de
      `set local role authenticated`. Los uuid del seed: admin `a0000000-0000-0000-0000-00000000000a`,
      operador `...0000000b`, Ana `...00000001`.

- [ ] **Paso 6.** `npx supabase db reset` y `npx supabase test db`. Esperado: **`Files=32, Tests=192`**
      *(183 + 9)*, `PASS`.

- [ ] **Paso 7.** **Comprobar que la prueba puede fallar**, que es lo que la 38 enseñó: cambiar a mano
      `confirmation_sent_at` por `created_at` en el cuerpo de la función y volver a correr. Esperado:
      **falla la 8 y la 9, y sólo esas**. Deshacer el cambio. **Sin este paso, una prueba verde no dice si
      mide algo.**

**Commit:** `feat(db): migracion 31, funcion del primer acceso del personal`

---

## Tarea 2 · Migración 32: borrar los datos de demo — **la tarea de riesgo**

> ⚠ **Es la única operación de toda la Fase 3 que borra filas de producción**, y va la segunda a
> propósito: si su forma cambia, cambia la tanda entera. **Confirmada por Alejandro el 2026-08-18** con la
> lista de la corrección 6 delante.

**Qué resuelve:** producción arrastra **4 alumnos sin cuenta de Auth y sus 8 reservas**, sembrados el
2026-08-13 como demo. No son personas: son filas que nadie creó pidiendo un magic link.

- [ ] **Paso 1.** Crear la migración: `npx supabase migration new borrar_datos_demo`.

- [ ] **Paso 2.** Escribir la función. **Recibe los ids, no los busca** *(corrección 6)*:

      ```sql
      create or replace function private.borrar_alumnos_demo(p_ids uuid[])
      returns integer
      language plpgsql set search_path = ''
      as $func$
      declare
        v_borrados integer;
      begin
        -- Las reservas PRIMERO: inventory_reservations -> alumnos es NO ACTION,
        -- asi que borrar el alumno con reservas vivas falla, no arrastra.
        -- reservation_status_log si cuelga de la reserva con CASCADE.
        delete from public.inventory_reservations where alumno_id = any(p_ids);

        delete from public.alumnos where id = any(p_ids);
        get diagnostics v_borrados = row_count;

        return v_borrados;
      end;
      $func$;

      revoke all on function private.borrar_alumnos_demo(uuid[]) from public;
      ```

      **`security definer` NO**, al revés que la Tarea 1 y por el mismo motivo que la 28 y la 30: sólo la
      llaman la migración y la prueba, las dos como `postgres`. Sin `definer`, una ejecución inesperada
      correría con los privilegios de quien llama y RLS la pararía.

- [ ] **Paso 3.** La llamada, con **los cuatro ids escritos y cada uno con su correo en un comentario**,
      para que quien lea la migración dentro de un año sepa a quién borró:

      ```sql
      select private.borrar_alumnos_demo(array[
        '4c4a4c5a-ba68-4391-a542-56cc57cdda4a'::uuid,  -- demo.ana.torres@upc.edu.pe
        '64293784-dceb-4972-846f-20ea17fd5383'::uuid,  -- demo.bruno.diaz@upc.edu.pe
        '4e66e2f0-1a58-4656-afe5-4fe2e232b076'::uuid,  -- demo.diego.luna@upc.edu.pe
        '56cb0cd5-53eb-4b13-9d4e-e2588905fd22'::uuid   -- demo.carla.rojas@upc.edu.pe
      ]);
      ```

      **En local esto borra 0 filas y es correcto** *(corrección 8)*: esos ids no existen en el seed.

- [ ] **Paso 4.** Escribir `supabase/tests/40_borrar_datos_demo.sql`. **8 aserciones**, y las tres últimas
      son las que importan:

      | # | Qué afirma |
      |---|---|
      | 1 | La función existe con esa firma |
      | 2 | `authenticated` **no** puede ejecutarla |
      | 3 | Control positivo: `authenticated` **sí** puede ejecutar `create_reservation` |
      | 4 | Devuelve **2** al borrar los dos alumnos del fixture |
      | 5 | Los dos alumnos del fixture ya no están |
      | 6 | Sus reservas ya no están |
      | 7 | Su `reservation_status_log` ya no está — **la cascada, comprobada y no supuesta** |
      | 8 | ⚠ **El alumno ajeno del fixture y sus reservas siguen intactos** |

      **La 8 es la que hace válida la prueba.** Una función con el `where` mal escrito —o sin él— vaciaría
      `alumnos` entero y **las siete primeras seguirían en verde**, porque ninguna mira una fila que no
      debía tocarse. Es exactamente la corrección 4 de la F3-T1, aplicada antes de que la cobre.

      **El fixture monta tres alumnos:** dos «de demo» con reservas y log, y **uno ajeno con reserva**, que
      es el que no se pasa en el array.

- [ ] **Paso 5.** `npx supabase db reset` y `npx supabase test db`. Esperado: **`Files=33, Tests=200`**
      *(192 + 8)*, `PASS`.

- [ ] **Paso 6.** **Comprobar que la prueba puede fallar:** quitar el `where id = any(p_ids)` del segundo
      `delete`. Esperado: **falla la 8, y sólo la 8**. Deshacerlo.

**Commit:** `feat(db): migracion 32, borrar los datos de demo de produccion`

---

## Tarea 3 · La columna del primer correo en `/admin/personal`

**Dónde va, decidido por Alejandro el 2026-08-18:** una columna más en la tabla de personal. Es la pantalla
que ya existe y el público correcto — el layout de `app/(personal)/admin/` exige rol admin antes de llegar.

- [ ] **Paso 1.** `lib/admin/filtros.ts`: `MiembroPersonal` gana `primerAcceso: string | null`, y
      `cruzarPersonal()` **una tercera lista**. Es función pura y tiene pruebas de Vitest en
      `lib/admin/filtros.test.ts`, así que el cruce se prueba ahí y no en la pantalla.

      **`null` tiene dos causas distintas y las dos son reales:** que la función no devolviera fila para
      ese `user_id` —quien mira no es admin—, y que `confirmation_sent_at` sea NULL de verdad. **La columna
      no las distingue y no hace falta que lo haga**, porque quien no es admin no llega a esta pantalla.

- [ ] **Paso 2.** `lib/admin/personal.ts`: `listarPersonal()` añade la llamada
      `supabase.rpc('primer_acceso_personal')` a su `Promise.all`, y pasa el resultado a `cruzarPersonal()`.

      ⚠ **El error se propaga con `throw`, como las otras dos consultas de esa función** *(ver su
      comentario en `lib/admin/personal.ts:75-84`)*: un array vacío por un fallo de RLS o de red se leería
      exactamente igual que «nadie ha recibido nunca un correo», y ésta es la pantalla desde la que se
      arregla quién tiene acceso.

- [ ] **Paso 3.** `components/admin/tabla-personal.tsx`: la columna. **Se llama «Primer correo», no
      «Acceso» ni «Desde»** — las dos existen ya en esa tabla *(`:239-244`)* y una tercera fecha con
      nombre parecido se lee mal. Cuando el valor es `null`, un guion.

      **Nada de estética:** la fase visual la hace otra persona. Se pone la columna con el formato de fecha
      que ya usa la columna «Desde» y no se ajusta nada más.

- [ ] **Paso 4.** Regenerar `lib/database.types.ts` con el stack local:
      `npx supabase gen types typescript --local > lib/database.types.ts`. **La función nueva aparece bajo
      `Functions`**, y sin esto el `.rpc()` no typechequea.

- [ ] **Paso 5.** Pruebas de Vitest para el cruce en `lib/admin/filtros.test.ts`: **3 casos** — con fecha,
      sin fila para ese `user_id`, y con la lista de primer acceso vacía entera. Esperado tras esto:
      **158 pruebas** *(155 + 3)*. **Es una predicción y se cuenta al ejecutar**, no se ajusta después.

- [ ] **Paso 6.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Los cuatro en verde.

- [ ] **Paso 7.** **Caminar la pantalla con el `build`, no con `dev`.** `npm run build` y `npm run start`,
      entrar como admin y mirar `/admin/personal`. Esperado: **dos filas con fecha en «Primer correo»**,
      la del admin y la del operador del seed. ⚠ **Si salen vacías, el paso 4 de la Tarea 1 no se hizo** —
      es la corrección 3, y ésta es la única pantalla donde se ve.

      **Y el control que hace válida esa medición:** la fecha de «Primer correo» tiene que ser **distinta**
      de la de «Desde». Si son iguales, el seed las sembró con el mismo valor y la columna no prueba nada.

**Commit:** `feat(admin): columna del primer correo en la tabla de personal`

---

## Tarea 4 · El alta de operadores, verificada de punta a punta

**No se escribe código** *(corrección 1)*. Esta tarea existe porque el camino nunca se ha caminado con
alguien que no fuera del seed, y porque **el mensaje de error que Alejandro va a encontrarse en producción
es el que ninguna prueba cubre**.

- [ ] **Paso 1.** Con `npm run start` y sesión de admin, en `/admin/personal`, dar de alta a
      **`alumno.b@upc.edu.pe`** como `operator`. Esperado: aparece en la tabla, con su rol y activo.

- [ ] **Paso 2.** Cambiarle el rol a `admin` y volver a `operator`. Esperado: los dos cambios se ven.

- [ ] **Paso 3.** Desactivarlo. **Esperado: sigue en la tabla, marcado como inactivo.** ⚠ **La baja es
      desactivar y NUNCA borrar** — borrar pierde la constancia de que esa persona fue personal y con qué
      rol.

- [ ] **Paso 4.** **Los dos controles negativos, que son lo que esta tarea aporta de verdad:**

      | Se escribe | Esperado |
      |---|---|
      | Un correo `@upc.edu.pe` que no existe en `alumnos` | *«No encontramos esa cuenta. O todavía no pidió nunca su enlace de acceso, o su correo no es @upc.edu.pe.»* |
      | El correo del propio admin, que ya es personal | El mensaje de «ya es personal» de `mensajeDeRechazoPersonal()` |

      **El primero es el que va a salir en producción** con los operadores reales, y por eso se mira con
      los ojos de quien no escribió el sistema: ¿ese texto le dice a Alejandro qué hacer? Si no, se anota
      en la cabecera de correcciones y se decide si se cambia el texto en esta tanda o se aplaza.

- [ ] **Paso 5.** Comprobar que **nadie puede cambiarse el rol a sí mismo**: sobre la propia fila, los
      controles de rol y de desactivar no se pintan *(`TablaPersonal` recibe `miUserId`)*.

- [ ] **Paso 6.** **Escribir el procedimiento de producción** en la propia sección de cierre de la tanda,
      en `ESTADO_Y_PLAN.md`. Tres pasos, y el primero no lo hace Claude ni Alejandro solo:

      1. Cada operador real **pide su magic link y entra una vez** en el sitio de producción. Eso crea su
         fila en `auth.users` y, por el trigger, en `alumnos` con su `auth_user_id`.
      2. Alejandro, como admin, lo da de alta en `/admin/personal` con rol `operator`.
      3. Se verifica por el efecto: `staff_members` pasa de **1** fila a 1 + el número de operadores, y
         `/admin/personal` los lista con su fecha de primer correo.

**Commit:** ninguno si no hubo cambios de código. Si el paso 4 obligó a tocar un texto:
`fix(admin): texto del rechazo de alta de personal`

---

## Tarea 5 · La séptima prueba E2E: la puerta de perfil *(Q-25)*

**Qué cierra:** desde D-79, pulsar «Reservar» con el perfil a medias rebota a `/completar-perfil` con el
destino en la URL. **Eso no lo cubre ninguna de las seis pruebas** —las cuatro specs entran como Ana, que
el seed siembra con `confirmo_facultad = true`— y hoy depende de que alguien se acuerde de caminarlo a
mano. Se comprobó así el 2026-08-18 *(corrección 14 de la F3-T1)*.

- [ ] **Paso 1.** Crear `e2e/perfil.spec.ts`, con **Bruno** —`alumno.b@upc.edu.pe`—, que el seed deja **sin
      confirmar a propósito**. Reusar el arnés de `e2e/apoyo/`.

- [ ] **Paso 2.** El recorrido, en **una sola prueba** y en este orden:

      1. Entra por magic link y **cae en `/catalogo`**, sin formulario por delante *(D-79: quien sólo viene
         a mirar, mira)*.
      2. Abre una ficha y pulsa «Reservar». **Rebota a `/completar-perfil`** con `volver=` llevando el
         destino **codificado**.
      3. El desplegable de carrera llega **con su carrera ya seleccionada** *(corrección 7 de la F3-T1, que
         el `typecheck` no puede ver)*.
      4. Marca la casilla de facultad, guarda, y **vuelve al destino exacto** del que salió.

- [ ] **Paso 3.** ⚠ **Escribir en la cabecera de la spec que deja a Bruno confirmado**, o sea que **la
      prueba exige `db reset` antes de la corrida**. No es una deuda nueva: es Q-26, que ya dice que el
      E2E entero necesita base limpia, y la corrección 8 de la F3-T1 midió que tres corridas seguidas sin
      resetear bajan de 6/6 a 3/6. **Se dice para que el siguiente no lo descubra midiendo.**

- [ ] **Paso 4.** Correr el E2E **con el orden que funciona**: `db reset` → **calentar Auth** → E2E.
      Esperado: **7/7**.

      **Calentar Auth es un paso, no una precaución:** `db reset` para y vuelve a arrancar el contenedor, y
      las dos primeras peticiones de magic link expiran dentro del servicio —504 a los 10,97 s y 500 a los
      8,00 s, medido—. Basta una petición previa que responda.

- [ ] **Paso 5.** Marcar **Q-25 como cerrado** en `ESTADO_Y_PLAN.md`, con la fecha y con lo que la prueba
      cubre **y lo que no**: cubre el rebote, la preselección y el retorno; **no** cubre que la casilla de
      profesor no se marque sola, que se midió a mano por la base.

**Commit:** `test(e2e): la puerta de perfil de la primera reserva`

---

## Tarea 6 · Verificación de punta a punta y cierre

- [ ] **Paso 1.** **Releer la cabecera de correcciones de este plan.** Si alguna corrección de las tareas
      1 a 5 dejó muerto un paso de esta tarea, se arregla aquí y no después.

- [ ] **Paso 2.** `npx supabase db reset`, luego `npx supabase test db`. Esperado: **`Files=33,
      Tests=200`**, `PASS`. **`db reset` tarda 87 s** —medido el 2026-08-18, no los ~40 s que dos briefings
      arrastraron—.

- [ ] **Paso 3.** Los cuatro comandos: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
      Esperado: verde y **158 pruebas de Vitest**.

- [ ] **Paso 4.** El E2E completo, con el orden del paso 4 de la Tarea 5. Esperado: **7/7**.

- [ ] **Paso 5.** **Predecir por escrito las cifras del cierre ANTES de medirlas**, y contarlas después.
      Las que este plan predice:

      | Métrica | Antes | Después |
      |---|---|---|
      | Migraciones | 30 | **32** |
      | Archivos pgTAP | 31 | **33** |
      | Aserciones pgTAP | 183 | **200** |
      | Pruebas de Vitest | 155 | **158** |
      | Pruebas E2E | 6 | **7** |

- [ ] **Paso 6.** Cerrar los documentos **antes** de pasar los comandos de git, nunca después:
      `ESTADO_Y_PLAN.md` *(la fila de la F3-T2 en §6, la bitácora, Q-25 cerrado, y las decisiones nuevas
      D-84 a D-87)*, `PLANES/README.md`, y este archivo con su cabecera de correcciones.

> ### ⚠ Lo que sigue lo ejecuta Alejandro, y el `db push` es un paso aparte
>
> **Un PR mergeado con el CI en verde NO aplica el esquema.** Pasó en la F3-T1 y costó un turno entero: el
> PR #39 estaba mergeado, los tres checks verdes, y la migración 30 **no estaba aplicada**. Se verifica
> **por el efecto y no por el registro de GitHub**.

- [ ] **Paso 7.** Publicar la rama y abrir el PR contra `develop`. **En el cuerpo del PR va escrito que
      queda pendiente el `db push`**, y la lista de lo que la migración 32 borra.

- [ ] **Paso 8.** Sólo con el CI verde: `npx supabase db push`.

- [ ] **Paso 9.** **La verificación contra producción, que es lo único que puede encontrar lo que ninguna
      prueba local encuentra.** Se mide **antes y después** y con controles en las dos direcciones:

      | Sonda | Antes | Después |
      |---|---|---|
      | `alumnos` | 5 | **1** |
      | `alumnos` sin `auth_user_id` | 4 | **0** |
      | `inventory_reservations` | 8 | **0** |
      | `reservation_status_log` | 3 | **0** |
      | `staff_members` | 1 | **1** — no se toca |
      | `auth.users` | 1 | **1** — no se toca |
      | **`products` / `inventory_units` / `inventory_unit_notes`** | 34 / 92 / 68 | **34 / 92 / 68** |
      | `primer_acceso_personal()` como admin | — | **1 fila**, con `2026-08-08 03:55:22.219185+00` |

      **La fila de productos, unidades y notas es el control que descarta el modo de fallo que de verdad
      importa:** haber borrado de más. Sin ella, cuatro ceros no distinguen «se borró la demo» de «se borró
      medio sistema». Y la última fila es lo único que verifica que Auth escribe `confirmation_sent_at`,
      porque **en local ese valor lo pone el seed** *(corrección 3)*.

      **La sonda del primer acceso se hace además con un token de admin real por PostgREST**, no sólo por
      SQL: es la superficie que usa la pantalla. Control negativo: con un token de **alumno**, la misma
      llamada devuelve **0 filas**.

- [ ] **Paso 10.** Si el paso 9 no da lo predicho, **se escribe el número que dé** en la cabecera de
      correcciones, en vez de ajustar la expectativa.

**Commits:** los de cierre documental.

---

## Puntos a verificar

*Lo que no se sabe con certeza, con los dos desenlaces y qué se hace en cada uno.*

| # | Duda | Si A | Si B |
|---|---|---|---|
| **V-1** | ¿`security definer` basta para que la función lea `auth.users`, o hace falta además un `grant usage on schema auth` al owner? | Basta → Tarea 1 tal cual | No basta → la función falla en la prueba 39 con `permission denied for schema auth`. **Se resuelve en la migración**, y se escribe aquí que el esquema `auth` necesitaba el permiso explícito |
| **V-2** | ¿La tabla de personal tiene sitio para una séptima columna sin romperse en pantalla estrecha? | Cabe → Tarea 3 tal cual | No cabe → **se pone igual y no se ajusta la estética**. Se anota y se sigue |
| **V-3** | ¿El arnés de E2E permite entrar como Bruno sin tocar las cuatro specs que entran como Ana? | Sí → Tarea 5 tal cual | No → se extrae la constante del usuario al arnés, **sin cambiar el comportamiento de las cuatro existentes**, y se vuelve a correr el 6/6 antes de añadir la séptima |
| **V-4** | ¿Los 4 alumnos de demo siguen siendo exactamente esos 4 ids el día del `db push`? | Sí → paso 8 tal cual | No → **se para**. Se recuenta, se escribe la lista nueva y se vuelve a confirmar con Alejandro. **Un borrado de producción no se ejecuta contra una lista que caducó** |

---

## Cabecera de correcciones

*(Se rellena al ejecutar. Si al terminar está vacía, es que no se miró.)*

1. **Al `seed.sql` había que sembrarle también `last_sign_in_at`, y el plan sólo nombraba
   `confirmation_sent_at`.** La aserción 9 afirma que el valor devuelto no es ninguna de las otras tres
   fechas, y **en SQL comparar contra NULL no da falso: da NULL**. Con `last_sign_in_at` sin sembrar, esa
   aserción no podía escribirse. Se siembran las cuatro, imitando el orden real de producción: se pide el
   enlace, se manda, se abre 21 s después, y se vuelve a entrar días más tarde.

2. **La aserción 9 cambió de significado al escribirla, y por eso la predicción del paso 7 de la Tarea 1
   falló.** El plan decía que con la función devolviendo `created_at` fallarían «la 8 y la 9». **Falló
   exactamente la 8, y sólo la 8** — medido. El motivo es que la 9 acabó afirmando algo mejor: no que la
   función devuelva lo correcto *(eso ya lo dice la 8)*, sino que **el fixture sembró las cuatro fechas
   distintas**, que es la condición sin la cual la 8 no probaría nada. Una aserción sobre la función y otra
   sobre el fixture; el plan las había pensado como dos sobre la función.

3. ⚠ **El tipo generado miente, y en la dirección peligrosa: `supabase gen types` declara
   `primer_acceso: string`, sin `| null`, sobre una columna que SÍ es nullable.** `confirmation_sent_at`
   es `timestamptz` nullable —medido contra `information_schema`—, pero el generador infiere del
   `returns table (... timestamptz)` que nunca falta. **La capa de aplicación lo declara
   `string | null` a propósito y no confía en el tipo generado**; si alguien lo «simplificara» siguiendo al
   tipo, el `null` real llegaría a `new Date(null)` en la pantalla. Es la familia de instrumento que este
   proyecto ya tiene fichada: **una herramienta contestando con seguridad una pregunta que no le hicieron.**

4. ⚠ **La mutación de la Tarea 2 no falla como el plan predijo, y lo que la para es la propia base.**
   El paso 6 decía que quitando el `where` del segundo `delete` fallaría «la 8, y sólo la 8». **Lo medido:
   la función aborta con `inventory_reservations_alumno_id_fkey`** —`Key (id)=(…d3) is still referenced`—,
   la prueba corta en la cuarta aserción y **las cinco restantes no llegan a correr**: `Bad plan. You
   planned 8 tests but ran 3`. **La `NO ACTION` de la corrección 5 no es sólo una molestia de orden: es una
   red de seguridad real contra un borrado masivo**, y el fixture la activa porque deja al alumno ajeno
   **con una reserva**.

   **Y eso dejaba sin comprobar justo la aserción que justifica la prueba entera**, así que hizo falta una
   **segunda mutación** —quitarle el `where` a los **dos** `delete`, para que nada la abortara—. Con esa:
   **fallan la 4 y la 8, y sólo esas.** La 8 caza el borrado de más, que es su papel. **Una prueba de
   mutación que aborta no prueba que la aserción mida: prueba que algo antes se rompió.**

5. **Hacer obligatorio el tercer parámetro de `cruzarPersonal()` rompió 5 llamadas en
   `lib/admin/filtros.test.ts`, y el plan no lo había previsto.** Es la señal correcta —el tipo obliga a
   pasar la lista en vez de dejarla opcional y silenciosa—, pero significa que la Tarea 3 toca cinco
   llamadas existentes además de añadir tres pruebas. **La predicción de 158 pruebas se cumplió igual**,
   porque las cinco se actualizaron, no se duplicaron.

6. ⚠ **Q-20 es MÁS ANCHO de lo que dice su enunciado, y se descubrió sin buscarlo, caminando la Tarea 4.**
   Q-20 dice «tres diálogos, dos pantallas, **y UN SOLO hash**». Medido el 2026-08-19 en
   **`/admin/personal`** —una **tercera** pantalla— al abrir el **desplegable de rol**, que **no es un
   diálogo**: dos violaciones de CSP con **dos hashes distintos**, el conocido
   `sha256-kAApudxpTi9mfjlC9lC8ZaS9xFHU9/NLLbB173MU7SU=` y uno nuevo,
   `sha256-441zG27rExd4/il+NvIqyL8zFx5XmyNQtE381kSkUJk=`.

   **Esta tanda no lo introdujo:** el Select de rol existe desde la T3B. Lo único que hizo falta fue mirar
   donde nadie había mirado — igual que la T4 de la Fase 2 midió **quince pantallas con cero violaciones**
   y ese resultado sigue siendo cierto, porque midió **pantallas y no interacciones**. **No se arregla
   aquí**: Q-20 está aplazado por decisión de Alejandro y las dos curas conocidas siguen siendo peores que
   la enfermedad. Lo que cambia es su alcance, y eso encarece la cura por hash: **son dos y pueden ser
   más.**

7. **Calentar Auth con un correo del seed consume su cuota de frecuencia.** El primer `POST /otp` respondió
   **HTTP 200 en 459 ms** —contra los 10.970 ms y 8.000 ms que expiraban en frío en la F3-T1, o sea que el
   calentamiento funciona—, y el segundo, a menos de un segundo, **HTTP 429 en 378 ms**. No rompió el E2E
   —entre pruebas pasa tiempo de sobra—, pero **calentar dos veces seguidas con el mismo correo no calienta
   más: agota la ventana.** Una basta.

8. **El E2E no necesitó tocar el arnés, y eso contesta V-3 por la salida A.** `iniciarSesionComo(page,
   email)` ya aceptaba cualquier correo del seed, así que la séptima prueba entra como Bruno sin rozar las
   cuatro que entran como Ana. **7/7 en 1,3 min.**

---

**Desenlace de los cuatro puntos a verificar, medido el 2026-08-19:**

- **V-1 → A.** `security definer` basta: la función lee `auth.users` sin ningún `grant usage on schema
  auth` extra. No hizo falta la salida B.
- **V-2 → A.** La séptima columna cabe. La tabla ya vive dentro de un `overflow-x-auto`, así que no hubo
  nada que rediseñar ni que anotar.
- **V-3 → A.** El arnés ya permitía entrar como Bruno. Es el que salió gratis.
- **V-4 → PENDIENTE, y no por olvido: no se puede contestar en local.** Que los 4 alumnos de demo sigan
  siendo esos 4 ids el día del `db push` **se comprueba contra producción, en el paso 8**, y si la lista
  cambió **se para y se vuelve a confirmar con Alejandro**. La medición que fija la lista es del
  2026-08-19.
