-- Sanciones (tarea 1.8, D-12). Resuelve C-2 y C-3.
--
-- Un unico modelo: alumnos.banned_until, poblado por un unico trigger. Se
-- descartan las tres variantes incompatibles de inventory_blacklist que convivian
-- en los SQL sueltos.
--
-- El disparador de los 15 dias son DOS not_picked_up en los ULTIMOS 90 DIAS, no
-- dos de por vida. Con el conteo de por vida, un alumno que falla dos veces en
-- cuatro anos queda a un fallo del bloqueo para el resto de su carrera.
--
-- greatest(...) evita que una sancion nueva acorte una que ya estaba corriendo.
-- Con banned_until = 'infinity', greatest se queda con infinity.
--
-- El trigger es SECURITY DEFINER porque banned_until no tiene GRANT para nadie
-- -ni para el admin-: un privilegio de columna se concede a un ROL, y
-- `authenticated` incluye a los alumnos, que tienen politica de UPDATE sobre su
-- propia fila. Concederselo al admin reabriria P1-10. (Correccion de la tanda 1.)
--
-- La cuenta de los 90 dias se apoya en updated_at, que mueve cualquier UPDATE de
-- la fila. Es la version del diseno aprobado; si se endurece, la alternativa es
-- contar sobre reservation_status_log.changed_at, que es solo-anexar.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.5.


create or replace function public.apply_penalties() returns trigger
  language plpgsql security definer set search_path = '' as $$
  declare v_count int;
  begin
    if new.status = 'not_returned' then
      update public.alumnos
         set banned_until = 'infinity'
       where id = new.alumno_id;

    elsif new.status = 'not_picked_up' then
      -- La fila en curso ya esta actualizada: es un trigger AFTER, asi que se
      -- cuenta a si misma. v_count >= 2 significa "esta es la segunda".
      select count(*) into v_count
        from public.inventory_reservations r
       where r.alumno_id = new.alumno_id
         and r.status    = 'not_picked_up'
         and r.updated_at > now() - interval '90 days';

      if v_count >= 2 then
        update public.alumnos
           set banned_until = greatest(coalesce(banned_until, now()), now() + interval '15 days')
         where id = new.alumno_id;
      end if;
    end if;

    return null;
  end $$;

create trigger trg_apply_penalties
  after update of status on public.inventory_reservations
  for each row execute function public.apply_penalties();


-- Las dos puertas manuales sobre las columnas que no tienen GRANT.
--
-- Sin ellas, una sancion solo caduca por tiempo y un alumno no se puede desactivar
-- por ninguna via: es la deuda que la tanda 1 dejo anotada al descubrir que la
-- sancion no puede vivir en un privilegio de columna.
--
-- Comprueban el rol a mano porque SECURITY DEFINER no pasa por RLS.

create or replace function public.admin_set_ban(
  p_alumno_id    uuid,
  p_banned_until timestamptz
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Solo un administrador modifica una sancion' using errcode = '42501';
  end if;

  update public.alumnos set banned_until = p_banned_until where id = p_alumno_id;
  if not found then
    raise exception 'Alumno inexistente' using errcode = 'no_data_found';
  end if;
end $$;

create or replace function public.admin_set_alumno_activo(
  p_alumno_id uuid,
  p_activo    boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Solo un administrador activa o desactiva a un alumno' using errcode = '42501';
  end if;

  update public.alumnos set activo = p_activo where id = p_alumno_id;
  if not found then
    raise exception 'Alumno inexistente' using errcode = 'no_data_found';
  end if;
end $$;

revoke execute on function public.admin_set_ban(uuid, timestamptz) from public, anon;
grant execute on function public.admin_set_ban(uuid, timestamptz) to authenticated;

revoke execute on function public.admin_set_alumno_activo(uuid, boolean) from public, anon;
grant execute on function public.admin_set_alumno_activo(uuid, boolean) to authenticated;
