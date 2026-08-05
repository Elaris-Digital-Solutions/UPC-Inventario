# UPC-Inventario — Estado del proyecto y plan de implementación

> **Documento vivo.** Es la referencia de dónde estamos y qué falta. Se actualiza al cerrar cada fase.
> Complemento: [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md) describe *qué hace* el sistema actual.
> Este documento describe *en qué estado está* y *cómo se reconstruye*.
>
> Última actualización: **2026-08-04**

---

## 1. Resumen ejecutivo

Sistema de reserva y préstamo de equipamiento tecnológico para alumnos UPC. Construido con IA en una etapa
temprana, **nunca lanzado a producción**. Se reconstruye en Next.js conservando el lenguaje visual y las
reglas de negocio, y descartando el código.

**Decisión de orden: la base de datos primero, Next.js después.** La BD es el único componente que la
migración no reemplaza; todo lo que se corrija ahí se capitaliza una sola vez. Además, el arreglo correcto
del agujero de autorización es RLS en Postgres, no un backend — poner la autorización en Next.js dejando RLS
permisivo solo movería el problema, porque PostgREST sigue expuesto.

**Estado general:** ⚠️ No apto para producción. Cinco defectos críticos abiertos, ninguno explotado porque
no hay usuarios ni datos personales todavía.

---

## 2. Inventario del estado actual

### 2.1 Aplicación

| | |
|---|---|
| Stack | React 18.3 · Vite 7.3 · TypeScript 5.8 · Tailwind 3.4 · shadcn/ui · TanStack Query 5.83 · react-router 6.30 · supabase-js 2.97 |
| Despliegue | Netlify (SPA, sin cabeceras de seguridad) |
| Tamaño | 13.402 líneas TS/TSX — 3.954 de shadcn generado, 9.448 propias |
| Build | ✅ Funciona (16 s). Bundle único de 755 kB (223 kB gzip), sin code-splitting |
| Typecheck | ⚠️ `tsc --noEmit` pasa, pero con `strict`, `noImplicitAny` y `strictNullChecks` en `false` |
| Tests | ❌ Uno solo, trivial (`expect(true).toBe(true)`) |
| CI/CD | ❌ Inexistente. No hay `.github/` |
| Git | 50 commits. `main` y `develop` publicadas; trabajo en `feature/*`. Tag `legacy/vite-final` → `f39d2e9`. Rama remota `refactor` huérfana *(Q-7)* |

### 2.2 Base de datos

Proyecto canónico: **`zqfkzgdyeqxzgzpxgadi`** ("Inventario UPC", us-west-1, PostgreSQL 17.6). Hiberna por
inactividad; cualquier consulta lo despierta.

> El `.env` todavía apunta a `jgqebhvbovtpsjoujgdw`, un proyecto **deprecado** al que ya no hay acceso.
> Corregirlo es la tarea 0.1.

| Con datos | Vacías |
|---|---|
| `carreras` 60 · `campuses` 2 · `products` 34 · `product_images` 34 · `inventory_units` 92 · `inventory_unit_notes` 58 · `disabled_days` 2 | `auth.users` · `alumnos` · `inventory_reservations` · `reservation_status_log` · `final_satisfaction_surveys` |

**Catálogo cargado, cero datos transaccionales y cero datos personales.** Esto da libertad total para
rediseñar el esquema sin migrar datos y sin riesgo sobre información de alumnos.

Faltante en la BD:
- ❌ Todas las RPCs que el código invoca. La única función es `fn_update_updated_at`.
- ❌ Todas las políticas de escritura. Las 13 políticas existentes son de lectura, salvo `alumnos_update_own` y las de encuestas.
- ❌ Cualquier noción de rol administrativo.
- ❌ Historial de migraciones (`list_migrations` vacío). El esquema se aplicó pegando SQL a mano.

Avisos del linter de Supabase:

| Nivel | Aviso |
|---|---|
| 🔴 ERROR | Vista `product_availability` con `SECURITY DEFINER` — saltea el RLS de quien consulta |
| 🟡 WARN | `fn_update_updated_at` sin `search_path` fijo |
| 🔵 INFO | `reservation_status_log` con RLS activo y cero políticas |

### 2.3 Deuda documental

23 archivos `.sql` sueltos en `supabase/` con numeración colisionada (**dos `003_`, dos `004_`**) y 11 sin
numerar. Contienen **cinco versiones sucesivas** de la misma RPC de reserva y **tres modelos incompatibles**
de lista negra. No son reconstruibles en orden; sirven solo como referencia arqueológica.

