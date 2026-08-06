# UPC-Inventario

Sistema de reserva y préstamo de equipamiento para alumnos UPC. En migración de React/Vite a Next.js,
reconstruyendo primero la base de datos.

> **Fuente de verdad del estado: [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).**
> Leerlo antes de tocar nada. Contiene las decisiones (D-n), los pendientes (Q-n), el plan por fases y la
> bitácora. Complementos: `ESPECIFICACION_FUNCIONAL.md` describe *qué hace* el sistema,
> `FASE_1_DISENO.md` *cómo se construye* la base de datos nueva, y `PLANES/` guarda el desglose paso a
> paso de cada tanda. **Los planes no se reescriben tras ejecutar:** lo que la ejecución desmiente va en
> una cabecera de correcciones, para no borrar lo aprendido.

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

## Entorno

| | |
|---|---|
| Supabase | Proyecto canónico `zqfkzgdyeqxzgzpxgadi`. **Hiberna**: si un comando falla, reintentar |
| Migraciones | Solo por CLI versionada. Nada de SQL suelto |
| Docker Desktop | Instalado. Debe estar **arrancado** para `supabase db pull` y `supabase start` |
| Stack local | `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo**: falla si se arrancó con `-x`. Pruebas: `npx supabase test db` |
| Shell | PowerShell 5.1 |

## Estado

**Fases 0 y 1 cerradas.** La base de datos está terminada y probada: 19 migraciones, 124 aserciones pgTAP
en 20 archivos, las 13 tablas con RLS y políticas. Diseño en `MIGRATION_DOCS/FASE_1_DISENO.md`, ejecutado
en cuatro tandas con un PR cada una, más un arreglo posterior.

| Tanda | Contenido | Estado |
|---|---|---|
| 0 | Entorno local: `supabase init`, `config.toml`, `seed.sql`, pgTAP en el CI | ✅ cerrada |
| 1 | Identidad y autorización: `staff_members`, privilegios por columna, RLS completa, trazabilidad | ✅ cerrada |
| 2 | Reglas de reserva: RPC única, `EXCLUDE` anti-solape, máquina de estados, sanciones | ✅ cerrada |
| 3 | Derivados, avisos del linter, pruebas y limpieza de los SQL sueltos | ✅ cerrada |

**Las 19 migraciones están empujadas al remoto** *(D-17, hecho el 2026-08-05)*. `migration list` muestra
`Local` y `Remote` idénticos, el catálogo sobrevivió intacto —34 productos, 92 unidades— y `app_settings`
llegó con su fila. Los tres avisos originales del linter desaparecieron.

**Los advisors, ya con señal limpia, dejaron esto** (verificado tras el arreglo: bajaron de 11 avisos a 5):

- ✅ **Seis funciones de trigger estaban expuestas como RPC** en `/rest/v1/rpc/...`, porque `PUBLIC` recibe
  `EXECUTE` por defecto y solo se le revocó a las cinco RPC de verdad. **Cerrado** revocándoselo a las seis.
- **Quedan 5 avisos, y se quedan a propósito:** que `authenticated` pueda ejecutar `create_reservation`,
  `cancel_reservation`, `available_units` y las dos `admin_set_*` es el diseño entero. Cada una comprueba la
  autorización por dentro.
- **22 avisos de rendimiento**, todos prematuros: la base nunca ha servido una consulta. Ver Q-13.

**Sembrar el primer admin es tarea de la Fase 2, no de ahora.** `auth.users` está vacío porque nada usa
Supabase Auth todavía; se conecta en la tarea 2.4. Antes de eso, el `insert ... select` no encontraría a
nadie e insertaría cero filas **sin dar error**.

**Siguiente:** Fase 2, la aplicación Next.js.

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
