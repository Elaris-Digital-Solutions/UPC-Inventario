-- D-32: el registro exige correo @upc.edu.pe, y se rechaza antes de crear la cuenta.
--
-- Enganche Before User Created de Supabase Auth. Lo invoca Auth, no la aplicacion:
-- ningun codigo de Next.js llama a esta funcion.
--
-- POR QUE EXISTE, si el filtro ya estaba. handle_new_auth_user (Fase 1) crea la
-- fila de alumnos solo para @upc.edu.pe, asi que quien viene de fuera consigue
-- sesion y no ve nada. Cierra, pero cierra tarde: deja cuentas inutiles en
-- auth.users y le da al usuario una pantalla vacia en vez de un motivo. Esto
-- contesta con el motivo y no crea la cuenta.
--
-- LAS DOS CAPAS SE QUEDAN, y el orden de autoridad esta escrito a proposito: un
-- enganche se desactiva desde un formulario del dashboard, un trigger no. Si algun
-- dia se contradicen, gana la base. Por eso el predicado es EL MISMO, copiado de
-- 20260805194424_alumno_provisioning.sql y no reescrito de memoria.
--
-- ESTA MIGRACION CONTRADICE UNA PROMESA DEL PROYECTO, y se hace a sabiendas. La
-- tanda 0 de la Fase 2 dejo escrito que la base quedaba cerrada en 21 migraciones
-- y que ninguna tanda volveria a tocar SQL. Esta es la 22. La decision se tomo el
-- 2026-08-06 con el costo dicho por delante, y la frase se corrige fechada en los
-- documentos en vez de borrarse.
--
-- SECURITY INVOKER, contra la regla de la casa. Toda funcion nueva de este
-- proyecto lleva `security definer set search_path = ''`; la documentacion de Auth
-- Hooks desaconseja explicitamente el definer aqui, por los privilegios que
-- arrastra el rol postgres. El aislamiento lo dan los privilegios de abajo, no el
-- definer: solo supabase_auth_admin puede ejecutarla. El search_path fijo se
-- queda igual, y todo va cualificado con esquema.
--
-- Ver MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md, Task 3, y D-32 en ESTADO_Y_PLAN.md.


create or replace function private.hook_restrict_signup_domain(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
  declare
    v_email text;
  begin
    v_email := event -> 'user' ->> 'email';

    -- FALLA CERRADA, y esto es lo unico delicado del archivo.
    --
    -- Se deja pasar solo cuando el correo casa de forma explicita. Escrito al
    -- reves -"si NO casa, rechaza"- un correo NULL daria `not (NULL like ...)`,
    -- que es NULL, el IF no entraria y la funcion dejaria pasar a cualquiera sin
    -- dar un solo error. El correo puede llegar NULL si el evento cambia de forma
    -- en una version futura del enganche, que es justo cuando nadie esta mirando.
    --
    -- Fallar cerrado convierte ese escenario en "no se registra nadie", que se ve
    -- en el primer intento. Fallar abierto lo convertiria en "se registra
    -- cualquiera", que no se ve nunca. Lo vigila 30_signup_domain.sql.
    if coalesce(lower(v_email) like '%@upc.edu.pe', false) then
      return '{}'::jsonb;
    end if;

    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Este sistema es solo para correos institucionales de la UPC. Usa tu correo @upc.edu.pe',
        'http_code', 403
      )
    );
  end $$;


-- El aislamiento entero de esta funcion son estas tres lineas.
--
-- private ya tiene `revoke all on schema private from public` desde la Fase 1, asi
-- que hace falta darle el usage explicito al rol de Auth. Y el revoke no sobra
-- aunque el esquema este cerrado: al crear una funcion, PUBLIC recibe EXECUTE por
-- defecto, y es la leccion que costo seis funciones de trigger publicadas en
-- /rest/v1/rpc/ el 2026-08-05.
grant usage   on schema   private                              to supabase_auth_admin;
grant execute on function private.hook_restrict_signup_domain(jsonb) to supabase_auth_admin;
revoke execute on function private.hook_restrict_signup_domain(jsonb) from public, anon, authenticated;
