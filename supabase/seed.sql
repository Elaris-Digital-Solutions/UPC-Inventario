-- Seed determinista para desarrollo y pruebas locales.
--
-- NO llega al proyecto remoto: `supabase db push` solo empuja migrations/.
--
-- Los UUID estan escritos a mano y son estables a proposito: las pruebas pgTAP de
-- supabase/tests/ los referencian directamente. No regenerarlos.
--   cccccccc-...  sedes
--   caaaaaaa-...  carreras
--   bbbbbbbb-...  productos
--   dddddddd-...  unidades de inventario
--   eeeeeeee-...  dias inhabilitados
--
-- Alcance: solo se puebla lo que el esquema de hoy admite. staff_members,
-- app_settings, max_duration_hours y buffer_minutes llegan en las tandas 1 y 2,
-- y el seed crece con ellas. Los alumnos tampoco entran aca porque dependen de
-- filas en auth.users, que es trabajo de la tanda 1.

-- pgtap se crea aca y no en una migracion para que las funciones de prueba
-- nunca lleguen a produccion.
create extension if not exists pgtap with schema extensions;


-- D-77: salon_devolucion se siembra AQUI ademas de actualizarse en la migracion
-- 27, y no es una duplicacion por descuido.
--
-- El motivo es el orden de `db reset`: aplica las migraciones y DESPUES corre
-- este archivo. Cuando el UPDATE de la migracion se ejecuta, campuses esta
-- VACIA en local, asi que no toca ni una fila. En produccion si funciona,
-- porque alli las dos sedes existen desde antes.
--
-- Consecuencia que se dice en vez de disimularse: en local esta columna la
-- llena el seed, y el UPDATE de la migracion NO queda verificado por
-- 35_salon_devolucion.sql. Se verifica contra produccion, en el paso 9 de la
-- ultima tarea del plan de la F3-T1.
--
-- Los valores son los reales, medidos en produccion el 2026-08-18.
insert into public.campuses (id, name, address, activo, salon_devolucion) values
  ('cccccccc-0000-0000-0000-000000000001', 'Monterrico', 'Av. Primavera 2390, Santiago de Surco', true, 'MO-UH40'),
  ('cccccccc-0000-0000-0000-000000000002', 'San Miguel', 'Av. Alameda San Marcos cuadra 2, San Miguel', true, 'SM-SB608');


insert into public.carreras (id, nombre, codigo, activa) values
  ('caaaaaaa-0000-0000-0000-000000000001', 'Ingenieria de Software', 'ISW', true),
  ('caaaaaaa-0000-0000-0000-000000000002', 'Ciencias de la Computacion', 'CC', true),
  ('caaaaaaa-0000-0000-0000-000000000003', 'Ingenieria de Sistemas de Informacion', 'ISI', true),
  ('caaaaaaa-0000-0000-0000-000000000004', 'Diseno Grafico', 'DG', true),
  ('caaaaaaa-0000-0000-0000-000000000005', 'Comunicacion Audiovisual', 'CAV', true);


insert into public.products (id, name, category, description, featured, sort_order) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Camara Sony A7 III', 'Fotografia', 'Camara full frame sin espejo, 24 MP', true, 1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Tripode Manfrotto MT055', 'Fotografia', 'Tripode de aluminio con cabezal de bola', false, 2),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Laptop Dell XPS 15', 'Computo', 'Laptop de alto rendimiento para edicion', true, 3),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Microfono Rode NTG4', 'Audio', 'Microfono de canon direccional', false, 4);


