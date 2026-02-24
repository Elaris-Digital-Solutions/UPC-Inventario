BEGIN;

DELETE FROM inventory_unit_notes;
DELETE FROM inventory_reservations;
DELETE FROM inventory_units;
DELETE FROM product_images;
DELETE FROM products;

COMMIT;
