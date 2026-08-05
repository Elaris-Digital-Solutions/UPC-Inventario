# UPC-Inventario

Sistema de reserva y préstamo de equipamiento para alumnos UPC. En migración de React/Vite a Next.js,
reconstruyendo primero la base de datos.

> **Fuente de verdad del estado: [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).**
> Leerlo antes de tocar nada. Contiene las decisiones (D-n), los pendientes (Q-n), el plan por fases y la
> bitácora. Complementos: `ESPECIFICACION_FUNCIONAL.md` describe *qué hace* el sistema, y
> `FASE_1_DISENO.md` *cómo se construye* la base de datos nueva.

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
| Shell | PowerShell 5.1 |

## Estado

Fase 0 cerrada. En curso la **Fase 1: base de datos**, con el diseño aprobado en
`MIGRATION_DOCS/FASE_1_DISENO.md` y dividida en cuatro tandas, **un PR por tanda**:

| Tanda | Contenido |
|---|---|
| 0 | Entorno local: `supabase init`, `config.toml`, `seed.sql`, pgTAP en el CI |
| 1 | Identidad y autorización: `staff_members`, privilegios por columna, RLS completa, trazabilidad |
| 2 | Reglas de reserva: RPC única, `EXCLUDE` anti-solape, máquina de estados, sanciones |
| 3 | Derivados, avisos del linter, pruebas y limpieza de los SQL sueltos |

El código Vite está congelado en el tag `legacy/vite-final` y se borra en la Fase 2; se recupera con
`git show legacy/vite-final:<ruta>`.
