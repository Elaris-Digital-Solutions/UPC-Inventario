# Fase 3 — Diseño de los cambios acordados con el cliente

> Documento de diseño, escrito el **2026-08-18**. Describe *cómo* se construyen los cinco bloques de
> cambios que el cliente acordó, sobre una Fase 2 ya cerrada y en producción.
> El estado y el avance viven en [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md), que es **la fuente de verdad**;
> las reglas de negocio, en [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md); el esquema
> sobre el que se construye, en [`FASE_1_DISENO.md`](./FASE_1_DISENO.md), y la aplicación, en
> [`FASE_2_DISENO.md`](./FASE_2_DISENO.md).
>
> Se implementa en **cinco tandas** *(D-73)*, cada una con su PR y sus pruebas, igual que la Fase 2.
> El desglose paso a paso de cada una va en [`PLANES/`](./PLANES/) al escribirla, no aquí.

---

## 1. De dónde sale esta fase

De un acuerdo con el cliente, en cinco bloques: imágenes de los equipos en los paneles del personal,
horarios independientes por sede y por operador, un FAQ ampliado, el alta de los operadores con PWA, y un
formulario de datos en la primera reserva.

**Lo que el cliente pidió no es lo que hay que construir, y la diferencia se midió.** Tres de los cinco
bloques ya existían a medias, uno de los datos que pedía guardar ya estaba guardado, y medirlo destapó
**una fuga que ninguno de los cinco bloques mencionaba** —el estado de los equipos se publica dentro de la
descripción, dos días después de haberlo declarado privado del personal—. La sección 2 es esa medición; el
resto del documento diseña sobre ella.

---

## 2. Lo que se midió antes de diseñar

Todo lo de esta sección sale de consultar **el proyecto real** `zqfkzgdyeqxzgzpxgadi` el 2026-08-18, no el
`seed.sql` local — que es justo la trampa nº 1 de este proyecto: los datos locales no son una muestra de
los reales.

### 2.1 Catálogo

| Medida | Valor |
|---|---|
| Productos | **34** |
| Productos sin imagen, sin categoría o sin `description` | **0** |
| Productos con **exactamente una** imagen principal | **34** |
| Longitud de la `description` | de **20** a **242** caracteres |
| `description` que empieza por `Lab: ` | **34 de 34** |
| …con la forma `Lab \| especificación \| Obs` | **16** |
| …con la forma `Lab \| algo`, sin observación | **16** |
| …con la forma `Lab \| Obs`, **sin especificación ninguna** | **2** |
| Partes separadas por ` \| ` | mínimo **2**, máximo **3**. Ninguna con más |
| Salones distintos | **2** |
| Productos en San Miguel · sus unidades | **18** · 46 |
| Productos en Monterrico · sus unidades | **16** · 46 |
| Productos con unidades en **las dos** sedes | **0** |
| Unidades | **92** |
| Sedes activas | **2** — Monterrico y San Miguel |

**La `description` no es una descripción: son tres campos empaquetados en uno**, separados por `|`.

```
Lab: MO-UH40 | O.C 115962 CÁMARA POSTERIOR: 12.0MP…; PANTALLA: 6.5”… | Obs: Correcto funcionamiento, falta bateria
     └─ salón ─┘ └────── especificación del equipo, con orden de compra ──────┘ └──── estado de la unidad ────┘
```

Y **los tres van a sitios distintos**:

| Trozo | Dónde debe vivir | Quién debe verlo |
|---|---|---|
| `Lab: …` | `campuses.salon_devolucion` *(D-77)* | Todos. Es lo que pide el FAQ |
| La especificación | `products.description`, que es su sitio | Todos |
| `Obs: …` | `inventory_unit_notes` | **Solo el personal** |

> ⚠ **El tercer trozo es una fuga, y contradice una decisión ya tomada.** `Obs: falta bateria` es una nota
> de estado del equipo. La **migración 25** *(D-69, cierra Q-18)* hizo `inventory_unit_notes` visible solo
> para el personal el 2026-08-16 — y esa misma clase de información **se sigue publicando** dentro de la
> descripción que ve cualquier alumno, junto con el número de orden de compra. El pendiente se cerró en la
> tabla donde se buscó y quedó abierto en la columna donde nadie miró.
>
> Esto **cambia lo que es la T1**: deja de ser una tanda de texto y pasa a cerrar una fuga. Sigue yendo
> primera, y ahora con más motivo.

