-- D-77: el salon de devolucion es de la sede, no del producto.
--
-- MEDIDO EN PRODUCCION EL 2026-08-18, no supuesto: hay exactamente DOS salones
-- -SM-SB608 y MO-UH40- y NINGUN producto tiene unidades en las dos sedes, los
-- 34 tienen una sola. Ponerlo en el producto repetiria el mismo texto 34 veces
-- para dos valores distintos.
--
-- De donde sale el dato: estaba dentro de products.description, empaquetado
-- como "Lab: SM-SB608 | ...". La migracion siguiente lo saca de ahi (D-82).
--
-- SIN LINEA DE GRANT, Y NO ES UN OLVIDO: campuses tiene
-- "grant select ... to anon, authenticated" y "grant insert, update, delete ...
-- to authenticated" A NIVEL DE TABLA -20260805195304_catalog_policies.sql:21-32-,
-- asi que una columna nueva queda cubierta sola. Esto NO vale para alumnos ni
-- para app_settings, que enumeran columnas; ver la migracion de esta misma
-- tanda que toca alumnos, donde si hace falta la linea.
--
-- NULLABLE a proposito: una sede nueva puede darse de alta antes de saber en
-- que salon se devuelve, y un NOT NULL con default '' mentiria diciendo que ya
-- se sabe y que es la cadena vacia.

alter table public.campuses
  add column salon_devolucion text;

comment on column public.campuses.salon_devolucion is
  'Salon donde se devuelven los equipos de esta sede. Se muestra en el FAQ y en la ficha del producto.';

-- POR NOMBRE Y NO POR ID: los id de campuses son distintos en el seed local y
-- en produccion; los nombres coinciden.
update public.campuses set salon_devolucion = 'SM-SB608' where name = 'San Miguel';
update public.campuses set salon_devolucion = 'MO-UH40'  where name = 'Monterrico';
