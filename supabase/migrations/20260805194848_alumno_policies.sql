-- Privilegios y RLS de alumnos. Cierra P1-10.
--
-- El defecto de la linea base: alumnos_update_own era
--   FOR UPDATE USING (auth_user_id = auth.uid())
-- sin WITH CHECK, y authenticated tenia GRANT ALL. Un alumno podia ponerse
-- banned_until = NULL -levantarse su propia sancion- o reescribir email, activo
-- y auth_user_id.
--
-- El arreglo NO es una politica mejor. RLS no sabe de columnas: WITH CHECK ve la
-- fila nueva y nunca la vieja, asi que es incapaz de detectar que un valor
-- concreto cambio. Lo que si distingue columnas es el privilegio de Postgres.
--
--   RLS decide QUE FILAS. El GRANT decide QUE COLUMNAS. Hacen falta las dos.
--
-- activo y banned_until no se conceden a NADIE, ni siquiera al admin. Un GRANT de
-- columna se concede a un ROL, y `authenticated` son todos los usuarios con
-- sesion: darselo al admin se lo daria tambien al alumno, y su politica
-- alumnos_update_own le bastaria para volver a ponerselo en NULL. Quien escriba
-- esas columnas sera el trigger de sanciones de la tanda 2, que es SECURITY
-- DEFINER y no depende de privilegios de tabla. Levantar una sancion a mano sera
-- una RPC de admin, tambien en la tanda 2.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, secciones 2 y 5.4.


grant select on public.alumnos to authenticated;
grant update (nombre, apellido, carrera_id) on public.alumnos to authenticated;
-- Sin INSERT ni DELETE para nadie: las filas las crea el trigger de auth.users.


-- Las politicas de la linea base eran mas debiles y se llaman igual.
drop policy if exists alumnos_select_own on public.alumnos;
drop policy if exists alumnos_update_own on public.alumnos;


create policy alumnos_select_own on public.alumnos
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- Este helper existe para romper una recursion, no por comodidad.
--
-- La politica de abajo necesita saber si un alumno tiene reserva viva. Si
-- consultara inventory_reservations directamente, heredaria las politicas de esa
-- tabla, que a su vez consultan alumnos: Postgres aborta con
-- "infinite recursion detected in policy for relation alumnos".
--
-- Al ser SECURITY DEFINER, el helper se salta RLS y corta el ciclo. Misma razon
-- por la que los helpers de rol lo son.
--
-- Regla general: una politica que consulta otra tabla protegida hereda las
-- politicas de esa tabla. Si hay ida y vuelta, hace falta un helper.
create or replace function private.tiene_reserva_viva(p_alumno_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
    select exists (
      select 1
        from public.inventory_reservations r
       where r.alumno_id = p_alumno_id
         and r.status in ('reserved', 'active')
    )
  $$;

grant execute on function private.tiene_reserva_viva(uuid) to authenticated;


-- El operador necesita identificar al alumno en el mostrador, pero solo a quien
-- tiene una reserva viva. El admin ve a todos. (D-11)
create policy alumnos_select_staff on public.alumnos
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.current_staff_role()) = 'operator'
      and private.tiene_reserva_viva(alumnos.id)
    )
  );

-- Con WITH CHECK, a diferencia de la linea base: sin el, la fila podria quedar
-- apuntando a otra cuenta.
create policy alumnos_update_own on public.alumnos
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));
