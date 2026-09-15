# Costos · lo que cuesta tener esto encendido

> **Fuente de verdad del estado del proyecto: [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md).**
> Este documento **no lleva estado ni fases**: es operativo y se consulta **por tarea** —al contratar, al
> renovar, al mirar una factura, al decidir si algo se recorta—. Lo que aquí se decida se registra como
> decisión allí. El **cómo** se configura cada servicio vive en [`DESPLIEGUE.md`](./DESPLIEGUE.md); aquí
> sólo vive **cuánto cuesta y por qué ese plan y no el de abajo**.

⚠ **Todas las cifras están medidas el 2026-08-27 contra la página de precios de cada proveedor, y cada una
lleva su fuente.** Un precio es una afirmación que caduca sola: **antes de usar este documento para pagar,
se re-mide.** Las páginas están enlazadas al final para que re-medir sea un clic y no una búsqueda.

**Todo en USD.** No se convierte a soles aquí a propósito: un tipo de cambio escrito envejece más rápido
que un precio.

---

## 0. El presupuesto, en una tabla

**Perfil elegido: «sin sustos».** Supuesto declarado: **500 alumnos activos al mes**, ~3 ingresos cada uno,
**~1 500 magic links al mes**. El §4 dice **cuándo salta cada proveedor** y qué dispara cada salto.

| Servicio | Plan | USD/mes | ¿Por qué no el de abajo? |
|---|---|---|---|
| **Supabase** | Pro | **25** | El Free **no tiene backups**, guarda **1 hora** de logs y **se pausa a la semana sin uso** |
| **Correo saliente** (Resend) | Pro | **20** | **Obligatorio, no opcional.** El correo integrado de Supabase manda **2 mensajes por hora** |
| **Netlify** | Personal | **9** | El Free es un **tope duro de 300 créditos**: al agotarse, **el sitio se pausa hasta el mes siguiente** |
| **Cloudflare** | Pro | **20** | El Free da **1 regla** de rate limit y **sin ruleset gestionado** de WAF |
| **Cloudinary** | Free | **0** | 25 créditos/mes contra un consumo real de **~1** |
| **Sentry** | Free | **0** | 5 000 errores/mes y 1 usuario; con la app en verde el gasto real es cercano a cero |
| **GitHub Actions** | Free | **0** | **El repositorio es público** —medido, no supuesto— y los minutos son gratis |
| **Dominio** | — | — | **Cotizado aparte**, fuera de este documento |
| | | **74 USD/mes** | **888 USD/año** |

**Y el mismo presupuesto recortado hasta el hueso —sólo lo que sin ello no funciona— son 45 USD/mes**, o
**~27 USD/mes** cambiando Resend por AWS SES. El §5 explica qué se pierde en cada recorte y en qué orden
recortar.

---

## 1. Las dos líneas obligatorias

### 1.1 El correo saliente, y es la línea que más fácil se olvida

⚠ **Es la única partida de la que depende que alguien pueda entrar, y hoy no está contratada.**

Este proyecto **no tiene contraseñas: se entra sólo por magic link**, porque lo pidió el cliente. Eso
convierte el correo en **la puerta**, no en una notificación. Y el servicio de correo integrado de Supabase
—el que está en uso ahora— tiene un límite que su propia documentación escribe así:

> *«Currently this value is set to 2 messages per hour.»*

**Dos por hora.** El tercer alumno que quiera entrar en una hora **no recibe el enlace**. La documentación
de Supabase además desaconseja ese servicio para producción de forma explícita: lo describe como de *mejor
esfuerzo*, sin SLA de entrega ni de disponibilidad, y pensado para explorar, probar plantillas y demos.

**Con 500 alumnos son ~1 500 correos al mes, y el instrumento actual entrega ~1 460 al mes en el mejor caso
teórico —2 × 24 × 30— repartidos de forma que ninguna hora punta funciona.** El primer día de clases es
exactamente cuando falla.

**Tres opciones medidas, y el recorte va en el §5:**

| Opción | USD/mes | Incluye | El pero |
|---|---|---|---|
| **Resend Pro** ✅ | **20** | 50 000 correos, sin tope diario | Ninguno a esta escala |
| Resend Free | 0 | 3 000/mes — **pero 100 al día** | **El tope diario revienta el primer día de clases**, que es el día que importa |
| AWS SES | ~0,15 | $0,10 por cada 1 000 correos | Hay que **pedir la salida del *sandbox*** a mano, y la consola de AWS es otra cosa que mantener |

**Se recomienda Resend Pro** por el perfil elegido: 20 USD compran que nadie tenga que mirar un contador
el día de la matrícula. **AWS SES es honestamente 130 veces más barato** y es el recorte correcto si el
presupuesto aprieta —queda anotado en el §5—.

