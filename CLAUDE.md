# UPC-Inventario

Sistema de reserva y préstamo de equipamiento para alumnos UPC. En migración de React/Vite a Next.js,
reconstruyendo primero la base de datos.

> **Fuente de verdad del estado: [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).**
> Leerlo antes de tocar nada. Contiene las decisiones (D-n), los pendientes (Q-n), el plan por fases y la
> bitácora. Complementos: `ESPECIFICACION_FUNCIONAL.md` describe *qué hace* el sistema,
> `FASE_1_DISENO.md` *cómo se construye* la base de datos nueva, `FASE_2_DISENO.md` *cómo se construye* la
> aplicación Next.js, y `PLANES/` guarda el desglose paso a paso de cada tanda. **Los planes no se
> reescriben tras ejecutar:** lo que la ejecución desmiente va en una cabecera de correcciones, para no
> borrar lo aprendido.

@AGENTS.md

> `AGENTS.md` lo generó `create-next-app` y son las reglas oficiales de **Next.js 16**, que abre avisando
> «*This is NOT the Next.js you know*» y remite a los docs de la versión instalada en
> `node_modules/next/dist/docs/`. Se conserva porque este proyecto ya pagó ese aviso a mano: el archivo de
> proxy se llama `proxy.ts` y no `middleware.ts` desde la 16, y se descubrió midiendo.

## Cómo se trabaja

**Claude no escribe en el remoto.** Nada de `git push`, PRs, merges, ramas remotas ni protecciones de rama.
Trabaja en local y **entrega los comandos listos para PowerShell**, que ejecuta Alejandro, con una línea
explicando qué hace cada uno.

**Excepción de solo lectura:** `gh run list`, `gh run view --log-failed`, `gh pr checks`, `gh pr view`,
`gh api` sobre endpoints de lectura y `git ls-remote`, para diagnosticar el CI sin copiar y pegar salidas.

**Comandos para PowerShell 5.1:**

- Sin `&&` ni `||`. Encadenar con `;` o `if ($?) { }`.
- **Nada de here-strings `@'...'@`**: al pegarlos en la consola interactiva, el prompt de continuación
  rompe el bloque. Para mensajes de commit largos, varios `-m` seguidos en una sola línea.
- Un comando por línea, cada uno en su propio bloque, para poder copiarlos de a uno.
- Comillas simples cuando el texto lleve `<`, `>` o `*`.

**Los documentos de registro se actualizan sobre la marcha**, al cerrar cada tarea, no al final. Las
decisiones se numeran `D-n` con fecha; lo aplazado entra como `Q-n` con el motivo. Un hallazgo que
contradice la auditoría previa se registra como corrección explícita, no reescribiendo el original.

**Cerrar las ediciones de documentación antes de pasar comandos de git**, nunca después: si no, quedan
cambios sin versionar que bloquean el siguiente `checkout`.

## Ramas

Gitflow: `main` (producción) · `develop` (integración) · `feature/*` `fix/*` `docs/*` `hotfix/*`.
Sin commits directos a `main` ni `develop`; todo entra por PR.

**En el remoto solo viven `main` y `develop`** *(D-29)*. Una rama se borra al mergearla. Lo que no está
integrado se congela antes en un tag anotado, nunca se borra a secas: si la rama es la única referencia
que sostiene un commit, borrarla lo pierde. Tags vivos: `legacy/vite-final` y `legacy/refactor-marzo`.

## Entorno