**Y el «solo tienen el nombre» del cliente son 16 productos**, contados por lo que les queda al
desempaquetar y no por la longitud del campo entero:

| Al desempaquetar queda | Productos |
|---|---|
| Una especificación de **más de 12 caracteres** | **18** |
| Un trozo de **12 caracteres o menos** —`IPAD`, `MOVIL`, `TABLET`: un tipo, no una descripción— | **14** |
| **Nada**: son los dos `Lab \| Obs` sin especificación | **2** |

**Los 18 no hay que escribirlos, hay que desempaquetarlos.** Los otros **16** son Q-23. El corte de los 12
caracteres **es un umbral elegido, no una propiedad medida**: lo comprobable es que 2 quedan vacíos; que
`IPAD` no sea una descripción lo decide quien lea la ficha.

> ⚠ **Corregido el 2026-08-18, el mismo día, al preparar el plan de la F3-T1.** Este documento decía
> **«12 que solo llevan salón y tipo»** y **«22 que ya tienen especificación»**. Salía de cortar por la
> **longitud del campo entero** —12 filas de 30 caracteres o menos— y no por su **estructura**, que es lo
> que el desempaquetado necesita. Los dos cortes no coinciden. **Y la diferencia no era cosmética: sin
> medir la estructura no se ven los 2 productos con forma `Lab \| Obs`**, a los que un `split` de dos
> partes les habría dejado la observación **como descripción pública** — publicando exactamente lo que
> D-82 existe para esconder. **El número estaba mal y la SQL que salía de él, peor.**

> ⚠ **Dos instrumentos mintieron al medir esto, y se dejan escritos los dos.**
>
> 1. La primera consulta agrupó por salón contra el `join` con `inventory_units` y devolvió **46 y 46**.
>    Eso no son productos: es el `join` abriéndose sobre las unidades —46 + 46 = 92, el total de unidades—.
>    Con `count(distinct p.id)` salen **18 y 16**, que suman 34. **La cifra era correcta y la unidad no.**
> 2. Este documento llegó a decir que la `description` medía **«entre 20 y 28 caracteres»**. Salía de un
>    `order by length asc limit 12`: **describía los doce más cortos y los llamaba los treinta y cuatro.**
>    El máximo real es **242**. Es la trampa de siempre —un promedio que excluye parte de la muestra
>    describe a los supervivientes— y se coló en el repaso del propio documento, no en la ejecución. **La
>    tercera pregunta obligatoria es qué quedó fuera de la muestra, y no se hizo.**

### 2.2 Personas

| Medida | Valor |
|---|---|
| Filas en `staff_members` | **1**, rol `admin` |
| Operadores | **0** |
| Filas en `alumnos` | **5** |
| …de ellas, **sin** `auth_user_id` | **4** |
| Filas en `auth.users` | **1** |
| Reservas en `inventory_reservations` | **8** |
| Encuestas | 0 |
| Carreras | **60** |

**Cuatro de los cinco alumnos y las ocho reservas son datos de demo:** no tienen cuenta de Auth detrás.
Estaban ya anotados como pendientes de borrar, y esta fase los borra porque el bloque del primer correo
deja de tener sentido midiendo fantasmas.

### 2.3 La fecha del primer correo ya existe

En el único usuario real de `auth.users`:

```
created_at            2026-08-08 03:55:22.145453+00
confirmation_sent_at  2026-08-08 03:55:22.219185+00
```

**74 milisegundos de diferencia.** `confirmation_sent_at` es el primer magic link, y lo escribe Supabase
Auth sin que el proyecto haga nada. No hay que guardar esa fecha: hay que **exponerla**, porque el esquema
`auth` no tiene `grant` para `authenticated` y por eso ninguna consulta del proyecto la toca hoy.

