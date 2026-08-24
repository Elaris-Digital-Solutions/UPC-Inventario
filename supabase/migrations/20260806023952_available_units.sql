-- Disponibilidad por franja (tarea 1.10).
--
-- El diseno decia que esto era una columna nueva de product_availability. No
-- puede serlo: la disponibilidad depende de la franja que se pregunte y una vista
-- no recibe parametros. product_availability se queda contando stock por sede;
-- la franja la responde esta funcion.
--
-- SECURITY DEFINER, y no por comodidad. Un alumno solo ve sus propias reservas
-- -reservations_select_own-, asi que evaluando el NOT EXISTS con sus privilegios
-- las reservas ajenas serian invisibles y la funcion le diria que esta libre todo
-- lo que otros tienen ocupado. Justo el error que hace que un calendario ofrezca
-- franjas que luego la RPC rechaza.
--
-- Devuelve un CONTEO, no filas. Por eso saltarse el RLS aqui no filtra nada:
-- quien pregunta se entera de cuantas quedan, nunca de quien las tiene.
--
-- El rango candidato se construye igual que blocked_range -buffer del producto
-- sumado solo al final, limite inferior cerrado y superior abierto-, para que la
-- respuesta coincida exactamente con lo que el EXCLUDE dejaria pasar. Si las dos
-- formulas se separan, el calendario miente.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 7, y la correccion 3 de
-- MIGRATION_DOCS/PLANES/TANDA_3.md.

create or replace function public.available_units(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_start_at         timestamptz,
  p_duration_minutes int
) returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
    from public.inventory_units u
   where u.product_id = p_product_id
     and u.campus_id  = p_campus_id
     and u.status     = 'active'
     and not exists (
       select 1
         from public.inventory_reservations r
        where r.unit_id = u.id
          and r.status in ('reserved', 'active')
          and r.blocked_range && tstzrange(
                p_start_at,
                p_start_at
                  + make_interval(mins => p_duration_minutes)
                  + make_interval(mins => coalesce(
                      (select p.buffer_minutes from public.products p where p.id = p_product_id),
                      120)),
                '[)')
     );
$$;

revoke execute on function
  public.available_units(uuid, uuid, timestamptz, int) from public, anon;
grant execute on function
  public.available_units(uuid, uuid, timestamptz, int) to authenticated;