| | |
|---|---|
| Supabase | Proyecto canónico `zqfkzgdyeqxzgzpxgadi`. **Hiberna**: si un comando falla, reintentar |
| Migraciones | Solo por CLI versionada. Nada de SQL suelto |
| Docker Desktop | Instalado. Debe estar **arrancado** para `supabase db pull` y `supabase start` |
| Stack local | `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo**: falla si se arrancó con `-x`. Pruebas: `npx supabase test db` |
| Shell | PowerShell 5.1 |

## Estado

**Fases 0 y 1 cerradas, y la base de datos está terminada del todo.** La Fase 1 dejó 19 migraciones y 124
aserciones pgTAP; la **tanda 0 de la Fase 2** añadió las dos últimas migraciones del proyecto: **21
migraciones, 135 aserciones en 22 archivos**, las 13 tablas con RLS y políticas. ⚠ **Corregido el
2026-08-07:** la tanda 1 añadió **una migración más, la 22** *(D-32, el enganche de dominio)*, así que hoy
son **22 migraciones y 142 aserciones en 23 archivos**. ⚠ **Corregido otra vez el 2026-08-12:** la T3A
añadió la **migración 23** *(D-38, cierra Q-17)*, así que hoy son **23 migraciones y 147 aserciones en 24
archivos**. ⚠ **Corregido otra vez el 2026-08-15:** la T4 añadió la **migración 24** *(D-55, cierra Q-19)*,
así que hoy son **24 migraciones y 150 aserciones en 25 archivos**, y la 24 **ya está en producción**.
⚠ **Corregido por QUINTA vez el 2026-08-15:** la tanda 5 añadió **dos de una vez**, la **25** *(D-69, cierra
Q-18)* y la **26** *(D-70 y D-71, cierran M-12)*, así que hoy son **26 migraciones y 159 aserciones en 27
archivos**, medido tras un `db reset` y no citado. **Las dos están en local y NO en producción**, donde
siguen las 24: `migration list` da `remote` vacío en las dos últimas, así que **Q-18 y M-12 siguen abiertos
para un alumno real hasta que se empuje la rama.**
Diseño en
`MIGRATION_DOCS/FASE_1_DISENO.md`, ejecutado en cuatro tandas con un PR cada una, más un arreglo posterior.

| Tanda | Contenido | Estado |
|---|---|---|
| 0 | Entorno local: `supabase init`, `config.toml`, `seed.sql`, pgTAP en el CI | ✅ cerrada |
| 1 | Identidad y autorización: `staff_members`, privilegios por columna, RLS completa, trazabilidad | ✅ cerrada |
| 2 | Reglas de reserva: RPC única, `EXCLUDE` anti-solape, máquina de estados, sanciones | ✅ cerrada |
| 3 | Derivados, avisos del linter, pruebas y limpieza de los SQL sueltos | ✅ cerrada |

**Las 19 migraciones están empujadas al remoto** *(D-17, hecho el 2026-08-05)*. `migration list` muestra
`Local` y `Remote` idénticos, el catálogo sobrevivió intacto —34 productos, 92 unidades— y `app_settings`
llegó con su fila. Los tres avisos originales del linter desaparecieron.

**Los advisors, ya con señal limpia, dejaron esto** (verificado tras el arreglo: bajaron de 11 avisos a 5; ⚠ **al 2026-08-15 son siete**, ver abajo):

- ✅ **Seis funciones de trigger estaban expuestas como RPC** en `/rest/v1/rpc/...`, porque `PUBLIC` recibe
  `EXECUTE` por defecto y solo se le revocó a las cinco RPC de verdad. **Cerrado** revocándoselo a las seis.
- ~~**Quedan 5 avisos, y se quedan a propósito:**~~ ⚠ **Corregido el 2026-08-15: son SIETE.** Los seis
  intencionales son las RPC que `authenticated` puede ejecutar —`create_reservation`, `cancel_reservation`,
  `available_units`, `available_slots` y las dos `admin_set_*`—, y eso es el diseño entero: cada una
  comprueba la autorización por dentro. **El séptimo es `auth_leaked_password_protection`**, desactivado, y
  **se cierra por producto y no por configuración** *(D-66)*: el sistema no tiene contraseñas porque el
  cliente lo pidió así, se entra solo por magic link. El interruptor además **no existe en esta cuenta**,
  que está en plan `free`.
- ~~**22 avisos de rendimiento**, todos prematuros: la base nunca ha servido una consulta.~~ ⚠ **Corregido
  el 2026-08-15: son 18, y las dos mitades de la frase eran falsas.** Bajaron solos —los «índice sin usar»
  de siete a tres— y **la base sí ha servido consultas**: `idx_product_images_product_id` lleva 1087 usos.
  **Q-13 se cerró igual, como decisión consciente y sin crear ningún índice**, por un motivo nuevo y mejor:
  la base de producción **nunca ha corrido `ANALYZE` ni autovacuum**, así que el planificador decide sin
  estadísticas y «índice usado» no mide utilidad. **La reevaluación tras el despliegue empieza por correr un
  `ANALYZE`**, y solo después se miran los advisors.

~~**Sembrar el primer admin es tarea de la Fase 2, no de ahora.** `auth.users` está vacío porque nada usa
Supabase Auth todavía; se conecta en la tarea 2.4. Antes de eso, el `insert ... select` no encontraría a
nadie e insertaría cero filas **sin dar error**.~~ ⚠ **Al día 2026-08-07:** la tarea 2.4 ya está hecha —la
tanda 1 conectó Supabase Auth—, así que la siembra ya es posible. Sigue pendiente de ejecutarse, y la
comprobación previa **no** es que la fila exista sino que `email_confirmed_at` no sea `NULL`: la fila de
`auth.users` nace al **pedir** el magic link, no al abrirlo.

## Fase 2 en marcha

**Diseño escrito el 2026-08-06: `MIGRATION_DOCS/FASE_2_DISENO.md`.** ~~Cinco tandas~~ ~~**seis desde el
2026-08-08** *(D-34)*~~ **SIETE desde el 2026-08-11** *(D-37)*, un PR cada una *(D-27)*: **T0** cimientos,
**T1** sesión, **T2A** el alumno que mira, **T2B** el alumno que reserva, ~~**T3** personal~~ **T3A** el
mostrador, **T3B** la administración, **T4** endurecimiento. ~~Decisiones D-19 a D-34~~ **decisiones D-19 a
D-54 al 2026-08-13**; cerrados Q-7, Q-11, Q-12, **Q-15**, **Q-17** y **Q-14** ~~abierto Q-14~~; **abiertos
Q-18 y Q-19, los dos con destino la T4**; **Q-16 respondido y aplazado** —no dan acceso al tenant de Entra
ID, así que Microsoft queda fuera—. ⚠ *Las tres cifras tachadas eran ciertas al escribirlas y se corrigen
fechadas el 2026-08-13, no se borran: **seis de las siete tandas están cerradas**, y solo queda la T4.*
⚠ **Corregido otra vez el 2026-08-15, al cerrar la T4: las SIETE tandas están cerradas y la Fase 2 está
completa.** Las decisiones van de **D-19 a D-68**. Cerrados además **Q-10, Q-13 y Q-19**. **Q-18 sigue
abierto y ya no tiene destino la T4**: pasa a una tanda propia *(D-55)*, porque recortar la lectura de
notas obliga a reverificar la T3A entera.
⚠ **Corregido el 2026-08-15, al cerrar la tanda 5: Q-18 está CERRADO en local** —la **migración 25**,
*D-69*— **y sigue abierto en producción hasta que se empuje la rama.** Y el motivo que lo aplazaba medía de
más por un lado y de menos por otro: **son la T3A y la T3B** las que leen notas, no sólo la T3A, **pero
reverificarlas salió barato y no caro**, porque las dos pantallas viven bajo `app/(personal)/` y la política
nueva no le quita una capacidad a nadie que la use.

**La T2 se partió al escribir su plan** *(D-34)*, que es donde el diseño decía que se decidiría: el
desglose dio **16 tareas**. **Pero el corte no fue por tamaño: la T2A no escribe una sola fila en la base**
—landing, FAQ, catálogo, detalle— y la T2B toca las reglas de negocio —calendario, reserva, sanción, panel,
cancelación, encuesta—. Una tanda que solo lee no puede corromper un dato, y por eso puede probarse contra
el proyecto real sin riesgo. Plan en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_2A.md`.

