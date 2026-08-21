-- D-74 / D-75: el horario deja de ser uno solo para todo el sistema.
--
-- Hasta hoy `app_settings` es UNA fila -PK booleana con check (id)- con un solo
-- opening_time y un solo closing_time. No hay horario por sede, por dia de la
-- semana ni por persona. Esta migracion crea las dos tablas; la 34 hace que las
-- RPC las lean y borra las dos columnas viejas (D-91).
--
-- LA FORMA DE LAS DOS TABLAS NO ES SIMETRICA, y es a proposito:
--
--   campus_hours  -> PK (campus_id, weekday). UN horario por dia y por sede, y
--                    un dia SIN FILA es un dia cerrado. No hay estado "abierta
--                    de 0 a 0".
--   staff_shifts  -> PK propia. Un operador puede tener dos turnos partidos el
--                    mismo dia, y dos personas pueden solaparse.
--
-- D-93: staff_shifts.staff_id referencia staff_members(user_id) y NO filtra por
-- rol. Un admin puede tener turnos, y hoy en produccion es el unico personal que
-- existe. La redaccion de D-74 dice "sus operadores" y eso es lenguaje, no una
-- restriccion: el modelo nunca lo ato.
--
-- OJO CON LA ALINEACION, que es la correccion 1 de la cabecera del plan y se
-- midio en vez de suponerse. D-54 ata opening_time a slot_minutes con un CHECK
-- sobre app_settings, y eso solo funciona porque las DOS columnas viven en la
-- MISMA FILA. Aqui no: slot_minutes sigue en app_settings, y Postgres rechaza
-- la mudanza con
--
--   ERROR:  cannot use subquery in check constraint
--
-- Por eso la regla va en DOS disparadores y no en un CHECK. El segundo no es
-- simetria decorativa: el daño crecio de tamaño. En app_settings cambiar
-- slot_minutes podia desalinear UNA fila y el CHECK de la propia tabla lo
-- frenaba; con campus_hours puede desalinear 14 de golpe -2 sedes x 7 dias- y ya
-- no hay CHECK que lo frene.
--
-- Ver MIGRATION_DOCS/FASE_3_DISENO.md seccion 5 y
-- MIGRATION_DOCS/PLANES/FASE_3_TANDA_4.md.


-- 1 ---------------------------------------------------------------- las tablas

create table public.campus_hours (
  campus_id  uuid     not null references public.campuses(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  opens_at   time     not null,
  closes_at  time     not null,
  primary key (campus_id, weekday),
  constraint campus_hours_orden check (closes_at > opens_at)
);

comment on table public.campus_hours is
  'Horario de atencion de cada sede por dia de la semana. Un dia sin fila es un dia cerrado (D-75).';

create table public.staff_shifts (
  id         uuid     primary key default gen_random_uuid(),
  staff_id   uuid     not null references public.staff_members(user_id) on delete cascade,
  campus_id  uuid     not null references public.campuses(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  starts_at  time     not null,
  ends_at    time     not null,
  constraint staff_shifts_orden check (ends_at > starts_at)
);

comment on table public.staff_shifts is
  'Turnos del personal por sede y dia. Cualquier miembro activo de staff_members, no solo rol operator (D-93).';

-- El indice que van a usar las dos RPC en cada llamada: siempre se pregunta por
-- (sede, dia). Sin el, cada franja de la rejilla provoca un recorrido completo.
create index staff_shifts_campus_weekday_idx
  on public.staff_shifts (campus_id, weekday);


-- 2 ------------------------------------------------- la alineacion, en trigger

-- La misma regla de D-54 y la misma cuenta, sobre otra tabla. Se escribe UNA vez
-- y la usan los dos disparadores: si se copiara, las dos copias se separarian.
create or replace function private.horario_alineado(p_hora time)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select extract(epoch from p_hora)::int
           % ((select s.slot_minutes from public.app_settings s) * 60) = 0;
$$;

create or replace function private.campus_hours_exige_alineacion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
  begin
    if not private.horario_alineado(new.opens_at) then
      raise exception
        'La hora de apertura % no cae en un bloque de % minutos',
        new.opens_at, (select s.slot_minutes from public.app_settings s)
        using errcode = 'check_violation';
    end if;
    return new;
  end $$;

create trigger campus_hours_alineacion
  before insert or update on public.campus_hours
  for each row execute function private.campus_hours_exige_alineacion();

-- La puerta de atras, que es la que el CHECK viejo SI cubria y aqui hay que
-- reponer a mano: cambiar solo slot_minutes puede desalinear aperturas ya
-- guardadas. Es la asercion 3 de supabase/tests/32, con otra tabla debajo.
create or replace function private.app_settings_respeta_horarios()
returns trigger
language plpgsql security definer set search_path = ''
as $$
  declare
    v_desalineadas int;
  begin
    if new.slot_minutes is distinct from old.slot_minutes then
      select count(*) into v_desalineadas
        from public.campus_hours ch
       where extract(epoch from ch.opens_at)::int % (new.slot_minutes * 60) <> 0;

      if v_desalineadas > 0 then
        raise exception
          'Cambiar el bloque a % minutos dejaria % horario(s) de sede sin alinear',
          new.slot_minutes, v_desalineadas
          using errcode = 'check_violation';
      end if;
    end if;
    return new;
  end $$;

create trigger app_settings_respeta_horarios
  before update on public.app_settings
  for each row execute function private.app_settings_respeta_horarios();

-- Al crear una funcion, PUBLIC recibe EXECUTE por defecto, y PostgREST publica
-- en /rest/v1/rpc/ toda funcion que el rol pueda ejecutar. A un trigger lo
-- invoca el MOTOR, asi que no necesita el privilegio -medido en la Fase 1,
-- 20260806035041_revoke_trigger_functions.sql-.
revoke execute on function private.campus_hours_exige_alineacion()  from public, anon, authenticated;
revoke execute on function private.app_settings_respeta_horarios()  from public, anon, authenticated;
revoke execute on function private.horario_alineado(time)           from public, anon, authenticated;


-- 3 ------------------------------------------------------------- privilegios y RLS

-- Nada de `grant all`: la Fase 1 revoco los grants en bloque a proposito
-- -20260805193059_revoke_blanket_grants.sql-. El privilegio decide que COLUMNAS y
-- la politica decide que FILAS.
--
-- NI UNA DE LAS DOS SE CONCEDE A anon. campuses si lo hace porque la vitrina
-- publica lista sedes; un horario no se muestra sin sesion, y available_slots es
-- SECURITY DEFINER, asi que la rejilla no depende de que el alumno lea nada.
grant select, insert, update, delete on public.campus_hours to authenticated;
grant select, insert, update, delete on public.staff_shifts to authenticated;

alter table public.campus_hours enable row level security;
alter table public.staff_shifts enable row level security;

-- El horario de una sede es informacion de SERVICIO: cualquiera con sesion puede
-- saber si su sede abre el jueves.
create policy campus_hours_select_auth on public.campus_hours
  for select to authenticated
  using (true);

create policy campus_hours_admin_all on public.campus_hours
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Un turno dice QUIEN atiende, y eso es dato de personal: mismo criterio que
-- D-69 aplico a inventory_unit_notes. El alumno no lo lee ni lo necesita -su
-- calendario sale de available_slots, que es definer-, y el mensaje que ve
-- cuando no hay cobertura no nombra a nadie.
create policy staff_shifts_select_staff on public.staff_shifts
  for select to authenticated
  using ((select private.is_staff()));

create policy staff_shifts_admin_all on public.staff_shifts
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));


