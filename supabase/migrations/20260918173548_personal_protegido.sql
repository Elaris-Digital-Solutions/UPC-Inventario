-- H-14 (segunda auditoria, 2026-09-17): dos reglas del personal pasan de
-- TypeScript a la base.
--
-- 1. LA BAJA ES DESACTIVAR, NUNCA BORRAR. Se revoca el DELETE a authenticated:
--    staff_admin_all es `for all` y le dejaba al admin borrar por la API, y con
--    la fila se iban sus turnos en cascada y la constancia de que esa persona fue
--    personal y con que rol. La cascada desde auth.users no se toca: la ejecuta
--    el motor, no este rol.
--
-- 2. NADIE SE CAMBIA A SI MISMO el rol, el acceso ni el dueño de la fila. La
--    comprobacion de lib/admin/acciones.ts comparaba cadenas, y Postgres acepta
--    el mismo uuid en mayusculas o entre llaves: el admin del seed se degrado a
--    si mismo y la base quedo sin ningun admin (medido en local el 2026-09-18).
--    Aqui se compara el uuid ya convertido, asi que la forma del texto no importa.
--    Sin sesion -postgres, service_role- auth.uid() es nulo y no aplica.
--
-- Prueba: supabase/tests/50_personal_protegido.sql.

revoke delete on public.staff_members from authenticated;

create or replace function private.staff_members_no_a_si_mismo()
returns trigger
language plpgsql set search_path = ''
as $$
  begin
    if old.user_id = (select auth.uid())
       and (new.role    is distinct from old.role
         or new.activo  is distinct from old.activo
         or new.user_id is distinct from old.user_id) then
      raise exception 'Nadie puede cambiarse a si mismo el rol ni el acceso'
        using errcode = 'check_violation';
    end if;
    return new;
  end $$;

create trigger staff_members_no_a_si_mismo
  before update on public.staff_members
  for each row execute function private.staff_members_no_a_si_mismo();

-- Mismo criterio que 20260821025142_horarios_por_sede.sql: a un trigger lo
-- invoca el motor y no necesita EXECUTE.
revoke execute on function private.staff_members_no_a_si_mismo() from public, anon, authenticated;
