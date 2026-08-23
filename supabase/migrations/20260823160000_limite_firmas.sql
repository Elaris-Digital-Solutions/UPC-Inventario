-- H-2 de la auditoria del 2026-08-23: tope de firmas de Cloudinary por hora.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- QUE CUBRE ESTO Y QUE NO, dicho por delante para que nadie lo confunda.
--
-- ESTO NO ES PROTECCION CONTRA DDoS. Un DDoS volumetrico no se para desde
-- Postgres ni desde Next.js: se para en una CDN o un WAF delante del sitio. Eso
-- es Cloudflare y es una decision de infraestructura, no de codigo.
--
-- LO QUE SI CUBRE es el unico camino de este proyecto que le cuesta DINERO a la
-- universidad: `POST /api/cloudinary/firmas` devolvia una firma valida por
-- llamada, SIN NINGUN TOPE. Una sesion de admin robada -o un bucle accidental en
-- un `useEffect`- consigue subidas ilimitadas contra la cuenta de Cloudinary.
--
-- Y ES EL UNICO SITIO DEL PROYECTO DONDE HACIA FALTA CODIGO NUEVO, porque los
-- demas caminos ya tienen su tope por diseno:
--   - `create_reservation` .... `daily_limit_per_product`, tope por producto y dia.
--   - `guardarEncuesta` ....... `upsert` con `onConflict`: reescribe UNA fila,
--                               no crea filas nuevas.
--   - el texto largo .......... lo cerro H-1, la migracion anterior.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE UNA TABLA Y NO UN CONTADOR EN MEMORIA. En serverless cada peticion
-- puede caer en una instancia distinta, asi que un `Map` de modulo cuenta por
-- instancia y no por persona: con diez instancias el tope real seria diez veces
-- el escrito. La tabla es el unico estado que todas comparten.
--
-- POR QUE NO SE CUENTAN LAS IMAGENES DE `product_images`, que ya existe y ya
-- tiene `created_at`. Seria mas barato y NO cubriria el vector: la firma se pide
-- una vez por lote y la imagen se registra DESPUES, asi que quien pida firmas y
-- suba a Cloudinary sin registrar nada en la base no aparece en ese recuento --
-- y ese es exactamente el ataque, porque lo que se llena es Cloudinary, no
-- Postgres. Hay que contar lo que se EMITE, no lo que se guarda.
--
-- EN `private` Y NO EN `public`: ahi no la alcanza PostgREST. Nadie tiene por
-- que poder leer ni escribir este contador desde la API.

create table private.firmas_emitidas (
  user_id uuid        not null,
  -- Truncada a la hora: la clave primaria compuesta convierte "cuantas van esta
  -- hora" en una sola fila por persona y hora, sin necesidad de contar filas.
  hora    timestamptz not null,
  n       integer     not null default 1,
  primary key (user_id, hora)
);

-- La tabla vive en `private`, que ya esta cerrado a `public` desde la Fase 1.
-- El revoke no sobra: es la leccion que costo seis funciones de trigger
-- publicadas en /rest/v1/rpc/ el 2026-08-05.
revoke all on table private.firmas_emitidas from public, anon, authenticated;


-- Sustituye a la comprobacion de `staff_members` que hacia el route handler a
-- mano. DOS GANANCIAS, y la segunda importa mas que la primera:
--
--   1. El chequeo de admin y el contador quedan en la MISMA transaccion, asi que
--      no hay ventana entre "es admin" y "cuenta una firma".
--   2. Desaparece el unico sitio del proyecto donde el CLIENTE decidia. El
--      comentario del route handler lo decia literal: "en todo lo demas quien
--      autoriza es RLS y el codigo de cliente es COMODIDAD; aca no se cumple".
--      Ahora si se cumple: quien autoriza es la base.
create or replace function public.pedir_firma_cloudinary()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  -- Mismo predicado que usaba el handler, y con el mismo motivo: `is_admin()`
  -- exige ademas `activo`, asi que un admin desactivado no consigue firma.
  if not private.is_admin() then
    raise exception 'Solo un administrador sube imagenes' using errcode = '42501';
  end if;

  -- Limpieza de lo viejo, aqui y no en un cron: con un tope de 60/hora y un
  -- punado de administradores, la tabla no pasa de unas decenas de filas y esto
  -- cuesta menos que mantener un pg_cron. `> 2 horas` y no `> 1`: borrar la
  -- frontera exacta podria quitar la fila de la hora en curso en el instante del
  -- cambio de hora.
  delete from private.firmas_emitidas
   where hora < date_trunc('hour', now()) - interval '2 hours';

  insert into private.firmas_emitidas (user_id, hora)
  values ((select auth.uid()), date_trunc('hour', now()))
  on conflict (user_id, hora)
    do update set n = private.firmas_emitidas.n + 1
  returning n into v_n;

  -- SESENTA POR HORA. De donde sale: la pantalla pide UNA firma por LOTE de
  -- archivos, no una por archivo -- lo dice el comentario de
  -- components/admin/subida-imagenes.tsx-, asi que un admin cargando el
  -- inventario entero de una sede gasta unas pocas. Sesenta es un lote por
  -- minuto durante una hora seguida: imposible de alcanzar a mano y muy por
  -- debajo de lo que costaria un bucle.
  --
  -- 54000 es `program_limit_exceeded`. Se elige un SQLSTATE que NO comparta
  -- nadie mas en este esquema para que el handler pueda distinguirlo del 42501
  -- y contestar 429 en vez de 403.
  if v_n > 60 then
    raise exception 'Demasiadas subidas en la ultima hora' using errcode = '54000';
  end if;

  -- OJO CON UNA PROPIEDAD QUE PARECE UN DEFECTO Y NO LO ES: el `raise` revierte
  -- la transaccion, y con ella el incremento. O sea que el contador se queda
  -- clavado en 60 y cada intento posterior sube a 61 y vuelve a fallar. Sigue
  -- rechazando, que es lo que hace falta, y ademas evita que el contador crezca
  -- sin limite mientras alguien insiste.
end $$;

revoke execute on function public.pedir_firma_cloudinary() from public, anon;
grant  execute on function public.pedir_firma_cloudinary() to authenticated;
