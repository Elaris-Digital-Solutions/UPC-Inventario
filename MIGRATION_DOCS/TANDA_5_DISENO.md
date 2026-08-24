# Tanda 5 — Los dos pendientes de SQL

> Documento de diseño, escrito el **2026-08-15**, el mismo día en que cerró la Fase 2. Describe *cómo* se
> cierran **Q-18** y **M-12**, los dos únicos pendientes que exigen tocar la base.
> El estado y el avance viven en [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md); las reglas de negocio, en
> [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md); el esquema sobre el que se construye, en
> [`FASE_1_DISENO.md`](./FASE_1_DISENO.md); la aplicación que lo consume, en
> [`FASE_2_DISENO.md`](./FASE_2_DISENO.md).
>
> **Esta tanda no pertenece a la Fase 2**, que cerró entera con la T4. Se numera **T5** por continuidad con
> las siete tandas anteriores y no abre una fase nueva: si el despliegue termina mereciendo una, se
> renombra entonces y no antes.

---

## 1. Qué resuelve

| Pendiente | Cómo se cierra |
|---|---|
| **Q-18** · las notas de unidad las lee cualquier alumno con sesión | La política `unit_notes_select_auth` pasa de `using (true)` a `using ((select private.is_staff()))`. Es la **migración 25** *(D-69)* |
| **M-12** · cancelación con antelación mínima, hecha a medias por D-38 | `app_settings` gana `min_cancel_minutes`, y `cancel_reservation` compara contra `now() + ese margen`. Es la **migración 26** *(D-70, D-71)* |

**Lo que esta tanda *no* resuelve, dicho por delante:** el despliegue, las dos imágenes de prueba de
Cloudinary *(F7)*, los datos de demostración de producción, y los pendientes viejos **Q-2**, **Q-4**,
**Q-5** y **Q-6**. Ninguno es SQL y ninguno bloquea a esta tanda.

---

## 2. Por qué el SQL va antes del despliegue *(D-72)*

El riesgo de Q-18 **no lo crea el despliegue**. La API de Supabase ya está en internet, y el `200` con la
nota ajena se midió el 2026-08-12 contra el proyecto real, sin ninguna pantalla de por medio. Lo que hace
el despliegue es **poblar** ese riesgo: hoy hay cinco alumnos con JWT y ninguno usa el sistema; el día que
se publique son todos.

Y hay un segundo argumento, de coste y no de riesgo: el despliegue arrastra decisiones que **no están
tomadas** —proveedor, dominio, cómo llegan las variables de entorno—, mientras que los dos pendientes de
SQL están localizados en **dos líneas medidas** de dos archivos que ya existen. Cerrar lo acotado antes de
abrir lo indefinido.

---

## 3. Decisiones

| # | Decisión | Fecha |
|---|---|---|
| D-69 | **Las notas de unidad las lee solo el personal.** `unit_notes_select_auth` pasa a `using ((select private.is_staff()))`. **Acota D-2, no lo revoca:** la trazabilidad sigue siendo legible, y lo que cambia es a quién. El argumento que decide no es el coste sino que **la lectura amplia no sostiene ninguna pantalla**: las dos únicas que leen notas viven bajo `app/(personal)/`, así que el recorte no le quita una capacidad a nadie que la use | 2026-08-15 |
| D-70 | **El margen mínimo de cancelación vive en `app_settings`, con `default 60`.** Una columna octava junto a las siete que ya hay, editable desde `/admin/ajustes`. **Se descartó la constante dentro de la RPC**, que era más barata: el número correcto se elige viendo cómo cancela la gente de verdad, y con la constante cambiarlo exige otra migración. Se descartó también **por producto**, como `buffer_minutes`: no hay ninguna señal de que el margen deba variar por equipo, y **D-39 ya resolvió un caso igual eligiendo no tocar SQL** | 2026-08-15 |
| D-71 | **El margen exime al personal, igual que D-38.** La comprobación va guardada por `not private.is_staff()`. **El motivo está escrito en la migración 23 y sigue valiendo:** el personal ya cancela una reserva `reserved` por `UPDATE` directo gracias a `reservations_update_staff`, y ese `UPDATE` no mira la hora — bloquearlo en la RPC dejaría una puerta más estricta que la otra sobre la misma tabla | 2026-08-15 |
| D-72 | **Los dos pendientes de SQL van antes del despliegue, y juntos en una tanda.** Ver §2 para el orden. **Juntos** porque los dos son SQL sobre objetos ya probados y la reverificación de Q-18 resultó más superficial de lo que D-55 temía; **el precio aceptado** es que un fallo de verificación de uno bloquea el merge del otro | 2026-08-15 |

---

## 4. Migración 25 · Q-18

### 4.1 El cambio