---

## 3. Defectos abiertos

Detalle y evidencia en la auditoría; acá el registro de seguimiento.

### 🔴 Críticos

| ID | Defecto | Ubicación | Estado |
|---|---|---|---|
| P0-1 | Contraseña de administrador `123456789` literal en el código | `src/context/AuthContext.tsx:21` | ✅ Corregido *(0.3)* |
| P0-2 | Autorización de admin únicamente en React; ~40 escrituras privilegiadas salen del navegador con la clave anónima | `Admin.tsx`, `VerificationPanel.tsx`, `ReservationsPanel.tsx`, `AdminDisabledDays.tsx`, `AdminUnits.tsx`, `ProductContext.tsx` | Abierto → Fase 1 |
| P0-3 | Tokens de sesión firmados con la cadena literal `'signature'`, verificación sin validar firma | `src/services/AuthService.ts:224-258` | Abierto → Fase 2 |
| P0-4 | `VITE_CLOUDINARY_API_SECRET` con prefijo `VITE_` en `.env` | `.env` | ✅ Corregido *(0.2)* |
| P0-5 | Registro con `INSERT` directo en `alumnos` como anónimo si falla la RPC | `src/pages/Register.tsx:105-114` | Abierto → Fase 1 |

> **Corrección del diagnóstico de P0-4 (2026-08-04).** La auditoría lo clasificó como crítico por exposición
> del secreto. La verificación posterior lo desmiente en dos puntos: **(a)** ningún archivo de `src/`
> referencia `VITE_CLOUDINARY_API_SECRET`, y Vite solo sustituye las `import.meta.env.VITE_*` citadas
> literalmente — `grep` sobre `dist/` confirma que el secreto **nunca estuvo en el bundle desplegado**;
> **(b)** `.env` nunca se versionó. Los dos commits del historial que tocan `env` son sobre `.env.example`,
> que solo contenía nombres de variable sin valores. **El secreto no se filtró en ningún momento.** Era una
> trampa armada, no detonada: bastaba con que alguien escribiera una referencia para que entrara al bundle.
> Rotar la credencial queda como higiene recomendable, no como respuesta a un incidente.

### 🟠 Altos

| ID | Defecto |
|---|---|
| P1-6 | Doble reserva posible: se consulta y luego se inserta, sin constraint que lo impida |
| P1-7 | Filtro de conflictos invertido: bloquea con `completed`, ignora `active` |
| P1-8 | **El flujo de reserva está roto:** `Number()` sobre un `alumno_id` UUID produce `NaN` (`ReservationOnboarding.tsx:313`) |
| P1-9 | Reglas de negocio en el cliente, saltables llamando a la API |
| P1-10 | Políticas para el rol `public` en vez de `TO authenticated`; `UPDATE` sin `WITH CHECK` |

### 🟡 Deuda

Sin migraciones versionadas · TypeScript no estricto · sin tests · sin CI · sin cabeceras de seguridad ·
código muerto (`server/`, `src/api/supabaseRPC.ts`, `AuthContextNew.tsx`, dependencia `pg`) · Excels de
inventario versionados en la raíz.

---

## 4. Qué se conserva y qué se descarta

| Se conserva | Se descarta |
|---|---|
| **Lenguaje visual** — `src/index.css` + `tailwind.config.ts` (~230 líneas: paleta UPC, Montserrat/Playfair, sombras, gradientes, modo oscuro). Copia directa. | Todo el código de aplicación (~9.400 líneas) |
| **Componentes shadcn** — se regeneran nativos para App Router, no se portan | La capa de datos y autenticación completa |
| **Reglas de negocio** — 20 reglas documentadas en la especificación funcional | Los 23 SQL sueltos (quedan como referencia) |
| **Datos de catálogo** — 34 productos, 92 unidades, 60 carreras, 2 sedes | Las columnas denormalizadas `stock`, `in_stock`, `current_note` |

---

## 5. Decisiones firmes