Encaja además con la trampa nº 2 ya medida en este proyecto: **la fila de `auth.users` nace al PEDIR el
magic link, no al abrirlo.** Por eso `created_at` y `confirmation_sent_at` son prácticamente el mismo
instante, y por eso el dato que se busca es ese y no `email_confirmed_at`.

### 2.4 Horarios

`app_settings` es **una fila única** —clave primaria booleana con `check (id)`— con un solo `opening_time`
y un solo `closing_time` para todo el sistema. No existe ningún horario por sede, por día de la semana ni
por persona. `staff_members` no tiene sede.

Quién lee hoy esas dos columnas:

| Dónde | Qué hace con ellas |
|---|---|
| `create_reservation` *(migraciones 14 y 20)* | Rechaza la reserva fuera de horario |
| `available_slots` *(migración 21)* | Genera la rejilla de bloques del día |
| `app_settings_horario` *(migración 11)* | `closing_time > opening_time` |
| `opening_time_aligned` *(migración 24, D-54)* | Ata `opening_time` a `slot_minutes` |
| `lib/reservas/consultas.ts` | Se los pasa al calendario del alumno |
| `lib/admin/configuracion.ts`, `acciones.ts`, `ajustes.ts` | La pantalla `/admin/ajustes` |
| `components/admin/formulario-ajustes.tsx` | El formulario |
| `supabase/tests/32_opening_time_aligned.sql` | La prueba de D-54 |

**Y el hallazgo que hace barato el cambio:** las dos RPC ya reciben la sede.

```sql
available_slots   (p_product_id, p_campus_id, p_date,     p_duration_minutes)
create_reservation(p_product_id, p_campus_id, p_start_at, p_duration_minutes, p_purpose)
```

Hoy la reciben y **la ignoran** al leer el horario. El horario por sede cambia el cuerpo de las dos
funciones, **no su firma ni ninguna llamada del cliente**.

### 2.5 El formulario de perfil ya existe, y salta antes de lo que el cliente pidió

`/completar-perfil` ya pide nombre, apellido y carrera. Lo dispara `app/(alumno)/layout.tsx:37` —y
`lib/auth/destino.ts:70` tras entrar—, o sea **al pisar el grupo `(alumno)`**: hoy nadie puede ni mirar el
catálogo sin haberlo llenado. El cliente lo pidió **en la primera reserva**, que es más tarde.

### 2.6 Imágenes y PWA

- La ficha de administración ya tiene galería, y la tarjeta del catálogo ya muestra la foto.
- La **lista** de inventario muestra un número, no una miniatura: `lib/admin/consultas.ts:92` hace
  `imagenes: fila.product_images.length`.
- El **mostrador** no muestra ninguna imagen.
- No hay **ningún** `manifest` en `public/`. La PWA es de cero.

---

## 3. Decisiones nuevas

*Se registran también en `ESTADO_Y_PLAN.md` §5, que es donde viven todas.*