-- El reparto esta elegido para que cada caso de prueba tenga un producto que lo ejercite:
--   producto 1 -> 3 unidades en Monterrico ..... rotacion justa (BR-12)
--   producto 2 -> 1 unidad en Monterrico ....... agotamiento y buffer
--   producto 3 -> 1 unidad en cada sede ........ filtro por sede (BR-14)
--   producto 4 -> 1 activa y 1 en mantenimiento  la de mantenimiento nunca se ofrece
insert into public.inventory_units (id, product_id, campus_id, unit_code, asset_code, status) values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-001', 'UPC-100001', 'active'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-002', 'UPC-100002', 'active'),
  ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-003', 'UPC-100003', 'active'),
  ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'TRI-001', 'UPC-100004', 'active'),
  ('dddddddd-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'LAP-001', 'UPC-100005', 'active'),
  ('dddddddd-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 'LAP-002', 'UPC-100006', 'active'),
  ('dddddddd-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'MIC-001', 'UPC-100007', 'active'),
  ('dddddddd-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'MIC-002', 'UPC-100008', 'maintenance');


-- URLS DE LA CUENTA DE DEMOSTRACION DE CLOUDINARY, y no del proyecto: son las
-- unicas publicas que se pueden versionar sin depender de la cuenta real.
--
-- CAMBIADAS EN LA F3-T3, y el motivo es una medicion. Antes apuntaban a
-- `demo/image/upload/seed/cam-001.jpg` y `.../seed/lap-001.jpg`, que NO
-- EXISTEN: medido el 2026-08-19 con `curl -I`, las dos responden 404 -- con
-- `content-type: image/gif`, que es el gif de error de Cloudinary --. Una URL
-- real de produccion responde 200 image/jpeg.
--
-- Daba igual mientras nadie mirara la foto en local. Deja de dar igual cuando
-- la lista de inventario y el mostrador pasan a mostrar la miniatura: la
-- pantalla se veria ROTA EN LOCAL Y BIEN EN PRODUCCION, que es la trampa numero 1
-- de este proyecto -- la de `products.featured` -- pero INVERTIDA. Lo que cuesta no
-- es creer que algo funciona: es creer que esta roto y "arreglar" codigo sano.
--
-- DOS URLS DISTINTAS y no la misma dos veces, a proposito: con la misma foto
-- en los dos productos, una miniatura pegada a la fila equivocada se veria
-- correcta y nadie lo notaria.
--
-- `cloudinary_public_id` se actualiza para que corresponda a la URL. No cambia
-- ningun comportamiento -- lo unico que lo lee es la insignia "sin
-- identificador de Cloudinary" de la galeria de administracion, que solo
-- reacciona al NULL -- pero un fixture cuyo identificador no case con su
-- propia URL es un fixture que miente, aunque sea poco.
insert into public.product_images (id, product_id, cloudinary_public_id, secure_url, format, is_main, sort_order) values
  ('faaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'sample', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'jpg', true, 0),
  ('faaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 'couple', 'https://res.cloudinary.com/demo/image/upload/couple.jpg', 'jpg', true, 0);


-- Fecha fija y futura respecto de la Fase 1, para que las pruebas de dia
-- inhabilitado no dependan de cuando se ejecuten.
insert into public.disabled_days (id, date, reason) values
  ('eeeeeeee-0000-0000-0000-000000000001', date '2026-12-25', 'Navidad');


-- Usuarios de prueba.
--
-- Las contrasenas son un literal inservible a proposito: las pruebas pgTAP no
-- inician sesion, falsifican el claim del JWT con
--   set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'
-- que es lo que lee auth.uid().
--
--   a0000000-...0001  alumno A
--   a0000000-...0002  alumno B
--   a0000000-...000a  admin
--   a0000000-...000b  operador
--   a0000000-...000f  externo, correo que no es de la UPC
--
-- Las CUATRO columnas de token en '' no son adorno: sin ellas NADIE puede
-- entrar en el stack local. GoTrue las lee como `string` de Go, no como
-- puntero, asi que un NULL le revienta el escaneo de la fila -"converting
-- NULL to string is unsupported"- y POST /otp responde 500 sin mandar el
-- magic link. La aplicacion parece rota y el defecto esta aca.
--
-- Por que son exactamente estas cuatro, medido contra information_schema:
-- son las unicas columnas de texto de auth.users SIN default. Las otras
-- cuatro de token -phone_change, phone_change_token,
-- email_change_token_current, reauthentication_token- llevan `default ''`,
-- asi que un INSERT que no las nombra ya las rellena solo. Un usuario creado
-- por la API de GoTrue nace con '' en las ocho; uno insertado a mano, no.
-- LAS CUATRO FECHAS SE SIEMBRAN DISTINTAS A PROPOSITO, y esto tampoco es
-- adorno (D-80, migracion 31).
--
-- `confirmation_sent_at` es NULLABLE y SIN DEFAULT -medido contra
-- information_schema-, asi que un INSERT que no la nombre la deja en NULL.
-- Antes daba igual: nadie la leia. Desde la migracion 31 la lee
-- primer_acceso_personal(), y con NULL la columna "Primer correo" de
-- /admin/personal saldria VACIA EN LOCAL Y LLENA EN PRODUCCION, con lint,
-- typecheck, build y el recorrido en navegador todos en verde. Es la trampa
-- nº 1 de este proyecto -la de products.featured- sobre otra columna.
--
-- Y SEPARADAS ENTRE SI porque si valieran todas now(), una funcion que
-- devolviera created_at o email_confirmed_at pasaria la prueba igual. El
-- orden imita al del proyecto real: se pide el enlace, se manda, se abre 21 s
-- despues, y se vuelve a entrar dias mas tarde.
--
--   created_at           hace 10 dias
--   confirmation_sent_at hace 10 dias + 1 s   <- el primer magic link
--   email_confirmed_at   hace 10 dias + 21 s
--   last_sign_in_at      hace 2 dias
--
-- `last_sign_in_at` se siembra por un motivo concreto: la prueba 39 afirma
-- que el valor devuelto NO es ninguna de las otras tres, y en SQL comparar
-- contra NULL no da falso, da NULL. Sin esta columna esa asercion no podria
-- escribirse.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, confirmation_sent_at, last_sign_in_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data, is_super_admin,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'alumno.a@upc.edu.pe', 'no-login', now() - interval '10 days' + interval '21 seconds', now() - interval '10 days' + interval '1 second', now() - interval '2 days', now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'alumno.b@upc.edu.pe', 'no-login', now() - interval '10 days' + interval '21 seconds', now() - interval '10 days' + interval '1 second', now() - interval '2 days', now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'admin@upc.edu.pe',    'no-login', now() - interval '10 days' + interval '21 seconds', now() - interval '10 days' + interval '1 second', now() - interval '2 days', now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'operador@upc.edu.pe', 'no-login', now() - interval '10 days' + interval '21 seconds', now() - interval '10 days' + interval '1 second', now() - interval '2 days', now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'alguien@gmail.com',   'no-login', now() - interval '10 days' + interval '21 seconds', now() - interval '10 days' + interval '1 second', now() - interval '2 days', now() - interval '10 days', now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');


-- El primer miembro del personal se siembra a mano porque no hay admin que lo
-- inserte y RLS bloquea el intento.
--
-- En produccion esto NO es una migracion: es una sentencia puntual con
-- service_role, una vez que la persona haya entrado con su cuenta UPC. Un correo
-- concreto es dato de entorno, no esquema.
insert into public.staff_members (user_id, role) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin'),
  ('a0000000-0000-0000-0000-00000000000b', 'operator');


-- Duraciones y buffers distintos por producto, para que las pruebas ejerciten
-- D-1 y D-10 en vez de leer siempre el valor por defecto.
--   producto 2 (tripode) -> buffer de 30 min: se revisa rapido
--   producto 3 (laptop)  -> hasta 8 horas: jornada completa de edicion
update public.products set buffer_minutes     = 30 where id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.products set max_duration_hours = 8  where id = 'bbbbbbbb-0000-0000-0000-000000000003';


-- Perfiles completos. El trigger de alta crea la fila con nombre y apellido en
-- nulo (D-9), y la RPC de reserva exige el perfil completo: sin esto ninguna
-- prueba de reserva pasaria de la primera validacion.
--
-- La prueba de "perfil incompleto" pone nombre en nulo dentro de su propia
-- transaccion, que se revierte.
-- D-79: Ana lleva confirmo_facultad = true y Bruno NO, a proposito.
--
-- Desde D-79 la puerta de /catalogo/[id]/reservar exige esa confirmacion, y la
-- columna nace en false. Sin esta linea las CUATRO pruebas E2E entran como Ana
-- -e2e/*.spec.ts la llaman ALUMNA_CON_PERFIL_COMPLETO- y rebotarian a
-- /completar-perfil: tres de las seis pruebas se caerian, y la constante que
-- la nombra pasaria a mentir.
--
-- Bruno se queda SIN confirmar porque hace falta un usuario con el perfil a
-- medias para caminar el recorrido de la primera reserva. Si algun dia una
-- prueba entra como Bruno esperando reservar, va a rebotar: es deliberado.
update public.alumnos
   set nombre = 'Ana', apellido = 'Perez',
       carrera_id = 'caaaaaaa-0000-0000-0000-000000000001',
       confirmo_facultad = true
 where auth_user_id = 'a0000000-0000-0000-0000-000000000001';

update public.alumnos
   set nombre = 'Bruno', apellido = 'Diaz',
       carrera_id = 'caaaaaaa-0000-0000-0000-000000000002'
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

-- NO se siembran reservas. 14_rls_alumnos.sql afirma que el operador solo se ve a
-- si mismo mientras no haya reservas vivas; una reserva sembrada rompe esa prueba.


-- F3-T4 / D-75: los horarios de sede y los turnos.
--
-- SE LLAMA A LA MISMA FUNCION QUE LLAMA LA MIGRACION 33, no se copia su INSERT.
-- El motivo esta medido: `db reset` aplica las migraciones y DESPUES corre este
-- archivo, asi que cuando la migracion siembra, `campuses` esta VACIA en local y
-- inserta CERO. En produccion inserta 14. Es el mismo desfase que el comentario
-- de salon_devolucion describe mas arriba, pero aqui NO se puede aceptar
-- duplicando la logica: si las dos versiones se separan, la que corre en
-- produccion es la que nadie probo, y su fallo deja a nadie pudiendo reservar.
--
-- Las horas salen de app_settings, que si existe a esta altura -la inserta la
-- migracion 11-, asi que el techo local es identico al de produccion.
select private.sembrar_horarios_por_defecto(s.opening_time, s.closing_time)
  from public.app_settings s;


-- Turnos del operador (a0000000-...-0000000b), que ya se siembra como staff.
--
-- Monterrico lleva los SIETE dias cubiertos de apertura a cierre, y esa es la
-- condicion que hace que las NUEVE baterias que llaman a create_reservation
-- sigan pasando sin tocarlas: todas reservan "manana a las 10:00" en Monterrico
-- contando con el horario 08:00-22:00.
insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
select 'a0000000-0000-0000-0000-00000000000b',
       'cccccccc-0000-0000-0000-000000000001',
       d.weekday,
       s.opening_time, s.closing_time
  from generate_series(0, 6) as d(weekday)
 cross join public.app_settings s;

-- San Miguel se queda SIN turno el miercoles (weekday = 3) A PROPOSITO: es el
-- unico caso que permite probar D-76 -distinguir "cerrado" de "sin operador
-- asignado"-, y sin el las dos situaciones darian cero franjas y ninguna prueba
-- podria separarlas.
--
-- No afecta a ninguna bateria existente: la unica prueba que menciona San Miguel
-- es 26_linter.sql, y la usa para leer product_availability, no para reservar.
-- Si algun dia una prueba reserva en San Miguel un miercoles, va a fallar: es
-- deliberado, igual que Bruno sin confirmo_facultad.
insert into public.staff_shifts (staff_id, campus_id, weekday, starts_at, ends_at)
select 'a0000000-0000-0000-0000-00000000000b',
       'cccccccc-0000-0000-0000-000000000002',
       d.weekday,
       s.opening_time, s.closing_time
  from generate_series(0, 6) as d(weekday)
 cross join public.app_settings s
 where d.weekday <> 3;