| ID | Decisión | Fecha |
|---|---|---|
| D-0 | Base de datos primero, Next.js después | 2026-08-03 |
| D-1 | Duración máxima configurable por producto (`products.max_duration_hours`), no constante global | 2026-08-04 |
| D-2 | Dos roles (admin / operador) con cuentas individuales y trazabilidad completa de quién entregó y recibió cada equipo | 2026-08-04 |
| D-3 | Ventana de reserva móvil de 7 días configurable, reemplaza la ventana semanal con corte dominical | 2026-08-04 |
| D-4 | Reconstrucción desde cero en Next.js; el proyecto actual queda congelado como referencia | 2026-08-04 |
| D-5 | **Se mantiene el repositorio `UPC-Inventario`.** Next.js reemplaza al Vite en la raíz; no se abre repo nuevo. Evita duplicar CI, protecciones y secretos, y conserva la continuidad del historial de decisiones | 2026-08-04 |
| D-6 | **El código Vite se congela con el tag anotado `legacy/vite-final`** y se borra del árbol en el primer commit de la Fase 2. **Sin carpeta `legacy/`:** el historial ya es el archivo, y una carpeta muerta obliga a excluirla de lint, typecheck y CI, y vuelve ambiguo qué código está vivo. Recuperación: `git show legacy/vite-final:<ruta>` | 2026-08-04 |
| D-7 | El lint **no bloquea** el CI hasta cerrar la Fase 2. Los 59 errores viven en código que la migración elimina; corregirlos sería trabajo tirado | 2026-08-04 |

---

## 6. Plan de implementación

### Fase 0 · Fundaciones

*Objetivo: dejar el repositorio y el entorno en condiciones de trabajar. No toca el esquema.*

- [x] **0.0** Congelar el código Vite con el tag anotado `legacy/vite-final` → `f39d2e9` *(D-6)*
- [x] **0.1** Apuntar `.env` al proyecto canónico `zqfkzgdyeqxzgzpxgadi`
- [x] **0.2** Quitarle el prefijo `VITE_` al secreto de Cloudinary — *rotación pendiente, ver Q-6*
- [x] **0.3** Eliminar `ADMIN_PASSWORD` del código (`AuthContext.tsx:21`)
- [~] **0.4** Rama `develop` creada, publicada y con la Fase 0 integrada. **Protecciones aplazadas** — ver Q-5
- [x] **0.5** Workflow de CI en `.github/workflows/ci.yml` *(lint y auditoría no bloqueantes, D-7)*
- [ ] **0.6** Enlazar Supabase CLI y generar la migración de línea base del esquema actual
- [x] **0.7** Añadir `*.stackdump` y `*.xlsx` al `.gitignore` (+ `git rm --cached` de los 4 ya versionados)

**Terminado cuando:** un PR a `develop` corre CI en verde y `supabase migration list` muestra la línea base.

**Estado de los pasos del CI al escribir el workflow** (verificado en local, 2026-08-04):

| Paso | Resultado |
|---|---|
| `typecheck` | ✅ exit 0 — pero con `strict`, `noImplicitAny` y `strictNullChecks` en `false` |
| `lint` | ❌ exit 1 — 59 errores, 14 warnings. No bloqueante por D-7 |
| `test` | ✅ 1 test, trivial |
| `build` | ✅ 18,3 s · bundle único de 755 kB |

### Fase 1 · Base de datos

*Objetivo: un esquema correcto, seguro y probado, del que Next.js sea el primer consumidor.*

- [ ] **1.1** Tabla `staff_members` (`user_id`, `role` enum admin/operator, `activo`) *(D-2)*
- [ ] **1.2** Políticas RLS completas: `TO authenticated`, con `USING` y `WITH CHECK` en cada `UPDATE`
- [ ] **1.3** Triggers de trazabilidad: `reservation_status_log.changed_by`, `created_by` en notas y días inhabilitados *(D-2)*
- [ ] **1.4** `products.max_duration_hours` y ventana móvil configurable *(D-1, D-3)*
- [ ] **1.5** RPC única de reserva: rotación justa + buffer + límite diario + feriados + duración por producto
- [ ] **1.6** Constraint de exclusión `EXCLUDE USING gist` contra doble reserva *(corrige P1-6)*
- [ ] **1.7** Máquina de estados de reserva con transiciones válidas *(corrige P1-7)*
- [ ] **1.8** Sanciones unificadas en un único trigger *(resuelve C-2 y C-3)*
- [ ] **1.9** Corregir los avisos del linter: vista `SECURITY DEFINER`, `search_path`, políticas faltantes
- [ ] **1.10** Stock derivado por vista o columna generada; eliminar `stock`, `in_stock`, `current_note`
- [ ] **1.11** Tests de RLS: alumno A contra datos de B; operador contra operaciones de admin

**Terminado cuando:** los advisors de seguridad no reportan nada, los tests de RLS pasan, y toda la lógica de
integridad es inviolable desde un cliente que llame a la API directamente.