| # | Decisión | Por qué |
|---|---|---|
| **D-73** | La Fase 3 son **cinco tandas**, un PR cada una, ordenadas por riesgo | El mismo criterio de la Fase 2: el conteo dice que algo no cabe, no por dónde cortarlo |
| **D-74** | **La disponibilidad que ve el alumno es la intersección** del horario de la sede con los turnos de sus operadores | El cliente pidió las dos cosas. Si no hay operador, no hay quien entregue el equipo: mostrar el bloque sería mentir |
| **D-75** | Dos tablas nuevas, `campus_hours` y `staff_shifts`. `app_settings.opening_time` y `closing_time` **dejan de decidir** | Una fila única no puede tener dos horarios. La sede es el techo; el turno, quién está dentro |
| **D-76** | La pantalla **distingue «cerrado» de «sin operador asignado»** | Con D-74 las dos se ven igual —un día vacío— y son dos problemas distintos: uno es correcto y el otro es un error de carga |
| **D-77** | El salón de devolución es **de la sede**: `campuses.salon_devolucion` | Medido: hay exactamente 2 salones y ningún producto vive en dos sedes. Ponerlo en el producto sería repetir el mismo texto 34 veces |
| **D-78** | «Solo Facultad de Ingeniería, Ciencias de la Computación e Ingeniería de Software» es **texto del FAQ y control humano por TIU**. El sistema no lo comprueba | Lo pidió así el cliente: la verificación es presencial, en el mostrador. Poner un filtro solo en el desplegable sería un control del cliente, y este proyecto no los tiene |
| **D-79** | El formulario de datos salta **en la primera reserva**, no al entrar | Lo pidió el cliente, y baja la fricción de quien solo viene a mirar |
| **D-80** | La fecha del primer correo **no se guarda: se expone**, con una función `security definer` sobre `auth.users.confirmation_sent_at` | El dato ya existe. Copiarlo a `alumnos` crearía una segunda copia que se puede desincronizar de la primera |
| **D-81** | La **PWA va en tanda propia y al final** | Un *service worker* y una CSP por nonce *(D-56)* fallan juntos, y de una forma que no se parece a nada de lo anterior |
| **D-82** | La `description` de los 34 productos **se desempaqueta en tres**: el salón se tira, la especificación se queda, y las observaciones **se mueven a `inventory_unit_notes`** | El campo empaqueta tres datos con tres públicos distintos, y uno de ellos —el estado del equipo— **ya se había declarado privado del personal** en la migración 25 *(D-69)*. Dejarlo publicado sería mantener abierto un pendiente que la tabla da por cerrado |

---

## 4. Las cinco tandas, y por qué en ese orden

> **Se llaman `F3-T1` a `F3-T5` fuera de este documento.** Ya existe una «tanda 5» —la de SQL que cerró
> Q-18 y M-12 el 2026-08-16— y no es de esta fase. Aquí dentro se abrevian a `T1`…`T5` porque no hay
> ambigüedad; en `ESTADO_Y_PLAN.md` y en `PLANES/` van con el prefijo.

| | Tanda | Contenido | Qué puede romper | SQL |
|---|---|---|---|---|
| **T1** | FAQ, salones y fichas | `campuses.salon_devolucion`, el **desempaquetado** de las 34 descripciones, el FAQ ampliado y el formulario de primera reserva *(D-77, D-78, D-79, D-82)* | **Perder texto al mover las observaciones.** Cierra una fuga, así que no es solo texto | Sí, pequeño |
| **T2** | Operadores y primer correo | Alta de operadores, la función del primer correo, y **borrar los datos de demo** *(D-80)* | El acceso del personal | Sí |
| **T3** | Imágenes en los paneles | Miniatura en la lista de inventario y en el mostrador, lightbox | Una pantalla | No |
| **T4** | Horarios por sede y operador | `campus_hours`, `staff_shifts`, las dos RPC y la pantalla de ajustes *(D-74, D-75, D-76)* | **Impedir reservar** | Sí, el núcleo |
| **T5** | PWA | `manifest`, service worker, botón de instalar y el aviso *(D-81)* | La CSP, y con ella las 15 pantallas | No |

**El orden no es por tamaño, y los dos saltos tienen argumento:**

**T2 va antes que T4** porque D-74 hace que la disponibilidad dependa de los turnos, y hoy hay **0
operadores**. Desplegar T4 primero deja el calendario **vacío en producción y lleno en local**, con
`typecheck`, `lint`, `build` y el recorrido en navegador todos en verde — exactamente la forma de la trampa
nº 1 de este proyecto, que ya se pagó una vez con `products.featured`. T2 no evita el riesgo: lo **puebla**
antes de que exista.

**T5 va sola y al final** porque introduce el primer *service worker* del proyecto sobre una CSP por nonce
que costó reverificar 15 pantallas y tres perfiles. Es un modo de fallo que no comparte con ninguna otra
tanda, así que no se verifica junto con ninguna.

**T3 podría ir en cualquier sitio.** Va tercera porque es la única que no puede romper nada que importe, y
sirve de respiro entre las dos que sí.

---

## 5. T4 · Horarios por sede y operador

Es la tanda difícil de esta fase, igual que el calendario lo fue de la Fase 2. Va aquí entera porque el
resto se explica solo.

### 5.1 El modelo

