-- H-1 de la auditoria del 2026-08-23: ninguna columna de texto tenia tope.
--
-- EL AGUJERO, dicho con precision. Postgres acepta ~1 GB en una columna `text`.
-- Antes de esta migracion, las 25 columnas `text` del esquema no tenian ni una
-- restriccion de longitud: de los 20 CHECK que habia, todos eran rangos
-- numericos o comprobaciones de orden -- ninguno media texto. Un alumno CON
-- SESION LEGITIMA podia guardar un `comments` de 500 MB en su encuesta.
--
-- Y NO ES UN FALLO DE RLS, que es lo que lo hace facil de pasar por alto: el
-- atacante escribe en SU PROPIA fila, que es exactamente lo que la politica le
-- permite. RLS decide QUE FILAS, nunca cuanto pesa cada una. Ninguna politica
-- de este proyecto podia haberlo evitado, por bien escrita que estuviera.
--
-- ES ASIMETRICO, y por eso es el DoS mas barato del sistema: al atacante le
-- cuesta una peticion y al proyecto le cuesta disco, memoria y tiempo de render.
-- El panel del mostrador lee `purpose` de todas las reservas del dia; una sola
-- de 100 MB revienta esa pantalla PARA EL PERSONAL, no para quien la escribio.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DE DONDE SALE CADA NUMERO. Ninguno es redondo por gusto: sale de la pantalla
-- que rellena el campo, con margen para que nadie normal lo toque nunca.
--
--   nombre/apellido ....  80 - un nombre peruano compuesto no pasa de 40.
--   purpose ............ 120 - los seis valores de MOTIVOS (lib/reservas/
--                              motivos.ts); el mas largo es "Actividad
--                              extracurricular", 25 caracteres. El tope NO
--                              sustituye a esa lista: la lista es regla de la
--                              aplicacion y se queda donde esta.
--   cancellation_reason  300 - una frase, no un parrafo.
--   best_feature ....... 500 - texto libre corto de la encuesta.
--   improvement_area ... 500 - idem.
--   comments .......... 1000 - el unico campo donde se invita a extenderse.
--   note ............... 500 - las escribe el personal sobre una unidad.
--   reason ............. 200 - el motivo de inhabilitar un dia.
--
-- MEDIDO CONTRA PRODUCCION ANTES DE ESCRIBIR ESTO, y es la leccion de la
-- migracion 28 con otra cara -- alli se midio el origen y no el destino; aca lo
-- que hay que medir es lo que la columna YA CONTIENE, porque un ALTER con una
-- fila que lo viole falla a mitad y deja unas restricciones puestas y otras no.
-- El maximo real de las nueve columnas, el 2026-08-23:
--
--   unit_notes.note ....... 91 caracteres sobre 68 filas   <- el mayor de todos
--   alumnos.nombre ......... 9 caracteres sobre  1 fila
--   alumnos.apellido ....... 6 caracteres sobre  1 fila
--   las otras seis .......... 0 filas
--
-- O sea: el tope mas ajustado deja 409 caracteres de margen sobre el dato real
-- mas largo que existe. Ninguna fila viola nada y el ALTER no puede fallar por
-- datos.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE CHECK Y NO varchar(n). Cambiar el tipo reescribe la tabla entera y
-- toma un ACCESS EXCLUSIVE que bloquea las lecturas mientras dura; un CHECK
-- nuevo solo valida. Con 68 filas da igual, pero la costumbre importa el dia que
-- sean 68 000. Y `char_length` cuenta CARACTERES y no bytes, que es lo que un
-- usuario entiende por "80": con `octet_length`, una enye gastaria dos.
--
-- char_length(NULL) es NULL, y UN CHECK QUE DA NULL PASA. Las ocho columnas
-- nulables siguen aceptando NULL sin que haya que escribir nada mas. Es la
-- semantica de tres valores jugando a favor por una vez.
--
-- ESTO NO SUSTITUYE AL `maxLength` DE LOS FORMULARIOS, que va en el mismo
-- commit. El orden de autoridad es el de siempre: el tope del motor es el
-- control -- lo cumple aunque nadie use el formulario --, y el `maxLength` del
-- HTML es cortesia, para que un usuario normal vea el limite en vez de llevarse
-- un 23514 despues de escribir un parrafo.


alter table public.alumnos
  add constraint alumnos_nombre_largo   check (char_length(nombre)   <= 80),
  add constraint alumnos_apellido_largo check (char_length(apellido) <= 80);

alter table public.inventory_reservations
  add constraint reservations_purpose_largo check (char_length(purpose)             <= 120),
  add constraint reservations_motivo_largo  check (char_length(cancellation_reason) <= 300);

alter table public.final_satisfaction_surveys
  add constraint surveys_best_largo     check (char_length(best_feature)     <= 500),
  add constraint surveys_mejora_largo   check (char_length(improvement_area) <= 500),
  add constraint surveys_comments_largo check (char_length(comments)         <= 1000);

-- Las dos de abajo las escribe el PERSONAL y no un alumno, asi que el riesgo es
-- menor. Entran igual: el tope cuesta una linea, y una cuenta de operador
-- comprometida alcanza las dos.
alter table public.inventory_unit_notes
  add constraint unit_notes_note_largo check (char_length(note) <= 500);

alter table public.disabled_days
  add constraint disabled_days_reason_largo check (char_length(reason) <= 200);
