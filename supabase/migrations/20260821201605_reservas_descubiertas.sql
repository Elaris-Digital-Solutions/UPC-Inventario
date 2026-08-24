-- D-92, que cierra Q-21: al borrar o acortar un turno se AVISA cuantas reservas
-- quedan descubiertas, y no se impide.
--
-- POR QUE ESTO ES SQL Y NO TypeScript, que es donde el plan lo ponia. La cuenta
-- que D-92 pide es "recalcular la cobertura SIN ese turno", y la cobertura ya
-- esta escrita DOS veces en la migracion 34 -en available_slots y en el paso
-- 6-bis de create_reservation-, con una nota en cada una diciendo que las dos
-- tienen que ser identicas o el calendario miente. Una TERCERA copia en
-- JavaScript seria un tercer sitio del que separarse, y ademas el unico que
-- nadie puede probar con pgTAP. Es el mismo argumento que hizo nacer
-- private.sembrar_horarios_por_defecto() en la migracion 33: la logica vive
-- donde ya vive el dato.
--
-- LA CUENTA QUE NO ES, y por eso D-92 la escribio antes de implementarla: "las
-- reservas que caian dentro de ese turno" NO es la cifra. Con la cobertura por
-- union (D-90), el turno de un compañero puede seguir cubriendolas, asi que ese
-- total sale INFLADO y el admin decidiria sobre un numero que mide otra cosa.
-- Es la forma exacta del defecto que la migracion 28 ya cobro.
--
-- SECURITY INVOKER -el de por defecto, y se dice porque en este proyecto casi
-- todo lo demas es definer-. No hace falta definer: el admin YA puede leer
-- inventory_reservations y staff_shifts por sus politicas, asi que RLS decide
-- sola y no hay que repetir private.is_admin() aqui. A quien no sea personal,
-- staff_shifts le devuelve cero filas y la funcion le contesta sobre un mundo
-- vacio: no se le escapa nada de nadie.
--
-- SIRVE PARA LAS DOS OPERACIONES, borrar y acortar, y por eso recibe el horario
-- NUEVO en vez de un booleano: con p_starts_at y p_ends_at en NULL el turno
-- desaparece, y con valores se sustituye por ellos. Un parametro "va a
-- borrarse" habria obligado a una segunda funcion para el acortamiento, y las
-- dos habrian tenido que mantener la misma cuenta.

create or replace function public.reservas_descubiertas(
  p_shift_id  uuid,
  p_starts_at time default null,
  p_ends_at   time default null
) returns int
language sql stable set search_path = ''
as $$
  with turno as (
    select sh.campus_id, sh.weekday
      from public.staff_shifts sh
     where sh.id = p_shift_id
  ),
  -- El mundo DESPUES del cambio: los demas turnos de esa sede y ese dia, mas el
  -- horario nuevo si lo hay. Sobre esto se recalcula la cobertura.
  turnos as (
    select sh.starts_at, sh.ends_at
      from public.staff_shifts sh, turno t
     where sh.campus_id = t.campus_id
       and sh.weekday   = t.weekday
       and sh.id <> p_shift_id
    union all
    select p_starts_at, p_ends_at
     where p_starts_at is not null
       and p_ends_at   is not null
  ),
  -- El universo, acotado contra el enum reservation_status y no recordado:
  -- reservas NO TERMINADAS. Nunca cancelled, completed, not_picked_up ni
  -- not_returned, que ya no esperan a nadie en el mostrador.
  --
  -- `end_at > now()` NO estaba en D-92 y se añade con su motivo: una reserva que
  -- ya termino no puede "quedar descubierta", y contarla inflaria el numero, que
  -- es justo lo que D-92 existe para evitar. Los turnos son SEMANALES -por
  -- weekday-, asi que sin este filtro contarian tambien los lunes de hace un mes.
  --
  -- SE MIRA EL INTERVALO ENTERO [start_at, end_at) y no solo el inicio: un turno
  -- que desaparece por la tarde descubre la DEVOLUCION de una reserva retirada
  -- por la mañana.
  -- OJO: LA SEDE NO ESTA EN LA RESERVA, esta en la UNIDAD. Medido y no supuesto:
  -- inventory_reservations no tiene columna campus_id -sus doce columnas son id,
  -- product_id, unit_id, alumno_id, purpose, cancellation_reason, start_at,
  -- end_at, status, created_at, updated_at y blocked_range-, asi que la sede se
  -- alcanza por unit_id.
  vivas as (
    select r.start_at, r.end_at
      from public.inventory_reservations r
      join public.inventory_units u on u.id = r.unit_id
     cross join turno t
     where u.campus_id = t.campus_id
       and r.status in ('reserved', 'active')
       and r.end_at > now()
       and extract(dow from (r.start_at at time zone 'America/Lima'))::smallint = t.weekday
  )
  select count(*)::int
    from vivas v
   where exists (
     -- "Le queda algun bloque sin cubrir", que es la negacion exacta de la
     -- cobertura de available_slots y del paso 6-bis de create_reservation. Los
     -- bloques se recorren igual, con el mismo slot_minutes y el mismo
     -- 'America/Lima', porque una cuenta distinta aqui daria un aviso que no
     -- corresponde a lo que la RPC va a hacer.
     select 1
       from generate_series(
              v.start_at,
              v.end_at - make_interval(mins => (select s.slot_minutes from public.app_settings s)),
              make_interval(mins => (select s.slot_minutes from public.app_settings s))
            ) as b(bloque)
      where not exists (
        select 1
          from turnos sh
         where sh.starts_at <= (b.bloque at time zone 'America/Lima')::time
           and sh.ends_at   >= ((b.bloque
                 + make_interval(mins => (select s.slot_minutes from public.app_settings s)))
                 at time zone 'America/Lima')::time
      )
   );
$$;

-- Al crear una funcion, PUBLIC recibe EXECUTE por defecto y PostgREST publica en
-- /rest/v1/rpc/ toda funcion que el rol pueda ejecutar. Se revoca y se concede a
-- mano, como el resto del proyecto: `anon` no la necesita -no hay pantalla sin
-- sesion que la llame- y `authenticated` si, porque quien la llama es la
-- pantalla del admin.
revoke execute on function public.reservas_descubiertas(uuid, time, time) from public, anon;
grant  execute on function public.reservas_descubiertas(uuid, time, time) to authenticated;