```sql
create table public.campus_hours (
  campus_id  uuid not null references public.campuses(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  opens_at   time not null,
  closes_at  time not null,
  primary key (campus_id, weekday),
  constraint campus_hours_orden check (closes_at > opens_at)
);

create table public.staff_shifts (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references public.staff_members(user_id) on delete cascade,
  campus_id  uuid not null references public.campuses(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  starts_at  time not null,
  ends_at    time not null,
  constraint staff_shifts_orden check (ends_at > starts_at)
);
```

`campus_hours` tiene la sede y el día como clave primaria: **un horario por día y por sede, y un día sin
fila es un día cerrado.** `staff_shifts` no: un operador puede tener dos turnos partidos el mismo día, y
dos operadores pueden solaparse.

**Lo que ve el alumno es la intersección** *(D-74)*: los tramos de `campus_hours` cubiertos por al menos un
turno de esa sede y ese día. El turno que se pase del techo **se recorta**, no lo levanta.

### 5.2 Lo que se rompe, y qué hay que reconstruir

| Qué | Cómo queda |
|---|---|
| `available_slots` | La rejilla deja de salir de `app_settings` y sale de los tramos de la intersección. Ya recibe `p_campus_id`: **la firma no cambia** |
| `create_reservation` | La validación de horario pasa a ser «`[start, end)` cae dentro de un tramo de la intersección». También ya recibe `p_campus_id` |
| `opening_time_aligned` *(D-54)* | Deja de valer para una fila y pasa a valer **para cada fila de `campus_hours`**. Es la misma regla sobre otra tabla |
| `app_settings_horario` | Se queda, pero ya no gobierna nada. **Se decide en el plan si las dos columnas se borran o se dejan muertas** |
| `/admin/ajustes` | Pierde apertura y cierre; los gana una pantalla nueva de horarios |
| `lib/reservas/consultas.ts` | Deja de leer el horario global |
| `supabase/tests/32_opening_time_aligned.sql` | Se reescribe contra `campus_hours` |

**Lo que NO cambia, y conviene decirlo:** ninguna firma de RPC, ninguna llamada desde el cliente, y ninguna
de las reglas de duración, buffer, ventana móvil o límite diario. Esta tanda cambia *cuándo se puede*, no
*cuánto ni cuántas veces*.

### 5.3 El fallo que se diseña a propósito

Con D-74, **una sede sin turnos cargados no muestra ni un bloque.** Es correcto y es indistinguible de un
error de carga, así que D-76 obliga a separarlos:

- Día **sin fila en `campus_hours`** → «cerrado». Es una decisión del admin.
- Día **con fila pero sin ningún turno que la cubra** → «sin operador asignado». Es un hueco.
- Tramo del día sin cobertura → el bloque no aparece, y el día muestra los tramos que sí.

Y el aviso va en **la pantalla nueva de horarios**, que es donde se corrige: enseña, para los próximos
7 días —la ventana móvil de D-3—, qué sedes tienen horas declaradas sin ningún turno detrás.

**Esto es lo que impide que el fallo se descubra en producción.** Sin ello, la pantalla vacía se lee como
«hoy no hay nada» y nadie pregunta por qué.

---

## 6. T1 · FAQ, salones y fichas

**El salón** *(D-77)*: `campuses.salon_devolucion text`, con `SM-SB608` y `MO-UH40`, que es donde ya
estaban. Se puebla en la misma migración: son dos filas y no es dato de prueba, es dato del servicio — el
mismo criterio por el que la fila de `app_settings` se insertó en su migración y no en `seed.sql`.

**El desempaquetado de las 34 descripciones** *(D-82)*, que es el trabajo de verdad de esta tanda:

1. El trozo `Lab: …` se tira, porque el salón pasa a salir de la sede.
2. El trozo del medio —especificación y orden de compra— se queda en `products.description`. **18 quedan
   con texto sustancial**; los otros **16** son Q-23.
3. El trozo `Obs: …` **se mueve a `inventory_unit_notes`**, que es privado del personal desde la
   migración 25.

**Y hay tres formas, no dos, que es lo que decide la SQL:**