⚠ **Y lo que cuesta 0 USD pero hay que hacer: los registros DNS del dominio** (SPF, DKIM y DMARC). Sin
ellos el correo sale, pero **cae en spam del alumno**, que es el mismo fallo mudo de siempre: el enlace
existe, nadie lo ve. Depende del dominio, que se cotiza aparte.

### 1.2 Supabase Pro

**No se paga por capacidad. Se paga por tres cosas que el Free no tiene**, y a esta escala la capacidad
sobra en los dos:

| | Free | Pro (25 USD) | Consumo real medido hoy |
|---|---|---|---|
| Tamaño de base | 500 MB | 8 GB | **12 MB** |
| Usuarios activos/mes | 50 000 | 100 000 | **1** (aún sin arrancar) |
| Egress | 5 GB | 250 GB | — |
| **Backups** | **ninguno** | **7 días** | — |
| **Retención de logs** | **1 hora** | **7 días** | — |
| **Pausa por inactividad** | **a la semana** | **no pausa** | — |

**Los tres motivos, en orden de gravedad:**

1. **Cero backups.** Aquí viven los préstamos, las sanciones y quién tuvo qué equipo. Es el registro que la
   universidad tendría que poder mostrar. Sin backup, un `DELETE` mal escrito no tiene vuelta.
2. **Una hora de logs.** Un incidente que se reporta el lunes por la mañana ocurrió el viernes. **Con una
   hora de retención, diagnosticar es imposible por construcción**, y este proyecto ya diagnostica leyendo
   logs.
3. **La pausa a la semana sin actividad.** En marcha no pasaría; **entre ciclos, sí** —vacaciones de verano,
   semana de exámenes sin préstamos— y despausar es manual. El sitio aparece caído sin que nadie haya
   tocado nada.

**El presupuesto no sube por número de alumnos hasta los 100 000 activos al mes**, así que esta línea es
plana para cualquier escala que la UPC pueda tener.

---

## 2. Las dos líneas recomendadas

### 2.1 Netlify — y su plan gratuito cambió de forma, así que la cuenta hay que rehacerla

⚠ **Netlify ya no cobra por ancho de banda y minutos: cobra por créditos, y el plan Free es un tope
duro.** Al agotar los 300 créditos del mes, **el sitio se pausa hasta el mes siguiente**. No se degrada, no
cobra de más: **se apaga**.

| Plan | USD/mes | Créditos |
|---|---|---|
| Free | 0 | 300 — **tope duro** |
| **Personal** ✅ | **9** | 1 000 |
| Pro | 20 | 3 000 |

**Qué gasta créditos, y el reparto es contraintuitivo:**

| Concepto | Costo | Estimación a 500 alumnos |
|---|---|---|
| **Despliegue a producción** | **15 créditos cada uno** | 8 al mes → **120** |
| Ancho de banda | 20 créditos/GB | ~3 GB → **60** |
| Peticiones web | 2 créditos / 10 000 | ~112 000 → **22** |
| Cómputo de funciones | 10 créditos/GB-hora | ~0,3 GB-h → **3** |
| | | **~205 de 300** |

⚠ **La partida más cara no es el tráfico de los alumnos: son los despliegues.** A 15 créditos cada uno,
**veinte despliegues agotan el plan gratuito entero sin que entre un solo visitante**. Una semana de
correcciones seguidas —que es exactamente lo que pasa al lanzar— apaga el sitio.

**Por eso se recomienda Personal a 9 USD:** 1 000 créditos son ~5 veces el consumo estimado, y el margen
está puesto donde está el riesgo real, que es desplegar mucho en pocos días. *Estas cuatro estimaciones
son cálculo sobre las tarifas publicadas, **no medición**: el sitio aún no tiene tráfico. Se re-miden con
la primera factura.*

### 2.2 Cloudflare Pro

**Cloudflare ya está en el plan del despliegue** —vive en `DESPLIEGUE.md` §2— y el gratuito **sí** para lo
volumétrico, que es lo único que Cloudflare para en exclusiva. Lo que compran los 20 USD:

| | Free | Pro (20 USD anual / 25 mensual) |
|---|---|---|
| Reglas de rate limiting | **1** | 2 |
| Reglas de firewall | 5 | 20 |
| **Ruleset gestionado de WAF** | **no** | **sí** |
| Protección L3/L4 | sí | sí |