**Y un hallazgo de esa lectura que vale para toda la fase: el `seed.sql` local no es una muestra de los
datos reales.** `products.featured` vale `true` en 2 de sus 4 productos y **`false` en los 34 de
producción**, así que una vitrina filtrada por esa columna se ve llena en local y **vacía en el sitio real**
—con `typecheck`, `lint`, `build` y hasta el recorrido en navegador en verde, porque el recorrido se hace
contra local—. El seed es una fixture de valores *convenientes*, no *representativos*. **Leer el esquema
dice qué columnas existen; solo consultar dice qué hay dentro.**

**Plan de la T1 escrito el 2026-08-06: `MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md`.** Once tareas y seis
correcciones al diseño. **Dos cambios de alcance decididos al escribirlo:** **Microsoft sale** —el acceso
al tenant de Entra ID de la UPC es poco probable, y queda como **Q-16**—, y **D-32 cierra la puerta del
dominio un paso antes**, con un enganche *Before User Created* que rechaza el registro si el correo no es
`@upc.edu.pe`. **Eso es la migración 22, y contradice a propósito el «ninguna tanda vuelve a tocar SQL»
de la T0:** la frase se corrige fechada al cerrar la tanda, no se borra.

**T0 cerrada el 2026-08-06.** Ocho commits numerados, 0.1 a 0.8. El árbol Vite fuera —121 archivos, 18.633 líneas— y el de
Next.js 16 en pie: App Router, TypeScript **estricto**, Tailwind 4, shadcn 4 sobre Radix, tipos generados,
CI adaptado. Las dos últimas migraciones del proyecto *(D-19, D-20)*: **21 migraciones y 135 aserciones
pgTAP**. ~~**Desde aquí ninguna tanda vuelve a tocar SQL.**~~ ⚠ **Falso desde el 2026-08-07:** D-32 añadió
la migración 22, con la decisión tomada y el costo dicho por delante. ⚠ **Y falso tres veces más:** la T3A
añadió la **23** *(D-38)* el 2026-08-12, y la T4 la **24** *(D-55)* el 2026-08-13. **Van cuatro
desmentidos y la frase sigue sin borrarse**, porque lo que registra no es un hecho sino una intención, y
las tres decisiones que la desmintieron traían el costo dicho por delante.
⚠ **Y falso dos veces más, el 2026-08-15:** la tanda 5 añadió la **25** *(D-69)* y la **26** *(D-70, D-71)*.
**Esta vez la tanda ENTERA existe para tocar SQL** *(D-72)*, y eso es lo que la separa de los desmentidos
anteriores: no se coló una migración dentro de una tanda dedicada a otra cosa. **Van CINCO migraciones
desmintiéndola —22, 23, 24, 25 y 26— y la frase sigue sin borrarse.** ⚠ **Y una corrección al recuento de
esta misma frase, que tampoco se borra:** decía «van cuatro desmentidos» y «falso tres veces más» mientras
enumeraba **dos** migraciones y hablaba a renglón seguido de «las **tres** decisiones» — los tres números no
cerraban entre sí, y las posteriores a la T0 eran **tres: 22, 23 y 24**. **Lo destapó contarlas, no
releerlas**, que es la misma cura que ya funcionó con los comentarios que decían «seis».
Correcciones en
`MIGRATION_DOCS/PLANES/FASE_2_TANDA_0.md`.

