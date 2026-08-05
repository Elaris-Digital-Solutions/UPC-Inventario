-- Trazabilidad y auditoria solo-anexar (D-2, tarea 1.3).
--
-- El motivo explicito de D-2 es poder auditar un equipo perdido: quien lo
-- entrego, quien lo recibio, cuando. Eso solo vale si el registro no se puede
-- falsear ni borrar.
--
-- created_by NO lo rellena un trigger. Lo pone un DEFAULT auth.uid(), y al
-- cliente no se le concede privilegio sobre esa columna: el GRANT de INSERT
-- enumera las columnas permitidas y created_by no esta. No puede escribirla, asi
-- que tampoco mentir en ella. Menos codigo y mas dificil de saltarse que un
-- trigger que sobreescriba el valor.
--
-- reservation_status_log queda solo-anexar para todos, admin incluido: no se le
-- concede INSERT, UPDATE ni DELETE a nadie. La unica escritura viene del trigger,
-- que es SECURITY DEFINER y por eso puede escribir en una tabla sin politica de
-- INSERT. Una auditoria que el auditado puede editar no es una auditoria.


alter table public.inventory_unit_notes alter column created_by set default auth.uid();
alter table public.disabled_days        alter column created_by set default auth.uid();


-- Notas de unidad: las lee cualquiera con sesion, las escribe el personal, las
-- borra solo el admin.
grant select on public.inventory_unit_notes to authenticated;
grant insert (unit_id, note) on public.inventory_unit_notes to authenticated;
grant delete on public.inventory_unit_notes to authenticated;

-- Dias inhabilitados: el INSERT ya estaba concedido en catalog_policies, pero
-- sobre todas las columnas. Se acota para que created_by no sea escribible.
revoke insert on public.disabled_days from authenticated;
grant insert (date, reason) on public.disabled_days to authenticated;

drop policy if exists inventory_unit_notes_select_auth on public.inventory_unit_notes;
drop policy if exists unit_notes_select_auth           on public.inventory_unit_notes;

create policy unit_notes_select_auth on public.inventory_unit_notes
  for select to authenticated using (true);

create policy unit_notes_insert_staff on public.inventory_unit_notes
  for insert to authenticated
  with check ((select private.is_staff()));

create policy unit_notes_delete_admin on public.inventory_unit_notes
  for delete to authenticated
  using ((select private.is_admin()));


-- Auditoria de estados: solo lectura por API.
grant select on public.reservation_status_log to authenticated;

create policy log_select_own on public.reservation_status_log
  for select to authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1
        from public.inventory_reservations r
       where r.id = reservation_status_log.reservation_id
         and r.alumno_id = (select private.current_alumno_id())
    )
  );


create or replace function public.log_reservation_status() returns trigger
  language plpgsql security definer set search_path = '' as $$
  begin
    if new.status is distinct from old.status then
      insert into public.reservation_status_log
        (reservation_id, old_status, new_status, reason, changed_by)
      values (new.id, old.status, new.status, new.cancellation_reason, (select auth.uid()));
    end if;
    return null;
  end $$;

create trigger trg_log_reservation_status
  after update of status on public.inventory_reservations
  for each row execute function public.log_reservation_status();