### Fase 2 · Aplicación Next.js

*Objetivo: reconstruir la interfaz sobre una BD ya correcta.*

- [ ] **2.1** Proyecto Next.js (App Router) + `@supabase/ssr` + shadcn inicializado
- [ ] **2.2** Copiar tokens de diseño; migrar las fuentes a `next/font`
- [ ] **2.3** Tipos generados con `supabase gen types` (nunca escritos a mano)
- [ ] **2.4** Autenticación: magic link + Microsoft, con middleware de sesión
- [ ] **2.5** Flujo público: landing, FAQ, login, registro
- [ ] **2.6** Flujo del alumno: catálogo, detalle, reserva, panel, encuesta
- [ ] **2.7** Flujo del operador: verificación operativa (entregas y recepciones)
- [ ] **2.8** Flujo del admin: inventario, imágenes, reservas, días inhabilitados, estadísticas
- [ ] **2.9** Subida firmada a Cloudinary desde route handler *(cierra P0-4)*
- [ ] **2.10** Cabeceras de seguridad: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] **2.11** E2E con Playwright sobre los flujos críticos

**Terminado cuando:** los flujos de la especificación funcional se reproducen, con E2E en verde y sin
lógica de autorización en el cliente.

---

## 7. Convenciones de trabajo

### 7.0 Regla operativa: quién toca el remoto

**Claude no ejecuta `git push` ni ninguna operación de GitHub** — ni PRs, ni ramas remotas, ni protecciones
de rama, ni `gh`. Trabaja en local (editar, `git add`, commits locales cuando se le pida) y **entrega los
comandos listos para PowerShell** para que Alejandro los ejecute, con una línea explicando qué hace cada uno.

> Recordatorio de sintaxis: el shell es **PowerShell 5.1**. No admite `&&` ni `||`. Encadenar con `;` o
> `if ($?) { ... }`.

Repositorio remoto: `https://github.com/Elaris-Digital-Solutions/UPC-Inventario.git`

### 7.1 Ramas y pipelines

**Ramas (Gitflow):** `main` (producción) · `develop` (integración) · `feature/*` `fix/*` `hotfix/*` `release/*`.
Sin push directo a `main` ni `develop`; todo entra por PR con checks en verde.

**Pipelines:**

| Disparador | Corre |
|---|---|
| PR → `develop` | install · typecheck · lint · tests unitarios · build · auditoría de dependencias |
| `develop` | lo anterior + tests de integración y RLS + advisors de Supabase como check bloqueante + preview |
| `main` | build · despliegue · smoke tests |

**Pirámide de tests, por orden de prioridad:**
1. **RLS** — un alumno no puede leer ni escribir datos de otro; un operador no puede borrar inventario.
2. **Unitarios** — solapamiento, duración, validación de correo, límite diario, ventana móvil.
3. **Integración** — contra `supabase start` local con seed determinista.
4. **E2E** — registro, ingreso, reserva, cancelación, ciclo de entrega y recepción.

**Migraciones:** toda modificación de esquema entra como migración versionada del CLI. Nada de SQL suelto.

---

## 8. Pendientes de decisión

| # | Tema | Estado |
|---|---|---|
| Q-1 | ¿El buffer de 2 h entre reservas debería ser por producto, como la duración? | Abierto — señalado al decidir D-1 |
| Q-2 | ¿El corte dominical existía a propósito para que el personal cerrara la semana planificada? Si sí, se revierte D-3 | Abierto |
| Q-3 | ¿Qué permisos exactos tiene el operador sobre estadísticas? (¿solo lectura, o nada?) | Abierto |
| Q-4 | ¿Se necesitan notificaciones por correo al alumno? (confirmación, recordatorio, vencimiento) | Propuesto como M-10, sin decidir |
| Q-5 | **Protección de `main` y `develop`** — aplazada el 2026-08-04. `enforce_admins: true` junto a `required_approving_review_count: 1` bloquea los merges propios cuando no hay un segundo revisor, y hace falta confirmar quién tiene rol de admin en la organización. Sin protección el CI corre igual en cada PR; solo deja de ser bloqueante | Aplazado |
| Q-6 | ¿Rotar la credencial de Cloudinary? Ya no es urgente: se verificó que el secreto nunca llegó al bundle ni al historial de git (ver nota bajo P0-4). Queda como higiene | Abierto |
| Q-7 | La rama remota `refactor` sigue huérfana. ¿Se borra o guarda algo aprovechable? | Abierto |

