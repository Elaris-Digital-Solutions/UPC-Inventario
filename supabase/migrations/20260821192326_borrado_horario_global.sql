-- D-91: app_settings.opening_time y closing_time se BORRAN.
--
-- EL ARGUMENTO NO ES DE LIMPIEZA. Desde la migracion 34 las dos columnas ya no
-- gobiernan nada: la rejilla y create_reservation leen campus_hours recortada
-- por staff_shifts (D-74). Una columna que conserva su nombre y deja de
-- gobernar es la forma EXACTA de products.description (D-82), que este proyecto
-- ya pago una vez: alguien la lee dentro de seis meses, se la cree, y nada
-- avisa.
--
-- MIGRACION PROPIA Y NO DENTRO DE LA 34. El orden lo garantiza el timestamp:
-- primero las RPC dejan de leerlas (34), despues se borran (35). Meterlo en la
-- 34 obligaria a editar una migracion ya confirmada.
--
-- OJO: SE VAN DOS RESTRICCIONES, NO UNA. D-91 nombra app_settings_horario
-- -closing_time > opening_time, migracion 11-, y hay una segunda que tambien
-- referencia opening_time: app_settings_apertura_alineada -D-54/Q-19, migracion
-- 24-. Postgres las borraria solas al caer las columnas; se nombran a proposito
-- para que este archivo diga lo que quita y para que la migracion FALLE si
-- alguna de las dos no existe con ese nombre. La regla de D-54 no desaparece:
-- se mudo a campus_hours en la migracion 33, donde vive en DOS disparadores
-- porque un CHECK no puede llevar subconsulta.
--
-- LO QUE ARRASTRA FUERA DE LA BASE, contado en D-91: supabase/seed.sql -que las
-- leia para sembrar horarios y turnos-, lib/reservas/consultas.ts,
-- components/admin/formulario-ajustes.tsx, lib/admin/configuracion.ts,
-- lib/admin/acciones.ts, lib/admin/ajustes.ts y lib/database.types.ts
-- REGENERADO, nunca editado a mano.
--
-- Ver MIGRATION_DOCS/FASE_3_DISENO.md seccion 5 y
-- MIGRATION_DOCS/PLANES/FASE_3_TANDA_4.md.

alter table public.app_settings
  drop constraint app_settings_horario,
  drop constraint app_settings_apertura_alineada,
  drop column opening_time,
  drop column closing_time;
