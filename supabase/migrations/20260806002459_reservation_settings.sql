-- Configuracion de las reglas de reserva (tarea 1.4).
--
-- Dos niveles, a proposito:
--
--   products.max_duration_hours y buffer_minutes -> lo que depende del equipo.
--     Una camara no se presta el mismo tiempo que un tripode, ni tarda lo mismo
--     en volver a estar disponible: el buffer es tiempo de retorno -revisar,
--     cargar bateria, limpiar-. (D-1, D-10)
--
--   app_settings -> lo que es del servicio y no del equipo: horario, ventana
--     movil, limite diario. (D-3)
--
-- Fila unica sin trucos raros: la clave primaria es un booleano con check (id),
-- asi que solo `true` es un valor valido y la PK impide que se repita. No hace
-- falta ni trigger ni indice parcial.
--
-- La fila por defecto se inserta ACA y no en seed.sql: seed.sql no llega al
-- proyecto remoto, y sin esta fila la RPC de reserva aborta con "Falta la fila de
-- configuracion". Es esquema, no dato de prueba.
--
-- 60 % slot_minutes = 0 no es decoracion: la RPC valida que la hora de inicio
-- caiga en un bloque, y con un tamano que no divide la hora esa regla no esta
-- bien definida.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.1.

alter table public.products
  add column max_duration_hours smallint not null default 4
    check (max_duration_hours between 1 and 8),
  add column buffer_minutes smallint not null default 120
    check (buffer_minutes between 0 and 480);


create table public.app_settings (
  id                      boolean primary key default true,
  booking_window_days     smallint not null default 7
                            check (booking_window_days between 1 and 60),
  opening_time            time not null default '08:00',
  closing_time            time not null default '22:00',
  slot_minutes            smallint not null default 30
                            check (slot_minutes between 5 and 60),
  min_duration_minutes    smallint not null default 15
                            check (min_duration_minutes between 5 and 480),
  daily_limit_per_product smallint not null default 1
                            check (daily_limit_per_product between 1 and 10),
  updated_at              timestamptz not null default now(),
  constraint app_settings_singleton    check (id),
  constraint app_settings_horario      check (closing_time > opening_time),
  constraint app_settings_slot_divisor check (60 % slot_minutes = 0)
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.fn_update_updated_at();


-- Lectura para cualquiera con sesion: el cliente necesita el horario y la ventana
-- para pintar el calendario. Escritura solo de admin, y solo de las columnas de
-- configuracion: id y updated_at no se conceden a nadie.
--
-- Sin INSERT ni DELETE para nadie: la fila unica no se borra ni se duplica por API.
grant select on public.app_settings to authenticated;
grant update (booking_window_days, opening_time, closing_time, slot_minutes,
              min_duration_minutes, daily_limit_per_product)
  on public.app_settings to authenticated;

create policy app_settings_select_auth on public.app_settings
  for select to authenticated
  using (true);

create policy app_settings_update_admin on public.app_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
