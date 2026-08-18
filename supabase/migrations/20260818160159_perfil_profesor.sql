-- D-79: el formulario de datos salta en la PRIMERA RESERVA y guarda dos datos
-- mas.
--
-- POR QUE SE GUARDA LA CONFIRMACION DE FACULTAD Y NO ES SOLO UN TEXTO: D-78
-- decide que el sistema NO comprueba la carrera -la verificacion es presencial,
-- con el TIU, en el mostrador-. Por eso la casilla es la UNICA constancia de
-- que a esa persona se le dijo la regla y la acepto. Guardarla cuesta una
-- columna; no guardarla deja la palabra del mostrador contra la del alumno.
--
-- LA CARRERA DEL PROFESOR ES carrera_id, la que ya existe. El cliente la pidio
-- "tambien para el profesor", y es el mismo campo: un profesor de Software
-- elige Software en el mismo desplegable.
--
-- DEFAULT FALSE Y NOT NULL: las filas que ya hay pasan a false sin migrar
-- datos, y false es la verdad -nadie ha confirmado nada todavia-. Un nullable
-- diria "no se sabe", que aqui no es un estado util: quien no ha confirmado,
-- no ha confirmado.

alter table public.alumnos
  add column es_profesor       boolean not null default false,
  add column confirmo_facultad boolean not null default false;

comment on column public.alumnos.es_profesor is
  'Declarado por la propia persona en el formulario de la primera reserva. No se verifica.';

comment on column public.alumnos.confirmo_facultad is
  'D-78: constancia de que se le mostro la regla de Facultad de Ingenieria y la acepto. El sistema NO comprueba la carrera; se verifica con el TIU en el mostrador.';

-- ESTA LINEA ES LA QUE SE OLVIDA, Y ES LA MISMA TRAMPA DE LA MIGRACION 26.
-- alumnos tiene el grant de UPDATE con las columnas ENUMERADAS
-- -20260805194848_alumno_policies.sql:27: grant update (nombre, apellido,
-- carrera_id)-, asi que una columna nueva NO queda cubierta sola.
--
-- Medido antes de escribirla: information_schema.column_privileges devolvia
-- exactamente TRES columnas con UPDATE para authenticated -apellido,
-- carrera_id, nombre-, ninguna mas.
--
-- Sin esta linea, guardarPerfil() -app/(perfil)/completar-perfil/actions.ts-
-- afecta CERO FILAS o responde 42501, y ni typecheck, ni lint, ni build lo ven:
-- un privilegio no esta en el tipo.
--
-- Se reescribe la lista ENTERA y no solo las dos nuevas, porque
-- "grant update (a, b)" no reemplaza al anterior, lo SUMA; escribirla entera
-- deja el archivo diciendo cual es el conjunto final.
grant update (nombre, apellido, carrera_id, es_profesor, confirmo_facultad)
  on public.alumnos to authenticated;

-- La politica alumnos_update_own NO se toca: no enumera columnas y su USING ya
-- limita cada fila a su dueno.
