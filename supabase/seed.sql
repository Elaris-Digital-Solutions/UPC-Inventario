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


insert into public.campuses (id, name, address, activo) values
  ('cccccccc-0000-0000-0000-000000000001', 'Monterrico', 'Av. Primavera 2390, Santiago de Surco', true),
  ('cccccccc-0000-0000-0000-000000000002', 'San Miguel', 'Av. Alameda San Marcos cuadra 2, San Miguel', true);


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


insert into public.product_images (id, product_id, cloudinary_public_id, secure_url, format, is_main, sort_order) values
  ('faaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'seed/cam-001', 'https://res.cloudinary.com/demo/image/upload/seed/cam-001.jpg', 'jpg', true, 0),
  ('faaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 'seed/lap-001', 'https://res.cloudinary.com/demo/image/upload/seed/lap-001.jpg', 'jpg', true, 0);


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
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'alumno.a@upc.edu.pe', 'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'alumno.b@upc.edu.pe', 'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'admin@upc.edu.pe',    'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'operador@upc.edu.pe', 'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'alguien@gmail.com',   'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false);


-- El primer miembro del personal se siembra a mano porque no hay admin que lo
-- inserte y RLS bloquea el intento.
--
-- En produccion esto NO es una migracion: es una sentencia puntual con
-- service_role, una vez que la persona haya entrado con su cuenta UPC. Un correo
-- concreto es dato de entorno, no esquema.
insert into public.staff_members (user_id, role) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin'),
  ('a0000000-0000-0000-0000-00000000000b', 'operator');