`DESPLIEGUE.md` §2.3 ya dejó anotado que *«el plan gratuito permite una regla»* y que con una sola hay que
elegir qué ruta proteger. **Ésta es la línea más prescindible de las cuatro** y así está dicha en el §5:
las capas que protegen lo que cuesta dinero —el tope de firmas de Cloudinary, `daily_limit_per_product`,
los topes de texto— **ya viven en la base y no se pagan**.

---

## 3. Lo que se queda en gratuito, con el dato que lo justifica

**Un plan gratuito elegido sin medir el consumo es una factura futura.** Los tres están medidos:

| Servicio | Lo que da gratis | Lo que este proyecto consume | Margen |
|---|---|---|---|
| **Cloudinary** | 25 créditos/mes (1 crédito = 1 GB de almacenamiento, o 1 GB de banda, o 1 000 transformaciones) | **34 productos, 92 unidades** de imágenes | **~25×** |
| **Sentry** | 5 000 errores/mes, 1 usuario, 30 días | Sólo lo que `reportar()` marca como incidente —lo esperado ya está filtrado a propósito— | Amplio |
| **GitHub Actions** | Minutos ilimitados en repositorios **públicos** | 3 workflows, E2E en cada PR | **Ilimitado** |

⚠ **Lo de GitHub está medido, no supuesto:** `gh api repos/Elaris-Digital-Solutions/UPC-Inventario --jq
.private` devuelve **`false`**. El `CLAUDE.md` global manda comprobarlo justo por esto, y aquí el resultado
paga: **el E2E en cada PR —que en un repo privado sería la partida cara del CI— aquí cuesta 0.**

⚠ **Sentry gratuito es de un solo usuario.** El día que el equipo sea dos personas mirando errores, son
**26 USD/mes** más. Hoy no.

---

## 4. Cuándo salta cada proveedor

**Ésta es la tabla que dice en qué momento hay que cambiar de plan, y de qué proveedor.** El §0 dice qué se
paga hoy; ésta dice **qué tiene que pasar para pagar más**. Cada casilla no lleva el precio: lleva **el
momento**, porque un presupuesto se rompe por no ver venir el momento, no por no saber el precio.

*(El proveedor va en filas y el escalón en columnas. La matriz es la misma que si fuera al revés: siete
columnas no caben legibles. ✅ marca dónde está cada línea hoy.)*

| Proveedor | Escalón gratis | Primer escalón de pago | Segundo escalón de pago |
|---|---|---|---|
| **Supabase** | 0 — **sólo hasta abrir en producción**: sin backups, 1 h de logs y se pausa a la semana sin uso | ✅ **Pro, 25** · **Ya saltado.** No lo disparó el volumen: lo disparó **que los datos empiecen a importar** | **Pro + uso**, a **100 000 alumnos activos/mes** o **8 GB** de base *(hoy: 12 MB)*. Luego +$0,00325 por alumno y +$0,125/GB. **A escala UPC no llega nunca** |
| **Resend** | 0 — 3 000 correos/mes, **pero 100 al día**. El tope que importa **es el diario** | ✅ **Pro, 20** · **El día que 100 alumnos pidan enlace en la misma jornada.** Con 1 500 correos/mes el promedio son 50 al día — **y el primer día de clases no es un día promedio** | **35** a partir de **50 000 correos/mes** ≈ **16 000 alumnos** a 3 ingresos cada uno |
| **Netlify** | 0 — **tope duro de 300 créditos**; al agotarlos **el sitio se pausa hasta el mes siguiente** | ✅ **Personal, 9** · **La primera semana de correcciones seguidas.** A 15 créditos por despliegue, **20 despliegues agotan el Free sin que entre un visitante** *(estimado hoy: ~205 de 300)* | **Pro, 20**, al pasar de **1 000 créditos** ≈ **~2 500 alumnos** con 8 despliegues al mes |
| **Cloudflare** | 0 — **1 sola** regla de rate limit y **sin** ruleset gestionado de WAF | ✅ **Pro, 20** *(anual)* · **Cuando haya más de una ruta que proteger.** **No lo dispara el tráfico:** lo volumétrico el Free ya lo cubre | **No hay momento que vigilar:** esta línea **no escala por volumen**. El plan siguiente no se ha medido porque no haría falta |
| **Cloudinary** | ✅ **0** — 25 créditos/mes contra un consumo real de **~1** | **Plus, 99**, al pasar de **25 GB de banda al mes** ≈ **~25 veces el tráfico de imágenes de hoy** | — *(no hay: **salta de 0 a 99 sin escalón intermedio**)* |
| **Sentry** | ✅ **0** — 5 000 errores/mes y **1 usuario** | **Team, 26** · **La segunda persona que mire errores**, o 5 000 errores/mes. **Lo primero llega mucho antes**, y no depende de los alumnos | — |
| **GitHub Actions** | ✅ **0** — **el repositorio es público** *(medido, no supuesto)* | Sólo si **el repositorio pasa a privado**. Ahí el **E2E en cada PR** —que es la política de este proyecto, D-63— deja de ser gratis | — |