Una política. `drop policy` y `create policy` sobre `inventory_unit_notes`, con el `USING` recortado:

```sql
create policy unit_notes_select_auth on public.inventory_unit_notes
  for select to authenticated
  using ((select private.is_staff()));
```

El `grant select on public.inventory_unit_notes to authenticated` **se queda como está**. El privilegio
decide qué columnas y la política decide qué filas; el personal también es `authenticated`, así que
revocar el `grant` rompería a quien sí debe leer. Y las otras dos políticas de la tabla —
`unit_notes_insert_staff` y `unit_notes_delete_admin`— no se tocan: ya estaban acotadas desde la Fase 1.

### 4.2 Lo que arrastra: cinco avisos que dejan de ser ciertos

La T3A y la T3B mitigaron Q-18 **por texto**. Cinco diálogos le dicen hoy al usuario que cualquiera con
sesión puede leer lo que escriba, y a partir de esta migración **eso es falso**:

| Archivo | Línea |
|---|---|
| `components/mostrador/dialogo-nota.tsx` | 129 |
| `components/mostrador/dialogo-falta.tsx` | 146 |
| `components/admin/dialogo-estado-unidad.tsx` | 112 |
| `components/admin/dialogo-estado-reserva.tsx` | 74 |
| `components/admin/dialogo-agregar-unidad.tsx` | 144 |

**No se borran, se reescriben.** La mitad que sigue siendo cierta —que la nota queda en el historial del
equipo y no se puede deshacer— es la que hace que el operador piense antes de escribir, y esa es
trazabilidad, no una advertencia de privacidad. Lo que se va es la frase que promete una lectura que ya no
ocurre. **Un aviso que dice algo falso es peor que no tenerlo**, porque el próximo lector deja de
comprobarlo.

*(El briefing de esta sesión decía «los dos diálogos». Son cinco, contados el 2026-08-15 con un `grep` del
texto visible y no del comentario. Se anota como corrección, no se reescribe el original.)*

### 4.3 Superficie de lectura, medida

`notasPorUnidad()` —`lib/mostrador/notas.ts:36`— es la **única** consulta a `inventory_unit_notes` del
árbol entero. La consumen **dos** páginas:

- `app/(personal)/mostrador/page.tsx:88` — la T3A
- `app/(personal)/admin/inventario/[id]/page.tsx:41` — **la T3B**

**Esto corrige D-55**, que dice que Q-18 «obliga a reverificar la T3A entera» y se queda corto por una
tanda. Y lo que la corrección abarata más de lo que encarece: las dos páginas viven bajo
`app/(personal)/`, o sea **los dos consumidores ya son personal**, así que ninguna debería cambiar de
comportamiento. La reverificación es más ancha y más superficial de lo previsto.

Las **cuatro** escrituras —`lib/admin/acciones.ts` en `:170`, `:235` y `:298`, y
`lib/mostrador/acciones.ts:284`— no se tocan: `unit_notes_insert_staff` ya exigía personal.

*(Se contaron con un `grep` de `from('inventory_unit_notes')` sobre `lib/`. Una versión anterior de este
párrafo decía «las tres», por haber leído solo dos de los tres sitios de `acciones.ts`. La lectura, en
cambio, sí es una sola: `lib/mostrador/notas.ts:51` es la única línea del árbol que hace `select` sobre
esa tabla, y ese es el hecho del que depende §4.3.)*

---

## 5. Migración 26 · M-12

### 5.1 El cambio

`app_settings` gana una columna, y `cancel_reservation` la lee:

```sql
alter table public.app_settings
  add column min_cancel_minutes smallint not null default 60
    check (min_cancel_minutes between 0 and 1440);
```

El `0` es deliberado y no un descuido del rango: deja **desactivar la regla sin otra migración**, que es
justo la flexibilidad por la que D-70 eligió la columna sobre la constante.

Dentro de la RPC, la comprobación de D-38 —`20260812053243_cancel_before_start.sql:59`— pasa de comparar
contra `now()` a comparar contra `now()` más el margen leído de la fila única. El `create or replace` sin
`drop` delante **conserva los privilegios de la función**, como ya midió
`20260806171347_duration_slot_multiple.sql`.

### 5.2 El riesgo nombrado: el `grant` enumera columnas

```sql
grant update (booking_window_days, opening_time, closing_time, slot_minutes,
              min_duration_minutes, daily_limit_per_product)
  on public.app_settings to authenticated;
```

**Una columna nueva no queda cubierta por ese `grant`.** Si la migración la añade y se olvida de
ampliarlo, `guardarAjustes()` responde **HTTP 403 con `42501`** al mandarla — el mismo modo de fallo que
`lib/admin/acciones.ts:230` ya documenta para `inventory_unit_notes`. **Y ninguna herramienta lo ve
antes:** `typecheck`, `lint` y `build` pasan, porque el privilegio no está en el tipo. La migración amplía
el `grant` en el mismo archivo.