**T1 CERRADA y mergeada el 2026-08-08.** PR #21, merge en `895e1625`, **cuatro corridas de CI y las cuatro
verdes**. Está escrito y medido todo el código de la
sesión: `.gitattributes` *(cierra Q-15)*, el `.env` en `NEXT_PUBLIC_` con la clave publicable, la
**migración 22** del enganche de dominio ya en el remoto *(D-32)*, los tres clientes de `@supabase/ssr`,
`proxy.ts` con **lista blanca** —se declara lo público y todo lo demás pide sesión—, `/login` con magic
link, el canje en `/auth/confirm`, `/auth/error`, `/auth/signout`, el reparto por perfil y
`/completar-perfil`. **Cierra P0-3.** El **primer administrador ya está sembrado** en el proyecto real, y el
flujo se probó entero en un navegador de verdad: entrar, completar el perfil y caer en `/admin/inventario`.
Las **48 correcciones** al plan están en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md`. ~~**Siguiente: T2, el
alumno** — landing, catálogo, el calendario, reserva y panel.~~ ⚠ **Corregido el 2026-08-10:** la T2 se
partió en T2A y T2B *(D-34)*; la T2A ya cerró, ver el párrafo siguiente. ~~**Siguiente: la T2B**, cuyo plan
se escribe ahora.~~ ⚠ **Corregido el 2026-08-11:** la T2B también cerró, ver los dos párrafos siguientes.

**T2A CERRADA el 2026-08-10.** Las 7 tareas cerradas, séptima incluida, nueve commits locales en
`feature/fase-2-tanda-2a`, nada empujado todavía. **41 correcciones** al plan en
`MIGRATION_DOCS/PLANES/FASE_2_TANDA_2A.md`. El alumno ya puede ver qué hay —landing, FAQ, catálogo con
sede y detalle—, todo lectura pura: sin escribir una fila y sin tocar SQL. Base intacta en 22 migraciones y
142 aserciones. **Falta empujarla y abrir el PR.** ⚠ **Corregido el 2026-08-12:** esa cifra era la del
cierre de la T2A; la T3A añadió la migración 23, y hoy la base tiene **23 migraciones y 147 aserciones en
24 archivos**.

**T2B CERRADA el 2026-08-11.** Las 9 tareas cerradas, **10 commits locales** en `feature/fase-2-tanda-2b`,
sin empujar. **57 correcciones** al plan en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_2B.md`. El alumno ya
reserva de punta a punta: calendario, reserva, bloqueo por sanción, `/mi-panel`, cancelación y encuesta.
**Vitest estrenó en esta tanda**: de 0 a **43 pruebas**. El `build` pasó de **diez rutas a trece**.
~~**Ninguna migración: la base sigue en 22 migraciones y 142 aserciones.**~~ ⚠ **Corregido el
2026-08-12:** era cierto al cerrar la T2B; la T3A añadió la migración 23, y hoy son **23 migraciones y
147 aserciones en 24 archivos**. ~~**Siguiente: la T3, el personal.**~~ ⚠ **Corregido el 2026-08-12:** la
T3 se partió en T3A y T3B *(D-37)*; la T3A ya cerró, ver el párrafo siguiente.

**T3A CERRADA el 2026-08-12.** Las 10 tareas cerradas. Nueve commits en `feature/fase-2-tanda-3a` al
empezar la sesión de hoy, más el de los textos y el de esta documentación de cierre, ~~sin empujar
todavía~~ ⚠ **empujado el 2026-08-12: PR #29, merge en `6b5dca2`, cuatro corridas de CI y las cuatro
verdes**.
El personal ya atiende el mostrador de punta a punta: tres columnas —«Por entregar», «Activas», «Por
devolver»—, entregar, recibir, las dos faltas con confirmación y sanción real, anotaciones de unidad con su
historial, y un filtro de fecha sobre «Por entregar». **Y la migración 23** *(D-38, cierra Q-17)*: la base
pasa de 22 migraciones y 142 aserciones a **23 migraciones y 147 aserciones en 24 archivos**, medido con
`npx supabase test db`, ~~sin empujar al remoto~~ ⚠ **Corregido el 2026-08-12: la migración 23 YA ESTÁ en
producción**, con las 23 en `local` y `remote` idénticas, y verificada por el efecto en `pg_proc.prosrc`.
**Vitest de 43 pruebas en 3 archivos a 65 en 5.** El `build`
pasó de **trece rutas a catorce**, con las mismas tres estáticas. Abierto **Q-18**: las notas de unidad las
lee cualquier alumno con sesión —es **D-2**, la trazabilidad legible, no un fallo nuevo—, y esta es la
primera tanda que escribe ahí desde una pantalla. Mitigado por texto en los dos diálogos que escriben
notas; arreglarlo de verdad es RLS, y queda para la T4 o una migración propia. ~~**Siguiente: la T3B, la
administración.**~~ ⚠ **Corregido el 2026-08-13: la T3B también cerró, ver el párrafo siguiente.**

