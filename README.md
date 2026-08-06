# UPC-Inventario

Sistema de reserva y préstamo de equipamiento tecnológico para alumnos UPC. Un alumno reserva un equipo
para una franja horaria en una sede, lo retira en el mostrador y lo devuelve; el personal registra la
entrega y la recepción.

> **El estado del proyecto y el plan viven en
> [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).** Es la fuente de verdad: las
> decisiones numeradas, los pendientes, el avance por fases y la bitácora. Este README solo dice cómo
> levantarlo.

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind 4 · shadcn/ui · Supabase (PostgreSQL 17) ·
`@supabase/ssr`

## Cómo se levanta

Hace falta **Docker Desktop arrancado** para el stack local de Supabase.

```powershell
npm install
```

```powershell
npx supabase start
```

```powershell
npm run dev
```

La aplicación queda en `http://localhost:3000` y Supabase Studio en `http://localhost:54323`.

## Base de datos

Las migraciones son versionadas y se aplican con la CLI. **Nada de SQL suelto.**

```powershell
npx supabase db reset
```

Reaplica las 21 migraciones desde cero y siembra `supabase/seed.sql`. Requiere el stack **completo**:
falla si se arrancó con `-x`.

```powershell
npx supabase test db
```

Corre la batería pgTAP — 135 aserciones sobre las reglas de negocio, RLS y los privilegios. Es la red que
sostiene el modelo de autorización: **quien decide quién puede leer y escribir qué es la base, no la
aplicación.**

## Documentación

| Documento | Qué contiene |
|---|---|
| [`ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md) | Estado, decisiones, pendientes y bitácora |
| [`ESPECIFICACION_FUNCIONAL.md`](./MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md) | Qué hace el sistema |
| [`FASE_1_DISENO.md`](./MIGRATION_DOCS/FASE_1_DISENO.md) | Cómo se construyó la base de datos |
| [`FASE_2_DISENO.md`](./MIGRATION_DOCS/FASE_2_DISENO.md) | Cómo se construye la aplicación |
| [`PLANES/`](./MIGRATION_DOCS/PLANES/) | El desglose paso a paso de cada tanda |