La política `app_settings_update_admin` **no hace falta tocarla**: no enumera columnas, y su `USING` ya
exige admin.

### 5.3 Las dos puertas tienen que decir lo mismo

La base decide con `now()` en el servidor. La pantalla decide con un `ahora: Date` que recibe. **M-12
necesita las dos**, y por motivos distintos:

- Si solo cambia el SQL, el alumno ve un botón que le da error.
- Si solo cambia la pantalla, un `POST` directo a la RPC salta la regla.

`seOfreceCancelar()` —`lib/reservas/agrupar.ts:99`— es hoy una sola expresión con tres términos, y su
cabecera ya explica que vienen de **D-35** y **D-38**. M-12 le añade el cuarto. Sus **cinco** pruebas de
Vitest —`lib/reservas/agrupar.test.ts:88` en adelante— se amplían con el caso del margen y su
contraejemplo.

El camino del ajuste hasta la pantalla del alumno **ya existe y no se inventa**: `ajustesReserva()`
—`lib/reservas/consultas.ts:77`— lee la misma fila del lado del alumno, con la misma forma de traducción
que `leerAjustes()` usa del lado admin.

---

## 6. Superficie completa

| Bloque | Archivos |
|---|---|
| Migraciones | 2 — la 25 y la 26 |
| pgTAP | `supabase/tests/16_traceability.sql` *(Q-18)* · `supabase/tests/31_cancel_before_start.sql` *(M-12)* |
| Avisos de pantalla | los cinco diálogos de §4.2 |
| Tipos | `lib/database.types.ts` — **regenerado, nunca a mano** |
| Ajuste, lado admin | `lib/admin/configuracion.ts` · `lib/admin/acciones.ts` · `components/admin/formulario-ajustes.tsx` |
| Ajuste, lado alumno | `lib/reservas/consultas.ts` · `lib/reservas/agrupar.ts` · `lib/reservas/agrupar.test.ts` · `components/reservas/tarjeta-reserva.tsx` · `app/(alumno)/mi-panel/page.tsx` |

Unos **diecisiete archivos**. La base pasa de **24 migraciones a 26**.

---

## 7. Cómo se verifica

**Las dos migraciones fallan de maneras opuestas, y por eso se prueban distinto.**

**Q-18 quita una capacidad**, así que su riesgo es romper a quien la usaba y su verificación es «nada
cambió» — la más fácil de fingir. Se prueba con las dos puntas en la misma corrida:

- Un JWT de **alumno** contra `inventory_unit_notes` que hoy recibe `200` con filas debe recibir `[]`.
- Un JWT de **operador** debe seguir recibiendo las notas. **Sin este segundo, una política rota que no
  dejara leer a nadie daría el mismo resultado que la correcta.**
- Y las dos pantallas de §4.3 abiertas en un navegador de verdad, porque es lo único que ha encontrado los
  fallos de esta fase.

**M-12 añade una regla**, así que su riesgo es que las dos puertas discrepen:

- La RPC rechaza una cancelación dentro del margen y **acepta** una fuera de él. Las dos mitades, o una
  regla que rechazara todo pasaría por buena.
- La pantalla oculta el botón exactamente en el mismo caso.
- El personal **sí** puede cancelar dentro del margen *(D-71)*.

**Y hay un control que esta tanda hereda gratis:** el E2E de cancelar usa `reservarParaManana()`
—`e2e/cancelar.spec.ts:12`—, así que su reserva está muy por encima de cualquier margen de una hora y
**las seis pruebas deben seguir en verde sin tocarlas**. Si alguna se cae, el margen se está aplicando
donde no debe. *(Verificado el 2026-08-15 leyendo el spec, antes de escribir una línea de SQL.)*

---

## 8. Lo que puede salir mal

| Riesgo | Por qué es real | Cómo se acota |
|---|---|---|
| El `grant` sin ampliar | §5.2. Ninguna herramienta lo ve; la pantalla falla en tiempo de ejecución | Va en el mismo archivo de migración que la columna |
| El aviso de pantalla mintiendo al revés | Cinco textos que hoy dicen la verdad y mañana no | §4.2. Se reescriben en la misma tanda, no en la siguiente |
| `seOfreceCancelar()` y la RPC discrepando | Dos relojes y dos fuentes para el mismo número | El margen sale de `app_settings` en los dos lados, no de una constante duplicada |
| El seed local no representa producción | Ya pasó en la T2A con `products.featured` | Las consultas contra el proyecto real se hacen por MCP, no se deducen del seed |
| «Nada cambió» dado por bueno sin control positivo | Es el modo de fallo propio de Q-18 | §7: las dos puntas en la misma corrida |