**T3B CERRADA el 2026-08-13. Las trece tareas, y con ella la aplicación entera menos el endurecimiento.**
Dieciséis commits en `feature/fase-2-tanda-3b` sobre `develop` (`6b5dca2`), **sin empujar**. El
administrador ya hace su trabajo completo: inventario en tres URL *(D-43)*, alta de producto con sus
unidades, estado de unidad y baja como `retired`, imágenes con **subida firmada desde el servidor**,
`/admin/reservas`, `/admin/dias`, `/admin/estadisticas`, `/admin/personal` y `/admin/ajustes`. El `build`
pasó de **catorce rutas a 23**, tres estáticas, con **ocho colgando de `/admin/`**; Vitest de **65 pruebas
en 5 archivos a 138 en 10**. **La base no se movió: 23 migraciones y 147 aserciones en 24 archivos**, y
esta vez está comprobado al final con `db reset` y `supabase test db` — **D-41 cumplido**. **Cierra P0-4,
el último defecto crítico de la auditoría, y Q-14.** **Catorce decisiones nuevas, D-41 a D-54**, todas
tomadas antes de escribir el código que las aplica. ~~**127 correcciones al plan**~~ ⚠ **Corregido el
2026-08-13: son 145**, en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_3B.md`. El 127 era el recuento de la Task 11
y la Task 12 añadió dieciocho más, así que la frase nació cierta y caducó el mismo día. ~~**Siguiente: la T4, el endurecimiento**, que hereda **Q-18**
—las notas de unidad legibles por cualquier alumno con sesión—, **Q-19** —que la base ate `opening_time` a
`slot_minutes` por su cuenta—, **Q-13** y **Q-10**, el advisor **`auth_leaked_password_protection`**
desactivado, **`supabase/setup-cli@v1` apuntando a Node.js 20**, ya deprecado, y **M-12**, la cancelación
con antelación mínima.~~ ⚠ **Corregido el 2026-08-15: la T4 cerró, ver el párrafo siguiente.** De esa lista
quedan **Q-18** y **M-12**; los demás se cerraron, y **`setup-cli` ya no apunta a Node.js 20** — los dos
workflows usan **`@v3`** desde el 2026-08-15 *(D-64)*.
⚠ **Corregido otra vez el 2026-08-15, al cerrar la tanda 5: de esa lista ya no queda nada.** **Q-18** lo
cierra la **migración 25** *(D-69)* y **M-12** la **26** *(D-70, D-71)*, las dos **en local y todavía no en
producción**.

**T4 CERRADA el 2026-08-15, y con ella la Fase 2 entera: las siete tandas.** Diez tareas, 0 a 9, en
`feature/fase-2-tanda-4` sobre `develop` (`42b26af`), **sin empujar**. **Cierra las tareas 2.10 y 2.11 y
los tres pendientes que heredaba: Q-10, Q-13 y Q-19.** **Catorce decisiones nuevas, D-55 a D-68.** Cabeceras
con **CSP por nonce** *(D-56)* —que cuesta las tres rutas estáticas: el `build` queda en **23 rutas y
cero estáticas**—, la **migración 24** *(D-55)* ya en producción, `npm audit --audit-level=high`
**bloqueante** *(D-57)*, y el E2E de los **cinco flujos críticos** *(D-58)* en **6 pruebas y 4 specs**, en
un workflow propio `e2e.yml` *(D-63)*. Vitest de 138 pruebas en 10 archivos a **152 en 11**; la base en
**24 migraciones y 150 aserciones en 25 archivos**. **Lo que la tanda deja sin hacer, dicho y no
disimulado:** **Q-18** va a una tanda propia, **M-12** es SQL y la tanda tenía una sola migración, **HSTS
se escribió sin poder verificarse por su efecto** porque no hay despliegue, y quedan **dos imágenes de
prueba en la cuenta real de Cloudinary** que la aplicación no puede borrar *(F7)*.

**TANDA 5 CERRADA el 2026-08-15, y con ella los dos únicos pendientes que exigían tocar la base.** No
pertenece a la Fase 2 —que cerró entera con la T4— y **no abre una Fase 3**: se numera T5 por continuidad, y
si el despliegue termina mereciendo fase propia se renombra entonces. **Va antes del despliegue** *(D-72)*
por un motivo medido y no por comodidad: el despliegue no crea el agujero de Q-18 —la API de Supabase ya
está en internet—, lo **puebla**. **Las ocho tareas, 0 a 7.** Seis commits en `feature/tanda-5-sql` sobre
`develop` (`612f9bc`), más el de esta documentación de cierre, **sin empujar**. **Cuatro decisiones, D-69 a
D-72**, y **las dos últimas migraciones del proyecto: la 25** *(D-69, cierra **Q-18** — las notas de unidad
las lee sólo el personal)* **y la 26** *(D-70 y D-71, cierran **M-12** — margen mínimo de cancelación en
`app_settings`, configurable desde `/admin/ajustes` y con el personal exento)*. La base queda en **26
migraciones y 159 aserciones en 27 archivos**; Vitest de 152 a **155 en 11**; el `build` sigue en **23 rutas
y cero estáticas**; el E2E en **6 pruebas y 4 specs**. **Lo que la tanda deja sin hacer, dicho y no
disimulado:** las dos migraciones **están en local y NO en producción**, así que **Q-18 y M-12 siguen
abiertos para un alumno real** hasta que se empuje la rama; y **abre Q-20** —la CSP bloquea el bloqueo de
scroll de todos los diálogos—, aplazado a propósito porque nace de la T4 y las dos curas conocidas son
peores que la enfermedad.

**Y la T5 confirma la lección de método de la T4 en vez de estrenar una: la Task 6 encontró cuatro cosas.**
La que más vale: **su propio plan no podía correr como estaba escrito**, porque los dos Steps que verifican
Q-18 asumen datos que el `seed.sql` no siembra —ni notas ni reservas—, y sin sembrarlos la comparación
habría dado `[]` en las **dos** puntas, que es justo el empate que el Step advierte que no prueba nada.
**Un plan puede ser correcto en la regla que manda comprobar y falso en el mundo donde manda comprobarla.**

**Y la T4 deja tres cosas de método que valen para cualquier tanda futura.** La primera: **una tarea de
verificación que no encuentra nada es sospechosa.** Los dos defectos de la Task 8 aparecieron por **correr**
las cosas, no por leerlas, y en una tarea cuyo plan decía que no escribía código. La segunda: **una prueba
puede pasar por una propiedad del reloj, y cuatro corridas verdes no lo delatan.** El E2E fallaba tres de
seis por una carrera con la navegación *(D-67)*; las cuatro corridas de la Task 4 **variaban el estado de la
base y corrieron todas a la misma hora** — se estaba variando la variable equivocada. La tercera:
**`.gitignore` y la lista de ignorados de ESLint son dos listas y hay que mantener las dos** *(D-68)*, y que
git sí cubriera `playwright-report/` es justo lo que hacía invisibles sus 3031 problemas de `lint`.

**Y un instrumento nuevo que miente, del género de D-33:** `cmd | tail` devuelve el código de salida de
`tail`, no el de `cmd`. Imprimió `EXIT = 0` con tres pruebas en rojo, se cazó, se anotó **y se repitió
idéntico quince minutos después** con el `lint`. **La cura no es prestar más atención, es cambiar el
comando:** el código de salida por redirección a archivo, y los conteos con símbolos no ASCII con `node` y
no con `grep`.

**Y P0-4 enseña algo que el registro no decía: desarmar una trampa no es construir el sustituto.** La Fase
0 le quitó el prefijo `VITE_` a la variable y la fila quedó en «corregido» **ocho días, del 2026-08-04 al
2026-08-12**. Lo que
faltaba —el camino por el que se firma una subida sin exponer el secreto— lo construyó esta tanda. **Y ese
handler es la única excepción del proyecto a «quien autoriza es RLS»:** todo lo demás habla con Postgres,
así que autoriza una política y el cliente es comodidad; **ese archivo habla con Cloudinary y detrás no hay
ninguna política**. Ahí sí, quitar la comprobación del servidor abre un agujero.

**Tres cosas de la T3B que ninguna herramienta podía dar, y que valen para cualquier tanda futura.** La
primera: **un `PATCH` de PostgREST sin filtro no se ejecuta** —`21000`, «UPDATE requires a WHERE clause»—,
y **quien no tiene política recibe `200` con `[]` y ningún error**, así que toda escritura pide la fila con
`.select()` y trata el vacío como fallo. La segunda: **una hora de apertura desalineada deja el calendario
entero irreservable** *(D-54)* —35 franjas ofrecidas y las 35 rechazadas—, y **el contraejemplo acota la
regla a esa sola columna**, porque con el cierre desalineado la última franja se reservó sin problema. La
tercera: **React resetea un `<form action>` cuando la acción devuelve error**, así que un alta rechazada
por una errata vaciaba el formulario entero, con los cuatro comandos en verde.

**«No tiene política» es una convención de este proyecto, no siempre un hecho.** La frase aparece en
`app/(personal)/admin/layout.tsx`, dos veces en `lib/admin/acciones.ts` y hasta en una migración de la Fase
1. En tres de esos cuatro sitios **la política sí existe** y lo que es falso es su `USING`; solo en
`final_satisfaction_surveys` es literalmente cierta. Los dos mecanismos dan el mismo fallo silencioso, así
que **el código está bien y no se toca** — pero quien vaya alguna vez a «crear la política que falta», que
la mire antes.

**El `seed.sql` impedía entrar en local, y ya no.** Faltaban cuatro columnas de token en el `insert into
auth.users` —`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`—, y se
arregló de raíz añadiéndolas con `''`. Son exactamente las columnas de texto de `auth.users` sin default;
las otras cuatro de token llevan `default ''`. **La receta del `update` manual ya no existe en el
proyecto.**

**`.next/` produce falsos en TRES direcciones, no dos.** Ya se sabía que hacía mentir al `typecheck` en
verde y en rojo según qué máquina lo corriera. Ahora se sabe que también miente en el navegador: borrarlo
hizo que la primera carga reportara **504** donde en caliente son **404**, por la compilación en frío de
Turbopack agotando el optimizador de imágenes.

**Y el servidor de desarrollo produce falsos igual que `.next/`, de dos formas distintas** *(Task 15 de la
T2B)*: un proceso viejo que se degrada, con `500` y `Jest worker encountered ... exceeding retry limit`; y
un arranque en frío que no registra una ruta, con `404` sin que Turbopack llegue a escribir `Compiling`.
**Lo dirimió `npm run build`**, que compiló las trece rutas con el código sano. El árbitro no es la
pantalla ni el servidor de desarrollo: es el `build`.

**Lo que hay que verificar de un subagente no es solo si su código funciona, sino si lo que AFIRMA es
cierto.** ~~En esta tanda colaron cuatro hechos falsos en comentarios, con el código funcionando en los
cuatro casos.~~ ⚠ **Corregido el 2026-08-11: esos cuatro eran los de la T2A, y al cerrar la T2B van
TRECE**, con el código funcionando en los trece.

**Y desde la Task 13 el género se desplazó: los cuatro últimos son de ATRIBUCIÓN**, no de dato — el hecho
es cierto y lo inventado es de dónde sale. **Comprobar el dato los confirma**, así que hay que verificar
**el hecho Y la fuente**: son dos comprobaciones distintas y cuestan lo mismo.

⚠ **Corregido el 2026-08-13, al cerrar la T3B: van TREINTA, y ya son OCHO géneros.** A los dos de
arriba —dato inventado y fuente inventada— se sumaron: **sobre-afirmación de alcance** (el cuantificador
estirado sobre un fondo cierto), **falsedad sobre la propia salvaguarda** (dice haber comprobado algo en un
comentario que no lo comprueba), **leer mal el contador de una herramienta** (el `(20/20)` de «Generating
static pages» **no es el número de rutas**), **relación invertida entre dos identificadores que existen**
(«D-54 cierra Q-19», cuando Q-19 se abre), **falsedad sobre la propia acción** (informó de una corrección
que no hizo, con cero llamadas a herramientas), y el último, **coordenadas inventadas sobre una acción que
sí hizo**: cuatro ediciones correctas y los números de línea de dónde quedaron, inventados.

**Así que hay que verificar SEIS cosas por separado, y cuestan lo mismo:** el hecho; la fuente; hasta dónde
llega la afirmación; si el número salió del propio encargo; si la edición está de verdad en el archivo; y
si las coordenadas que cita son ciertas. **La respuesta barata a la última es no pedirle coordenadas** —
que pegue el contenido, y que los números de línea los busque quien verifica.

**Y quien dicta tampoco está a salvo: van VEINTE errores de quien dictaba.** Salen todos de la misma
pregunta al final de cada encargo —*qué no verificaste, y qué te pareció contradictorio*—, que es lo más
barato que hay. Los géneros repetidos: **una contradicción numérica dentro del propio encargo**, que un
subagente fiel copia al pie de la letra sin notar el choque; **un total dictado que no cuadra con la lista
dictada al lado**; **la instrucción de formato pegada al dato en la misma frase**, que termina copiada
dentro del documento en vez de ejecutarse; y **una predicción mal contada**, que hace acusar a la pantalla
de un defecto que no tiene. **Revisar el encargo antes de mandarlo vale tanto como revisar lo que vuelve.**

**Y quien dicta no está a salvo, que es lo que la T2B añade.** Pedirle al subagente que enumere lo que
**no** verificó y si algo del encargo le pareció contradictorio ha destapado **cinco** cosas, y **tres
fueron errores de quien dictaba**: un párrafo que se contradecía consigo mismo, un escenario caducado que
el encargo no mandaba actualizar, y —en la propia tarea de cierre— una predicción atribuida al diseño que
en realidad era del plan. **El mismo género que se persigue en el subagente, cometido al encargarle el
trabajo.**

**Cinco fallos de la T1 pasaron con `typecheck`, `lint` y `build` en verde, y ninguna herramienta avisó:**
el enganche de dominio **desactivado en los contenedores** —`db reset` no aplica el `config.toml`, hacen
falta `stop` y `start`—; `npm run dev` **hablando con producción** por falta de un `.env.local`, que no se
versiona; el canje **cambiando de host** en la redirección y tirando la sesión, porque las cookies se
guardan por host y ni `new URL(request.url).origin` ni `request.nextUrl` lo conservan; y la **plantilla de
correo de fábrica** mandando el enlace a Supabase en vez de a la aplicación; y **los chunks de `/_next/*`
respondiendo `403` a un navegador y `200` a `curl`** *(D-33)*, que dejó la aplicación inutilizable en un
navegador durante ocho tareas en verde. **Son fallos de a qué se conecta el código, no de qué dice.** Lo
único que los encontró fue pedir el flujo entero y mirar el resultado.

**Y el quinto enseña algo que los otros cuatro no:** `curl` no manda cabecera `Origin` y un navegador sí,
así que **la herramienta de prueba era más privilegiada que el usuario final**. Quince sondas HTTP en verde
no significaban que la pantalla funcionara. Cuando se prueba por HTTP, la pregunta es qué manda el cliente
real que la sonda no manda.

**La T0 estuvo a punto de entrar sin CI** *(D-31)*, por una caída mayor de GitHub Actions que duró todo el
2026-08-06. **Acabó teniéndolo entero:** Actions drenó su atrasado hacia las 23:26 UTC y corrió los dos
workflows sobre cada commit, el merge en `develop` incluido. **Diez corridas, las diez verdes.** D-31 se
conserva anotada: el criterio vale para la próxima caída, pero la deuda no llegó a existir. **Q-15 sigue
abierto** y es el primer candidato de la T1: falta un `.gitattributes` con `eol=lf`.

**Estado del árbol tras la T0:** `app/` con el andamio y **ninguna pantalla de negocio** —`/` es un
marcador de posición, la landing es la tarea 2.5—, `components/ui/` con `button` y `card`, `lib/utils.ts`
y `lib/database.types.ts` *(generado, nunca a mano)*. El **lint bloquea** el CI desde esta tanda; la
auditoría de dependencias no, hasta la T4, aunque el árbol nuevo reporta **0 vulnerabilidades**.

**Tres trampas que la T0 midió, y ninguna daba error.** Cuando un paso invoca una herramienta que
*genera* código, hay que comprobar qué escribió:

1. **`shadcn init` pisa los tokens por cascada.** Inyecta su paleta en `oklch` **al final** de
   `globals.css` y gana el último: `--primary` pasó de rojo UPC a gris casi negro con el build en verde.
   De ahí **D-30** —los tokens se escriben en formato de color completo, `hsl(356 95% 45%)`—. También
   enganchó la fuente Geist contra D-23 y se instaló como dependencia de producción.
2. **`create-next-app` genera su propio `CLAUDE.md`.** Copiar con `-Force` habría borrado este archivo.
   Su `AGENTS.md` sí se conserva: son las reglas de Next.js 16 y están enlazadas arriba.
3. **`typecheck` es `next typegen && tsc --noEmit`, no `tsc` a secas.** Next 16 tipa las rutas,
   `LayoutProps` se genera desde `app/` y vive en `.next/`, que está en `.gitignore`. Con `tsc` solo, el
   CI falla en un runner limpio aunque en local pase.

**Lo único que hay que no estropear: la autorización ya vive en la base.** Ningún control del cliente es
un control. El proxy redirige, el layout es comodidad, el componente oculta, y **quien decide es RLS**. Si
quitar una comprobación del cliente abre un agujero, estaba en el sitio equivocado. Corolario verificado:
**la aplicación nunca usa `service_role`** — si un flujo la necesita, no falta una clave, falta una
política.

**Cuatro cosas medidas al diseñar, y las cuatro contradicen lo que uno escribiría de memoria:**

1. **Next.js 16 renombró `middleware.ts` a `proxy.ts`.** Y su documentación dice que el proxy *no* es una
   solución de sesión ni de autorización: solo chequeos optimistas.
2. **Supabase ya no recomienda `getUser()` sino `getClaims()`** para proteger páginas. `getSession()` no
   revalida la cookie: usarlo para decidir es **P0-3 otra vez**, con otro nombre.
3. **El proyecto firma con ES256**, medido contra su JWKS, así que `getClaims()` verifica en local con
   WebCrypto. Con HS256 sería una llamada de red por petición.
4. **El cliente de servidor de `@supabase/ssr` se crea por petición, nunca en el ámbito del módulo.** Un
   singleton lleva las cookies de una petición y termina sirviéndole a un alumno la sesión de otro.

**Al escribir SQL de la Fase 1, seis reglas que costaron un fallo cada una:**

1. A los helpers de política se les **concede** `EXECUTE`; revocarlo rompe la política. **A una función de
   trigger, en cambio, se le revoca**, y el trigger sigue disparando: a un trigger lo invoca el motor,
   mientras que una política se evalúa como el usuario que consulta. Las dos cosas están medidas.
2. Una política que consulta otra tabla protegida necesita un helper `SECURITY DEFINER` o entra en
   recursión.
3. Falta de privilegio lanza `42501`; falta de política deja el `UPDATE` en cero filas **sin error**. Las
   pruebas comprueban el efecto, no la excepción. **Y ampliar un `GRANT` cambia el modo de fallo de quien
   no debería tenerlo:** conceder algo a `authenticated` se lo concede también a los alumnos, así que una
   prueba con `throws_ok` que hoy es correcta puede dejar de serlo mañana.
4. **`SET LOCAL` en una migración no hace nada:** la CLI aplica cada archivo fuera de un bloque de
   transacción. Lo que dependa del `search_path` se cualifica con esquema.
5. Cuando varias reglas rechazan la misma entrada, **contesta la más fundamental**: ordenar mal las
   validaciones de una RPC da mensajes ciertos e inútiles.

El código Vite está congelado en el tag `legacy/vite-final` y se borra en la Fase 2; se recupera con
`git show legacy/vite-final:<ruta>`.