| Forma | Productos | Qué hacer |
|---|---|---|
| `Lab \| especificación \| Obs` | **16** | La parte 2 se queda; la 3 se muda |
| `Lab \| algo` | **16** | La parte 2 se queda; no hay nada que mudar |
| `Lab \| Obs` | **2** | ⚠ La parte 2 **se muda**, y la descripción queda **vacía** |

**La tercera forma es la trampa.** Un `split_part(description, ' \| ', 2)` aplicado a ciegas le deja a esos
dos productos `Obs: …` **como descripción pública**. La condición no es la posición sino el prefijo: **lo
que empieza por `Obs: ` se muda, esté en la parte 2 o en la 3.**

> **La nota se escribe en cada unidad del producto, no una vez.** `inventory_unit_notes` cuelga de
> `unit_id` y la observación venía del producto, así que la misma frase va a las **92 unidades** de los
> productos que la tengan. Es lo que dice el dato: la observación describe el lote, no un ejemplar.
> `created_by` queda **`NULL`** —su `default` es `auth.uid()`, que en una migración no es nadie— y eso es
> honesto: no lo escribió ninguna persona, salió de una hoja de cálculo.

**El orden importa y no es reversible al revés:** primero se copian las observaciones a su tabla, se
comprueba que llegaron, y solo entonces se recorta la columna. Al revés se pierde el texto.

> **La orden de compra se queda con la especificación, a la vista.** Es discutible —un `O.C 115965` es un
> dato interno— pero no es información de estado ni identifica a nadie, y sacarla obligaría a inventar un
> cuarto destino. Se anota como **Q-24** en vez de decidirlo de paso.

**El FAQ**: los salones por sede, el proceso completo de préstamo y devolución, y la aclaración de
Facultad de Ingeniería con las dos carreras y el TIU *(D-78)*. El archivo ya está hecho de una lista de
secciones y preguntas, así que añadir una es añadir una fila.

**El formulario de primera reserva** *(D-79)*: dos columnas nuevas en `alumnos` —`es_profesor boolean` y
`confirmo_facultad boolean`— y el desvío se mueve de `app/(alumno)/layout.tsx` al botón de Reservar. La
carrera es el campo que ya existe: el profesor declara la suya en el mismo desplegable.

> **Por qué la confirmación de facultad se guarda y no es solo un texto:** con D-78 el sistema no
> comprueba nada, así que la casilla es **la única constancia** de que a esa persona se le dijo la regla y
> la aceptó. Guardarla cuesta una columna; no guardarla deja la palabra del mostrador contra la del alumno.

---

## 7. T2 · Operadores, primer correo y limpieza

**El alta de operadores** se hace desde `/admin/personal`, que ya existe. Sigue valiendo lo de siempre: la
baja es desactivar y nunca borrar, y nadie puede cambiarse el rol a sí mismo.

**El primer correo** *(D-80)*: una función `security definer` sobre `auth.users.confirmation_sent_at`, del
mismo estilo que los cuatro helpers de `private`. Devuelve la fecha para las personas que quien pregunta
tiene derecho a ver, y nada más.

**La limpieza**: los **4 alumnos sin cuenta de Auth** y las **8 reservas** de demo. Va en esta tanda y no
en otra porque «la fecha del primer correo de cada usuario» sobre cuatro usuarios que nunca recibieron uno
no es un dato, es ruido.

> ⚠ **Es la única operación de esta fase que borra filas de producción.** Se hace con la lista contada por
> delante, se verifica el recuento antes y después, y se comprueba que el usuario real —el que sí tiene
> `auth_user_id`— sigue en pie. Un `delete` que además arrastra por `on delete cascade` se mira dos veces.

---

## 8. T3 · Imágenes en los paneles

La lista de inventario pasa de contar imágenes a mostrar la principal. `lib/admin/consultas.ts:115` ya pide
`product_images(id)`; hay que pedirle además `secure_url` e `is_main`. El mostrador, que hoy no muestra
ninguna, muestra la del producto de cada reserva.

**El lightbox se abre dentro del panel**, sin salir de la pantalla. Y arrastra **Q-20**, que sigue abierto:
la CSP bloquea el *scroll-lock* de los diálogos. Si el componente de diálogo es el mismo, esta tanda se
encuentra con ese pendiente antes que T5.

