-- Migracion 31: la fecha del primer correo se EXPONE, no se guarda (D-80).
--
-- POR QUE NO SE COPIA A `alumnos`: el dato ya existe. `auth.users`
-- .confirmation_sent_at lo escribe Supabase Auth al PEDIR el magic link, sin
-- que este proyecto haga nada. Medido en el proyecto real el 2026-08-18: cae
-- 74 ms despues de `created_at` en el unico usuario con cuenta, o sea que es
-- el primer enlace y no otra cosa. Copiarlo crearia una segunda copia que se
-- puede desincronizar de la primera.
--
-- POR QUE `security definer`: el esquema `auth` no tiene grant para
-- `authenticated`, y por eso ninguna consulta del proyecto lo toca hoy. Sin
-- definer, esta funcion no puede leer esa tabla.
--
-- POR QUE `set search_path = ''` Y TODO CALIFICADO: una funcion definer sin
-- search_path fijo es una escalada de privilegios esperando a que alguien cree
-- una tabla con el nombre adecuado. Mismo criterio que los cuatro helpers de
-- `private` (20260805193357_private_helpers.sql).
--
-- POR QUE EL FILTRO ES UN `where` Y NO UN `raise`: quien no es admin recibe
-- CERO FILAS, no un error. Un error distinto por rol le dice a quien pregunta
-- que existe del otro lado. Es la misma firma que dejo la migracion 25 sobre
-- inventory_unit_notes: al que le falta la politica recibe lista vacia.
--
-- POR QUE VIVE EN `public` Y NO EN `private`: la consume listarPersonal()
-- (lib/admin/personal.ts) por PostgREST con .rpc(), y `private` no esta
-- expuesto. De los helpers de `private` se copia el ESTILO, no la ubicacion.
create or replace function public.primer_acceso_personal()
returns table (user_id uuid, primer_acceso timestamptz)
language sql stable security definer set search_path = ''
as $func$
  select s.user_id, u.confirmation_sent_at
    from public.staff_members s
    join auth.users u on u.id = s.user_id
   where (select private.is_admin())
$func$;


-- EL `revoke` VA PRIMERO Y NO ES REDUNDANTE: Postgres concede EXECUTE a
-- PUBLIC en toda funcion nueva. Sin esta linea, `anon` podria llamarla -- y
-- siendo `security definer`, eso importa el doble --. Es lo que ya hicieron
-- revoke_blanket_grants.sql y revoke_trigger_functions.sql, y lo que la
-- migracion 28 aprendio a costa de un hallazgo.
revoke all on function public.primer_acceso_personal() from public;
grant execute on function public.primer_acceso_personal() to authenticated;


comment on function public.primer_acceso_personal() is
  'D-80: expone auth.users.confirmation_sent_at para el personal. Solo admin: '
  'para cualquier otro rol devuelve cero filas, no un error.';
