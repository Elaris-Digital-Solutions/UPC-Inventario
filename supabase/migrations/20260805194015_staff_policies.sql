-- Privilegios y RLS de staff_members (D-2, D-11).
--
-- El GRANT de escritura a `authenticated` parece demasiado abierto leido solo.
-- No lo es: el privilegio es condicion NECESARIA pero no suficiente. Sin el, la
-- sentencia ni siquiera se planifica; con el, RLS sigue exigiendo
-- private.is_admin(). Postgres pide las dos cosas, y hace falta conceder el
-- privilegio a algun rol para que la politica tenga a quien aplicarse.
--
-- El operador solo se ve a si mismo: no necesita saber quien mas trabaja ahi.
-- La politica de admin cubre las cuatro operaciones con FOR ALL, con USING y
-- WITH CHECK, para que no pueda crear una fila que despues no podria leer.

grant select on public.staff_members to authenticated;
grant insert, update, delete on public.staff_members to authenticated;


create policy staff_select_self on public.staff_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy staff_admin_all on public.staff_members
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
