-- D-32: el registro exige correo @upc.edu.pe, y se rechaza ANTES de crear la cuenta.
--
-- Hasta ahora el filtro de dominio era handle_new_auth_user, que deja crear la
-- cuenta y NO le crea fila en alumnos. Funciona -sin fila no se ve nada y no se
-- puede reservar- pero deja al de fuera con sesion delante de una pantalla vacia,
-- y deja cuentas inutiles en auth.users. Esto lo corta un paso antes, con el
-- enganche Before User Created de Supabase Auth.
--
-- LAS DOS CAPAS SE QUEDAN. Un enganche se desactiva desde un formulario del
-- dashboard; un trigger, no. Si algun dia se contradicen, gana la base. Por eso
-- el predicado de aqui es EL MISMO, copiado de 20260805194424_alumno_provisioning:
-- lower(email) like '%@upc.edu.pe'. Dos puertas que casi coinciden son peores que
-- una, porque el hueco entre ellas es el que nadie prueba.
--
-- LA FUNCION FALLA CERRADA, y esa decision es el motivo de la ultima asercion.
-- Se deja pasar solo cuando el correo casa de forma explicita; cualquier otra
-- cosa -incluido un evento con una forma distinta a la esperada, donde el correo
-- saldria NULL- se rechaza. Escrita al reves seria fail-open: `not (NULL like
-- ...)` es NULL, el IF no entra, y la funcion dejaria pasar a todo el mundo sin
-- dar un solo error. Es exactamente el modo de fallo que persiguio la Fase 1.
--
-- Ver MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md, Task 3.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


-- Lo que tiene que pasar.
select is(
  private.hook_restrict_signup_domain('{"user":{"email":"alumno@upc.edu.pe"}}'::jsonb),
  '{}'::jsonb,
  'un correo @upc.edu.pe se deja pasar'
);

-- El trigger de la Fase 1 compara en minusculas, asi que aqui tambien. Si una de
-- las dos puertas distinguiera mayusculas, un mismo correo entraria por una y no
-- por la otra.
select is(
  private.hook_restrict_signup_domain('{"user":{"email":"ALUMNO@UPC.EDU.PE"}}'::jsonb),
  '{}'::jsonb,
  'el dominio no distingue mayusculas, igual que el trigger'
);


-- Lo que NO tiene que pasar, y con que mensaje. Se afirma el texto, no solo que
-- haya error: es lo que va a leer una persona que no entiende por que no entra.
select is(
  private.hook_restrict_signup_domain('{"user":{"email":"alguien@gmail.com"}}'::jsonb)
    -> 'error' ->> 'message',
  'Este sistema es solo para correos institucionales de la UPC. Usa tu correo @upc.edu.pe',
  'un correo de fuera se rechaza con un mensaje que explica por que'
);

select is(
  (private.hook_restrict_signup_domain('{"user":{"email":"alguien@gmail.com"}}'::jsonb)
    -> 'error' ->> 'http_code')::int,
  403,
  'el rechazo viaja como 403 y no como un 500 generico'
);


-- Los dos casos que PARECE que se cuelan. Sin asercion nadie sabe cual de las dos
-- cosas es, y el LIKE es lo bastante sutil como para que valga la pena fijarlo.
select isnt(
  private.hook_restrict_signup_domain('{"user":{"email":"alguien@notupc.edu.pe"}}'::jsonb),
  '{}'::jsonb,
  'notupc.edu.pe no se cuela: el LIKE exige la arroba delante del dominio'
);

select isnt(
  private.hook_restrict_signup_domain('{"user":{"email":"alguien@upc.edu.pe.evil.com"}}'::jsonb),
  '{}'::jsonb,
  'upc.edu.pe.evil.com no se cuela: el dominio tiene que estar al final'
);


-- La asercion que justifica escribir la funcion al derecho y no al reves. Si el
-- evento llegara con otra forma -otra version del enganche, otro nombre de campo-
-- el correo sale NULL. Fallar cerrado convierte eso en "no entra nadie", que se ve
-- en el primer intento. Fallar abierto lo convertiria en "entra cualquiera", que no
-- se ve nunca.
select isnt(
  private.hook_restrict_signup_domain('{"user":{}}'::jsonb),
  '{}'::jsonb,
  'un evento sin correo se rechaza: la funcion falla cerrada'
);


select * from finish();

rollback;
