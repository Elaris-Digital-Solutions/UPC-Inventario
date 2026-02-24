BEGIN;

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS format text;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS bytes bigint;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS height integer;

COMMIT;