**Lo que hay que leer en esta tabla, y son tres cosas:**

1. **Por número de alumnos, el primer salto es Netlify, a ~2 500 activos al mes** —cinco veces el supuesto
   de 500—. **Todo lo demás aguanta más.** El presupuesto de 74 USD es plano hasta ahí.
2. ⚠ **Los dos saltos plausibles del primer año no los dispara el tráfico: los dispara una decisión.**
   **Sentry** salta cuando el equipo sea de dos personas; **GitHub Actions**, si el repositorio se hace
   privado. Ninguno de los dos avisa con un contador subiendo.
3. ⚠ **Cloudinary no sube: salta.** De 0 a 99 USD sin nada en medio. A 25 veces el consumo actual no es un
   riesgo cercano, pero **es la única línea que no da margen de reacción** — vale saber que existe antes de
   que llegue la factura.

## 5. Si hay que recortar, este es el orden

**Los recortes están ordenados por lo que se pierde, de menos a más.** Los dos últimos no son recortes:
son apagar el sistema despacio.

| # | Recorte | Ahorro | Lo que se pierde |
|---|---|---|---|
| 1 | **Cloudflare Pro → Free** | −20 | Ruleset gestionado de WAF y 1 regla de rate limit en vez de 2. Lo volumétrico **sigue cubierto** |
| 2 | **Resend Pro → AWS SES** | −20 | Nada de funcionalidad. Se paga en **trabajo**: pedir salida del sandbox y una consola más que mantener |
| 3 | **Netlify Personal → Free** | −9 | El tope duro vuelve. **Aceptable sólo si se despliega poco**, y lo que lo agota son los despliegues |
| — | | **74 → 25 USD/mes** | **Y Supabase Pro no se toca** |
| ✕ | Supabase Pro → Free | −25 | **Backups, logs y disponibilidad.** No es ahorrar: es aceptar perder los datos de préstamos sin vuelta atrás |
| ✕ | SMTP propio → integrado | −20 | **Nadie puede entrar.** No hay contraseñas: sin correo no hay sistema |

---

## 6. Supuestos declarados, que es lo que este documento no midió

**Van escritos porque un presupuesto sin sus supuestos parece más firme de lo que es.**

1. **500 alumnos activos al mes, 3 ingresos cada uno.** No es una medición: el sistema tiene **1 usuario y
   0 reservas** hoy. Es el supuesto que el §4 permite corregir sin rehacer el documento.
2. **Ocho despliegues a producción al mes.** Sale de la forma de trabajo actual, no de un contador.
3. **Los cuatro renglones de créditos de Netlify son cálculo sobre tarifas publicadas, no medición.** Se
   re-miden con la primera factura real.
4. ⚠ **Impuestos no incluidos, y en Perú pueden no ser cero.** Los servicios digitales del exterior pagados
   con tarjeta de persona natural pueden llevar **IGV del 18 %**, que sobre 74 USD serían ~13 USD más al
   mes. **No verificado aquí** —es materia contable, no técnica—: **preguntar a contabilidad antes de
   cerrar la cifra**, y si se factura con RUC el tratamiento es distinto.
5. **El dominio se cotiza aparte**, por decisión de Alejandro. Los registros DNS del correo dependen de él.
6. **Cloudflare Pro son 20 USD con pago anual y 25 con pago mensual.** La tabla del §0 usa el anual.
7. **No incluye horas de trabajo** de nadie. Es el costo de tener la infraestructura encendida.

---

## 7. Fuentes, para re-medir en un clic

| Línea | Dónde se midió |
|---|---|
| Supabase | <https://supabase.com/pricing> |
| Límite de 2 correos/hora | <https://supabase.com/docs/guides/auth/auth-smtp> |
| Resend | <https://resend.com/pricing> |
| AWS SES | <https://aws.amazon.com/ses/pricing/> |
| Netlify | <https://www.netlify.com/pricing/> |
| Cloudflare | <https://www.cloudflare.com/plans/> |
| Cloudinary | <https://cloudinary.com/pricing> |
| Sentry | <https://sentry.io/pricing/> |
| Repo público | `gh api repos/Elaris-Digital-Solutions/UPC-Inventario --jq .private` → `false` |
| Consumo real de la base | `pg_database_size` contra `zqfkzgdyeqxzgzpxgadi`, 2026-08-27 |