-- 4 ------------------------------------------------- el techo de hoy, sembrado

-- SIN ESTE BLOQUE LA MIGRACION DEJA PRODUCCION SIN PODER RESERVAR. Con
-- campus_hours vacio no hay ni una franja que ofrecer, y la 34 hara que
-- create_reservation rechace todo: el sistema se caeria en el instante del
-- db push, antes de que nadie hubiera tenido ocasion de cargar un horario.
--
-- OJO, Y ESTO SE MIDIO EN VEZ DE SUPONERSE: la primera version de esta migracion
-- llevaba el INSERT ... SELECT aqui mismo y sembro CERO filas en local. El motivo
-- lo tenia escrito el propio seed para la migracion 27 (D-77): `db reset` aplica
-- las migraciones y DESPUES corre seed.sql, asi que cuando esto se ejecuta
-- `campuses` esta VACIA en local. En produccion las dos sedes existen desde
-- antes y si habria sembrado.
--
-- Con salon_devolucion eso se acepto -es una columna de texto y el seed la
-- rellena aparte-. AQUI NO SE PUEDE ACEPTAR: si la siembra falla en produccion,
-- nadie puede reservar. Asi que la logica vive en UNA funcion a la que llaman
-- los dos -esta migracion y seed.sql- y que ademas se puede probar en local con
-- pgTAP. Copiar el INSERT en el seed habria dejado dos versiones que se separan.
--
-- LA FUNCION RECIBE LAS DOS HORAS EN VEZ DE LEER app_settings, y no es un
-- capricho: la migracion 34 BORRA opening_time y closing_time (D-91). Una funcion
-- que las leyera quedaria rota al dia siguiente de escribirse.
create or replace function private.sembrar_horarios_por_defecto(
  p_opens_at  time,
  p_closes_at time
) returns int
language plpgsql security definer set search_path = ''
as $$
  declare
    v_filas int;
  begin
    -- Los 7 dias de las sedes ACTIVAS. Una sede inactiva no atiende, y darle
    -- horario seria afirmar lo contrario.
    insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
    select c.id, d.weekday, p_opens_at, p_closes_at
      from public.campuses c
     cross join generate_series(0, 6) as d(weekday)
     where c.activo
    on conflict (campus_id, weekday) do nothing;

    -- Devuelve lo que hizo, no un OK: es lo que permite verificarla por el
    -- efecto en vez de por que no lanzo error.
    get diagnostics v_filas = row_count;
    return v_filas;
  end $$;

revoke execute on function private.sembrar_horarios_por_defecto(time, time)
  from public, anon, authenticated;

-- EL HORARIO SE LEE DE app_settings, NO SE TRANSCRIBE. Escribir '08:00' y
-- '22:00' a mano seria copiar un dato que vive en otro sitio y que en produccion
-- podria ser otro; es el criterio de D-84. Asi el techo queda IDENTICO al de hoy
-- y lo unico que cambia de comportamiento es la cobertura de turnos.
--
-- En local esta llamada siembra 0 -campuses vacia- y en produccion 14. Las dos
-- son correctas, y por eso el numero no se afirma aqui.
do $$
  declare
    v_sembradas int;
  begin
    select private.sembrar_horarios_por_defecto(s.opening_time, s.closing_time)
      into v_sembradas
      from public.app_settings s;

    raise notice 'campus_hours sembrados: %', v_sembradas;
  end $$;

-- staff_shifts NACE VACIA, y eso NO es un descuido: no hay ningun turno real que
-- afirmar. Quien despliegue carga los suyos desde /admin/horarios, y hasta
-- entonces el calendario no ofrece nada. Es correcto y es visible.