---

## 9. T5 · PWA

`manifest`, iconos, service worker, y un botón de instalar visible en la aplicación. El aviso se le muestra
a quien ya recibió su primer correo, que es el dato que expone T2.

**Lo caro no es la PWA: es reverificar la CSP.** La T4 de la Fase 2 la dejó en cero violaciones sobre 15
pantallas y tres perfiles, medido en modo producción y con control positivo. Un service worker introduce
`worker-src` y una petición de instalación que hoy no existen, así que esa verificación **se repite entera**
—con su control positivo— y no se da por heredada.

---

## 10. Pruebas

Lo de siempre, y sin excepciones nuevas:

- **T1, T2 y T4 tocan el esquema**, así que cada migración pasa por el Supabase local en Docker y por
  `npx supabase test db` antes de acercarse al remoto. Hoy hay **26 migraciones y 27 archivos de prueba**.
- **T4 necesita pruebas pgTAP propias** para la intersección: sede sin turnos, turno que se pasa del techo,
  dos turnos solapados, turno en la sede equivocada, y el día sin fila en `campus_hours`.
- **El E2E de reservar hay que volver a correrlo en T4**, porque el calendario cambia de origen de datos.
  Corre en cada PR, que es la desviación declarada de este proyecto.
- **T5 verifica la CSP por el efecto y con control positivo**, no por `curl` —que no aplica CSP—.

---

## 11. Riesgos

| Riesgo | Qué lo contiene |
|---|---|
| **T4 despliega y el calendario queda vacío** | T2 va antes y da de alta operadores reales. Y D-76 hace que la pantalla diga cuál de los dos vacíos es |
| **Las 16 descripciones que faltan no llegan** | T1 desempaqueta las 18 que ya existen y entrega el campo y la pantalla igual. Las 16 son Q-23 y no bloquean la tanda |
| **El desempaquetado publica una observación** | La condición es el prefijo `Obs: `, **no la posición**. Los 2 productos con forma `Lab \| Obs` son el caso que lo distingue, y la prueba pgTAP los cubre por nombre |
| **El desempaquetado pierde las observaciones** | Se copian a `inventory_unit_notes` **antes** de recortar la columna, y se cuenta que llegaron. Nunca al revés |
| **T4 crece** | Es la candidata a partirse, como la T2 y la T3 de la Fase 2. Se decide **escribiendo su plan**, no a mitad de ejecutarlo. El corte natural: la migración y las RPC por un lado, las pantallas de administración por otro |
| **La CSP y el service worker** | T5 va sola, y su verificación es la de la T4 de la Fase 2 repetida entera |
| **El borrado de demo se lleva algo de más** | Recuento antes y después, y el usuario real comprobado en pie |

---

## 12. Pendientes que esta fase abre

| # | Tema |
|---|---|
| **Q-21** | ¿Qué pasa con una reserva ya creada si después se borra o se acorta el turno que la cubría? Las RPC validan al crear, no al llegar el día: hoy la reserva sobreviviría en silencio |
| **Q-22** | `disabled_days` **no tiene `campus_id`**: un día inhabilitado lo está en las dos sedes. Con horarios por sede, ¿debería poder inhabilitarse una sola? |
| **Q-23** | Las descripciones de **16** productos las tiene que dar el cliente: **2** quedan vacíos al desempaquetar y **14** quedan con 12 caracteres o menos —`IPAD`, `MOVIL`—. Los otros **18** salen del desempaquetado *(D-82)*. **El umbral de los 12 caracteres es elegido, no medido**: lo comprobable son los 2 vacíos |
| **Q-24** | El número de orden de compra —`O.C 115965`— se queda en la descripción pública al desempaquetar. ¿Es aceptable, o merece un cuarto destino? |

---

## 13. Terminado cuando

Las cinco tandas están integradas, el calendario del alumno sale de los turnos reales de operadores reales
en las dos sedes, el FAQ dice dónde se devuelve cada equipo, y la PWA se instala sin que la CSP registre
una sola violación.
