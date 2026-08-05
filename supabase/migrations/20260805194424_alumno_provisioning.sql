-- Alta automatica de alumno desde auth.users (D-9). Cierra P0-5.
--
-- El registro previo desaparece. Antes, la pantalla de registro llamaba a una RPC
-- y, si fallaba, insertaba en alumnos directamente como anonimo
-- (Register.tsx:105-114). Eso es P0-5.
--
-- Ahora la fila la crea un trigger sobre auth.users. `anon` no necesita INSERT
-- sobre alumnos en ningun momento, asi que esa politica no existe: el defecto se
-- cierra por ausencia de superficie, no por validacion.
--
-- Efecto sobre BR-02 ("solo alumnos registrados y activos pueden iniciar
-- sesion"): deja de aplicar. El dominio @upc.edu.pe pasa a ser la unica puerta.
-- Quien entre con otro correo se autentica pero no tiene fila en alumnos, y como
-- todas las politicas cuelgan de ahi, se queda sin acceso a nada.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 5.3.


-- El perfil nace vacio. Una cadena vacia mentiria sobre su estado, y la RPC de
-- reserva de la tanda 2 necesita distinguir "sin completar" de "completado".
-- La tabla esta vacia, asi que el cambio no migra datos.
alter table public.alumnos alter column nombre   drop not null;
alter table public.alumnos alter column apellido drop not null;


create or replace function public.handle_new_auth_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
  begin
    if new.email is not null and lower(new.email) like '%@upc.edu.pe' then
      insert into public.alumnos (auth_user_id, email)
      values (new.id, lower(new.email))
      on conflict (email) do update
         set auth_user_id = excluded.auth_user_id
       where public.alumnos.auth_user_id is null;
    end if;
    return new;
  end $$;

-- El WHERE del ON CONFLICT importa: sin el, un alta posterior con el mismo correo
-- secuestraria una fila ya vinculada a otra cuenta. Con el, solo rellena las que
-- todavia no tienen dueno.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