---

## 9. Anexo A · Runbook de comandos (PowerShell)

> **Los ejecuta Alejandro, no Claude** (ver 7.0). Shell: PowerShell 5.1 — sin `&&`, sin `||`.
> Repositorio: `Elaris-Digital-Solutions/UPC-Inventario`

**Restricciones del entorno, verificadas el 2026-08-04:**

1. **`gh` no está instalado.** Todo bloque de este anexo que lo use falla con `CommandNotFoundException`.
   Se instala con `winget install --id GitHub.cli -e`, y hay que **reabrir la terminal** para que tome el
   `PATH`. Mientras tanto, los PR se abren por la web:
   `https://github.com/Elaris-Digital-Solutions/UPC-Inventario/compare/develop...<rama>?expand=1`
2. **Nada de here-strings `@'...'@`.** Al pegarlos en la consola interactiva, el prompt de continuación
   rompe el bloque. Los comandos van **en una sola línea**, y `git commit` usa varios `-m` en vez de un
   mensaje multilínea.
3. **Comillas simples** cuando el texto lleve `<`, `>` o `*`: PowerShell no expande nada dentro de ellas.

### A.1 · Crear y publicar `develop` *(tarea 0.4)*

```powershell
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### A.2 · Proteger `main` y `develop` *(tarea 0.4)*

Requiere `gh auth login` previo.

```powershell
$body = @'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@
$body | gh api --method PUT "repos/Elaris-Digital-Solutions/UPC-Inventario/branches/main/protection" -H "Accept: application/vnd.github+json" --input -
```

Repetir cambiando `/branches/main/` por `/branches/develop/`.

> **Si el repositorio es privado en plan gratuito**, la protección clásica no está disponible por API y el
> comando falla. Alternativa que sí funciona en el plan gratuito: *Settings → Rules → Rulesets* en la web.

### A.3 · Abrir una rama de trabajo

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/fase-0-fundaciones
```

Convención de nombres: `feature/*` para funcionalidad, `fix/*` para correcciones, `hotfix/*` para urgencias
sobre `main`.

### A.4 · Publicar la rama y abrir el PR

```powershell
git push -u origin feature/fase-0-fundaciones
```

Sin `gh`, se abre por la web (comprobar que la base sea `develop`, no `main`):

```powershell
Start-Process 'https://github.com/Elaris-Digital-Solutions/UPC-Inventario/compare/develop...feature/fase-0-fundaciones?expand=1'
```

Con `gh` instalado, en una sola línea:

```powershell
gh pr create --base develop --head feature/fase-0-fundaciones --title 'Fase 0: fundaciones' --body 'Resumen de la fase. Tareas cerradas: 0.1, 0.3, 0.5, 0.7'
```

### A.5 · Verificar estado

```powershell
git status --short --branch
git log --oneline -10
gh pr list --state open
```

### A.6 · Supabase CLI *(tarea 0.6)*

```powershell
npx supabase --version
npx supabase login
npx supabase link --project-ref zqfkzgdyeqxzgzpxgadi
npx supabase db pull baseline --yes
npx supabase migration list
```

> El proyecto **hiberna** por inactividad. Si un comando falla por ese motivo, volver a ejecutarlo: la
> primera llamada lo despierta.
>
> ⚠️ A diferencia de A.1–A.5, **estos flags no están verificados**: la CLI de Supabase cambia entre versiones.
> Confirmar con `npx supabase db pull --help` antes de ejecutar y ajustar el bloque.

---

## 10. Bitácora

| Fecha | Hito |
|---|---|
| 2026-08-03 | Auditoría integral. Se detectan los dos proyectos Supabase y se define el orden BD → Next.js |
| 2026-08-04 | Especificación funcional completa por ingeniería inversa. Decisiones D-1, D-2, D-3, D-4 |
| 2026-08-04 | **Fase 0.** Decisiones D-5, D-6, D-7. Tag `legacy/vite-final` publicado; `develop` creada. Cerradas 0.0–0.3, 0.5, 0.7. P0-1 corregido; **P0-4 reclasificado tras verificar que el secreto nunca se filtró**. Protecciones de rama aplazadas *(Q-5)*. Queda 0.6 |
| 2026-08-04 | `feature/fase-0-fundaciones` mergeada a `develop` (`5359770`). `main` intacta en `f39d2e9`: la migración no la toca hasta que haya algo desplegable |
