-- Anti-doble-reserva (tarea 1.6, corrige P1-6).
--
-- El EXCLUDE no puede calcular el buffer sobre la marcha. `timestamptz - interval`
-- esta marcada STABLE, no IMMUTABLE, porque el resultado depende del huso horario
-- en vigor, y las expresiones de indice exigen IMMUTABLE. No compilan ni
--   exclude using gist (..., tstzrange(start_at, end_at + '2h'))
-- ni una columna generada equivalente.
--
-- La salida es una columna real poblada por trigger: un trigger si puede usar
-- funciones STABLE, y de paso lee el buffer del producto en vez de una constante.
--
-- El buffer se suma SOLO AL FINAL. Con A = [10:00, 12:00) y buffer de 2 h, si se
-- expandieran las dos reservas 2 h a cada lado, una B que empezara a las 14:00
-- -exactamente el buffer despues- se rechazaria: [08:00,14:00) y [12:00,18:00) se
-- solapan. Sumando el buffer completo solo al final, [10:00,14:00) contra
-- [14:00,18:00) no se tocan y B pasa; una B a las 13:00 si se rechaza. Da una
-- separacion minima exacta de 2 h en ambos sentidos.
--
-- El EXCLUDE es parcial a proposito: sin el WHERE, una reserva cancelada seguiria
-- bloqueando su franja para siempre.
--
-- blocked_range es NOT NULL a proposito: un rango nulo nunca entra en conflicto,
-- asi que sin esa restriccion el constraint se podria esquivar dejandola vacia.
--
-- Nota operativa: cambiar products.buffer_minutes NO reescribe los blocked_range
-- ya guardados. Afecta solo a las reservas nuevas. Si hiciera falta, se rehacen
-- con un UPDATE que toque start_at y dispare el trigger.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.2.


alter table public.inventory_reservations add column blocked_range tstzrange;


create or replace function public.set_blocked_range() returns trigger
  language plpgsql set search_path = '' as $$
  declare v_buffer smallint;
  begin
    select p.buffer_minutes into v_buffer
      from public.products p
     where p.id = new.product_id;

    new.blocked_range := tstzrange(
      new.start_at,
      new.end_at + make_interval(mins => coalesce(v_buffer, 120)),
      '[)'
    );
    return new;
  end $$;

create trigger trg_set_blocked_range
  before insert or update of start_at, end_at, product_id
  on public.inventory_reservations
  for each row execute function public.set_blocked_range();


-- La tabla esta vacia, asi que el NOT NULL no necesita rellenar nada.
alter table public.inventory_reservations alter column blocked_range set not null;


-- btree_gist aporta el operador = para uuid dentro de un indice gist. Se instalo
-- en el esquema extensions en 20260805184306_extensions.sql.
--
-- El opclass va CUALIFICADO, y no es cosmetica. El primer intento ponia
--   set local search_path = public, extensions;
-- en la cabecera, y la CLI respondio
--   WARNING (25P01): SET LOCAL can only be used in transaction blocks
-- porque aplica cada migracion fuera de un bloque explicito. Es decir, la linea no
-- hacia nada y el constraint se creaba gracias al search_path que Supabase deja
-- puesto en la base, no gracias al archivo. Cualificando el opclass, la migracion
-- deja de depender de una configuracion que no se ve en ella.
--
-- range_ops, en cambio, no se cualifica: el gist de tstzrange lo trae pg_catalog,
-- que siempre es implicito.
alter table public.inventory_reservations
  add constraint inventory_reservations_no_overlap
  exclude using gist (unit_id extensions.gist_uuid_ops with =, blocked_range with &&)
  where (status in ('reserved', 'active'));
