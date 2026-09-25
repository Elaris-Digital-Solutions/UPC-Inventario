-- Una nota de unidad puede decir de que reserva es (2026-09-25).
--
-- Antes la nota colgaba solo de la unidad, asi que /admin/reservas no tenia
-- forma de saber que se anoto al devolver ESE prestamo. La columna es opcional:
-- la nota general del mostrador y las que ya existian no tienen reserva.
--
-- FK COMPUESTA (reservation_id, unit_id) y no solo reservation_id: asi una nota
-- no puede colgar de la reserva de otra unidad. Para eso hace falta el UNIQUE
-- (id, unit_id), que ya se cumple porque id es la clave primaria.
--
-- SET NULL (reservation_id) y no la columna entera: unit_id es NOT NULL, y la
-- nota tiene que sobrevivir en el historial de la unidad si la reserva se borra.
--
-- Prueba: supabase/tests/51_nota_de_reserva.sql.

alter table public.inventory_reservations
  add constraint inventory_reservations_id_unit_key unique (id, unit_id);

alter table public.inventory_unit_notes
  add column reservation_id uuid,
  add constraint inventory_unit_notes_reservation_fkey
    foreign key (reservation_id, unit_id)
    references public.inventory_reservations (id, unit_id)
    on delete set null (reservation_id);

create index idx_unit_notes_reservation
  on public.inventory_unit_notes (reservation_id, unit_id);

grant insert (reservation_id) on public.inventory_unit_notes to authenticated;
