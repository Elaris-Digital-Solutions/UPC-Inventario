-- =============================================================================
-- UPC Inventario — Clean PostgreSQL Schema (Local Migration)
-- =============================================================================
-- Target  : PostgreSQL 13+
--           gen_random_uuid() is built-in from PG 13.
--           On PG 12 or below, uncomment the pgcrypto extension and replace
--           gen_random_uuid() with uuid_generate_v4() where needed.
--
-- Tables  : products, product_images, inventory_units,
--           inventory_unit_notes, inventory_reservations
--
-- Extras  : updated_at trigger, create_inventory_reservation() RPC function
--
-- Notes   : • No Supabase-specific RLS policies (not needed on local PG).
--           • No "anon"/"authenticated" roles assumed.
--           • SECURITY DEFINER removed from the RPC — use standard role grants.
--           • products gains two new columns: campus and image_path.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
-- Uncomment if you are on PostgreSQL 12 or below:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ===========================================================================
-- TABLE: products
-- ===========================================================================
-- Central product catalogue. One row per equipment type/model.
-- physical quantities are tracked in inventory_units (one row per device).
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Display information
    name              TEXT          NOT NULL,
    category          TEXT          NOT NULL,
    description       TEXT,

    -- Pricing (kept at 0 for the inventory use-case; required by app type)
    price             NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- Legacy image columns.
    -- The app reads product_images first and falls back to main_image.
    -- When importing from Excel, populate image_path AND main_image with
    -- the same local relative path (e.g. /images/laptop-dell.jpg).
    main_image        TEXT,
    additional_images TEXT[]         NOT NULL DEFAULT '{}',

    -- NEW: origin campus from the unified Excel sheet.
    -- A product may be available on both campuses (campus = NULL) or
    -- restricted to one. The actual per-unit campus lives in inventory_units.
    campus            TEXT          CHECK (campus IN ('Monterrico', 'San Miguel')),

    -- NEW: relative path to the locally-hosted product image.
    -- Example values: /images/laptop-dell-01.jpg
    --                 /images/camera-sony-03.jpg
    -- Used as the authoritative image source when Cloudinary is not in use.
    image_path        TEXT,

    -- Inventory state flags
    featured          BOOLEAN       NOT NULL DEFAULT false,
    in_stock          BOOLEAN       NOT NULL DEFAULT true,
    stock             INTEGER       NOT NULL DEFAULT 0,

    -- Flexible JSONB columns (kept for full app compatibility)
    variants          JSONB,          -- [{size, stock, price?}, ...]
    image_settings    JSONB,          -- {imageId: {brightness, contrast, crop?}}

    -- Per-product image display adjustments (0–200 scale)
    brightness        NUMERIC(5, 2),
    contrast          NUMERIC(5, 2),

    -- Display order in the admin panel drag-and-drop list
    sort_order        INTEGER       NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  products              IS 'Equipment catalogue. One row per product model.';
COMMENT ON COLUMN products.campus       IS 'Origin campus from unified Excel import. Availability per campus is derived from inventory_units.campus.';
COMMENT ON COLUMN products.image_path   IS 'Relative path to locally-hosted image, e.g. /images/laptop-dell.jpg';
COMMENT ON COLUMN products.main_image   IS 'Legacy fallback image URL/path used when product_images has no rows for this product.';
COMMENT ON COLUMN products.image_settings IS 'JSONB map of per-image brightness/contrast/crop overrides used by the admin panel.';


-- ===========================================================================
-- TABLE: product_images
-- ===========================================================================
-- Stores per-product image records.
-- secure_url holds either a full Cloudinary HTTPS URL or a local relative
-- path (/images/...).  public_id is the Cloudinary asset ID; NULL for local.
-- ---------------------------------------------------------------------------
CREATE TABLE product_images (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- URL or local path for this image
    public_id  TEXT,                         -- Cloudinary public_id; NULL for local images
    secure_url TEXT        NOT NULL,          -- Full URL or relative path

    is_main    BOOLEAN     NOT NULL DEFAULT false,
    sort_order INTEGER     NOT NULL DEFAULT 0,

    -- Optional Cloudinary upload metadata (nullable; app handles missing columns gracefully)
    format     TEXT,
    bytes      BIGINT,
    width      INTEGER,
    height     INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  product_images           IS 'Per-product image records. Supersedes products.main_image for new products.';
COMMENT ON COLUMN product_images.secure_url IS 'Full CDN URL (Cloudinary) or local relative path (/images/...).';
COMMENT ON COLUMN product_images.public_id  IS 'Cloudinary public_id; NULL when using locally-hosted images.';


-- ===========================================================================
-- TABLE: inventory_units
-- ===========================================================================
-- Each row represents one physical device that can be reserved.
-- Multiple units can belong to the same product.
-- One product can have units on different campuses.
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_units (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent product
    product_id   UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Human-readable identifier for the device (barcode, serial, custom code)
    unit_code    TEXT    NOT NULL,

    -- Physical location of this specific device
    campus       TEXT    NOT NULL DEFAULT 'Monterrico'
                         CHECK (campus IN ('Monterrico', 'San Miguel')),

    -- Optional fixed-asset registry code ("activo fijo")
    asset_code   TEXT,

    -- Lifecycle status
    status       TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'maintenance', 'retired')),

    -- Denormalized last-note for fast display without a notes join
    current_note TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A unit_code must be unique within a product (across all campuses)
    CONSTRAINT uq_inventory_units_product_unit UNIQUE (product_id, unit_code)
);

COMMENT ON TABLE  inventory_units              IS 'One row per physical device. Status and campus control reservation eligibility.';
COMMENT ON COLUMN inventory_units.current_note IS 'Denormalized copy of the latest note. Full history is in inventory_unit_notes.';
COMMENT ON COLUMN inventory_units.asset_code   IS 'Optional fixed-asset registry code (activo fijo).';


-- ===========================================================================
-- TABLE: inventory_unit_notes
-- ===========================================================================
-- Append-only audit log of notes per physical unit.
-- current_note in inventory_units is the denormalized latest entry.
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_unit_notes (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id    UUID    NOT NULL REFERENCES inventory_units(id) ON DELETE CASCADE,
    note       TEXT    NOT NULL,

    -- Optional author identifier (currently always NULL in the application)
    created_by TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_unit_notes IS 'Append-only note history per inventory unit. Never delete or update rows.';


-- ===========================================================================
-- TABLE: inventory_reservations
-- ===========================================================================
-- A reservation links a requester to a specific physical unit for a time slot.
-- The application uses the create_inventory_reservation() function to create
-- reservations atomically (avoiding double-booking races).
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_reservations (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which product was requested (kept for fast reporting without unit join)
    product_id     UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Which physical unit was assigned
    unit_id        UUID    NOT NULL REFERENCES inventory_units(id) ON DELETE RESTRICT,

    -- Requester identity
    requester_name TEXT    NOT NULL,
    requester_code TEXT,              -- UPC student code or DNI (optional)

    -- Usage context
    purpose        TEXT,             -- Reason for the reservation (optional)
    cancellation_reason TEXT,        -- Reason when reservation is cancelled (optional)

    -- Time window — max 2 hours enforced by CHECK and by the RPC function
    start_at       TIMESTAMPTZ NOT NULL,
    end_at         TIMESTAMPTZ NOT NULL,

    -- Lifecycle status
    status         TEXT    NOT NULL DEFAULT 'reserved'
                           CHECK (status IN ('reserved', 'cancelled', 'completed')),

    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Business-rule constraints
    CONSTRAINT chk_reservation_time_order    CHECK (end_at > start_at),
    CONSTRAINT chk_reservation_max_duration  CHECK ((end_at - start_at) <= INTERVAL '2 hours')
);

COMMENT ON TABLE  inventory_reservations IS 'Equipment reservations. Create via create_inventory_reservation() to prevent race conditions.';
COMMENT ON COLUMN inventory_reservations.unit_id IS 'ON DELETE RESTRICT: units with active reservations cannot be deleted.';


-- ===========================================================================
-- INDEXES
-- ===========================================================================

-- products -----------------------------------------------
-- Catalog page queries sort by sort_order
CREATE INDEX idx_products_sort_order ON products(sort_order ASC);
-- Admin category filter
CREATE INDEX idx_products_category   ON products(category);
-- Excel-import campus filter
CREATE INDEX idx_products_campus     ON products(campus);

-- product_images ------------------------------------------
-- Admin panel: load all images for a product
CREATE INDEX idx_product_images_product_id    ON product_images(product_id);
-- Ordered image fetch (is_main first, then by sort_order, then by created_at)
CREATE INDEX idx_product_images_product_order ON product_images(product_id, is_main DESC, sort_order ASC, created_at ASC);

-- inventory_units -----------------------------------------
-- Joined queries from reservations panel and catalog
CREATE INDEX idx_inventory_units_product_id ON inventory_units(product_id);
-- Status filter used by catalog availability check
CREATE INDEX idx_inventory_units_status     ON inventory_units(status);
-- Composite index: critical path in create_inventory_reservation()
-- and in the Catalog page's campus-stock aggregation
CREATE INDEX idx_inventory_units_product_campus_status
    ON inventory_units(product_id, campus, status);

-- inventory_unit_notes ------------------------------------
-- Load note history for a unit (sorted newest-first)
CREATE INDEX idx_inventory_unit_notes_unit_created
    ON inventory_unit_notes(unit_id, created_at DESC);

-- inventory_reservations ----------------------------------
-- Admin panel: filter by product
CREATE INDEX idx_inventory_res_product_id ON inventory_reservations(product_id);
-- Join from unit detail
CREATE INDEX idx_inventory_res_unit_id    ON inventory_reservations(unit_id);
-- Status filter used by verification and stats panels
CREATE INDEX idx_inventory_res_status     ON inventory_reservations(status);
-- Critical: overlap detection inside create_inventory_reservation()
-- Covers: unit_id = ? AND status = 'reserved' AND start_at < ? AND end_at > ?
CREATE INDEX idx_inventory_res_overlap
    ON inventory_reservations(unit_id, status, start_at, end_at)
    WHERE status = 'reserved';


-- ===========================================================================
-- TRIGGER: auto-update updated_at
-- ===========================================================================
-- Shared trigger function — reused by every table that has updated_at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- products
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- inventory_units
CREATE TRIGGER trg_inventory_units_updated_at
    BEFORE UPDATE ON inventory_units
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ===========================================================================
-- FUNCTION: create_inventory_reservation
-- ===========================================================================
-- Atomically selects the least-used available unit for a given product,
-- campus, and time window, then inserts the reservation row.
--
-- Race-condition protection:  FOR UPDATE SKIP LOCKED ensures two concurrent
-- requests for the same slot do not both receive the same unit.
--
-- Called by the frontend via Supabase .rpc("create_inventory_reservation", {...})
-- On a local PG server, call it directly: SELECT create_inventory_reservation(...)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_inventory_reservation(
    p_product_id     UUID,
    p_campus         TEXT,
    p_requester_name TEXT,
    p_requester_code TEXT,
    p_start_at       TIMESTAMPTZ,
    p_end_at         TIMESTAMPTZ,
    p_purpose        TEXT DEFAULT NULL
)
RETURNS inventory_reservations
LANGUAGE plpgsql
AS $$
DECLARE
    v_unit_id     UUID;
    v_reservation inventory_reservations;
BEGIN
    -- ---- Input validation ------------------------------------------------
    IF p_campus NOT IN ('Monterrico', 'San Miguel') THEN
        RAISE EXCEPTION 'La sede es inválida: %', p_campus;
    END IF;

    IF p_requester_name IS NULL OR trim(p_requester_name) = '' THEN
        RAISE EXCEPTION 'El nombre del solicitante es obligatorio';
    END IF;

    IF p_end_at <= p_start_at THEN
        RAISE EXCEPTION 'La hora de fin debe ser mayor que la hora de inicio';
    END IF;

    IF (p_end_at - p_start_at) > INTERVAL '2 hours' THEN
        RAISE EXCEPTION 'La reserva no puede exceder 2 horas';
    END IF;

    -- ---- Unit selection -------------------------------------------------
    -- Picks the active unit on the requested campus with:
    --   1. Fewest total uses (fair rotation across units)
    --   2. Oldest last-use date (avoids hammering recently-returned units)
    --   3. Alphabetical unit_code (deterministic tiebreaker)
    -- The NOT EXISTS subquery ensures no active reservation overlaps the slot.
    -- FOR UPDATE SKIP LOCKED prevents two concurrent transactions from picking
    -- the same unit simultaneously.
    SELECT iu.id
    INTO   v_unit_id
    FROM   inventory_units iu
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*)::INT    AS uses_count,
            MAX(r.start_at)  AS last_used_at
        FROM inventory_reservations r
        WHERE r.unit_id = iu.id
          AND r.status IN ('reserved', 'completed')
    ) usage_stats ON true
    WHERE  iu.product_id = p_product_id
      AND  iu.campus     = p_campus
      AND  iu.status     = 'active'
      AND  NOT EXISTS (
               SELECT 1
               FROM   inventory_reservations overlap
               WHERE  overlap.unit_id   = iu.id
                 AND  overlap.status    = 'reserved'
                 AND  overlap.start_at  < p_end_at
                 AND  overlap.end_at    > p_start_at
           )
    ORDER BY
        usage_stats.uses_count  ASC NULLS FIRST,
        usage_stats.last_used_at ASC NULLS FIRST,
        iu.unit_code             ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'No hay unidades disponibles para el rango solicitado en %', p_campus;
    END IF;

    -- ---- Create reservation ---------------------------------------------
    INSERT INTO inventory_reservations (
        product_id,
        unit_id,
        requester_name,
        requester_code,
        purpose,
        start_at,
        end_at,
        status
    ) VALUES (
        p_product_id,
        v_unit_id,
        p_requester_name,
        p_requester_code,
        p_purpose,
        p_start_at,
        p_end_at,
        'reserved'
    )
    RETURNING * INTO v_reservation;

    RETURN v_reservation;
END;
$$;

COMMENT ON FUNCTION create_inventory_reservation IS
    'Atomically assigns the least-used available unit and creates the reservation. '
    'Must be called inside a transaction when used from application code.';


-- ===========================================================================
-- EXCEL IMPORT — Recommended workflow
-- ===========================================================================
--
-- Prerequisites
-- -------------
-- 1. Export the unified Excel sheet to CSV with the following columns:
--
--    name, category, description, campus, image_path,
--    unit_code, asset_code, initial_note
--
--    • One row per physical unit (not per product).
--    • If a product has 3 units, it appears 3 times with different unit_code values.
--    • image_path: relative path, e.g. /images/laptop-dell.jpg
--    • campus: exactly "Monterrico" or "San Miguel"
--    • asset_code and initial_note may be empty.
--
-- 2. Place the CSV at a path readable by the PostgreSQL server (for COPY)
--    or use psql \copy for client-side loading.
--
-- Step 1 — Load raw CSV into a staging table
-- -------------------------------------------

CREATE TEMP TABLE tmp_excel_import (
    name          TEXT,
    category      TEXT,
    description   TEXT,
    campus        TEXT,
    image_path    TEXT,
    unit_code     TEXT,
    asset_code    TEXT,
    initial_note  TEXT
);

-- Server-side load (file must be on the PG server):
-- COPY tmp_excel_import
--     FROM '/absolute/path/to/unified_inventory.csv'
--     CSV HEADER;

-- Client-side load (file on your machine, run from psql):
-- \copy tmp_excel_import FROM 'C:/path/to/unified_inventory.csv' CSV HEADER;


-- Step 2 — Upsert products (deduplicated by name + category)
-- -----------------------------------------------------------
-- Uses ON CONFLICT on (name, category) — add the unique constraint below if
-- you want to enforce uniqueness at the DB level:
--
--   ALTER TABLE products ADD CONSTRAINT uq_products_name_category
--       UNIQUE (name, category);
--
-- Without the constraint, use INSERT ... WHERE NOT EXISTS instead:

INSERT INTO products (name, category, description, campus, image_path, main_image,
                      price, featured, in_stock, stock, sort_order)
SELECT DISTINCT ON (lower(trim(t.name)), lower(trim(t.category)))
    trim(t.name),
    trim(t.category),
    NULLIF(trim(t.description), ''),
    NULLIF(trim(t.campus), ''),          -- origin campus from Excel
    NULLIF(trim(t.image_path), ''),      -- local image path
    COALESCE(NULLIF(trim(t.image_path), ''),
             'https://placehold.co/600x400?text=UPC+Inventario'),
    0,      -- price
    false,  -- featured
    true,   -- in_stock
    0,      -- stock
    0       -- sort_order (adjust manually in admin panel afterwards)
FROM tmp_excel_import t
WHERE trim(t.name) <> ''
ORDER BY lower(trim(t.name)), lower(trim(t.category))
ON CONFLICT DO NOTHING;


-- Step 3 — Insert inventory_units (one row per Excel row)
-- -------------------------------------------------------
INSERT INTO inventory_units (product_id, unit_code, campus, asset_code, current_note)
SELECT
    p.id,
    trim(t.unit_code),
    trim(t.campus),
    NULLIF(trim(t.asset_code), ''),
    NULLIF(trim(t.initial_note), '')
FROM tmp_excel_import t
JOIN products p
  ON  lower(trim(p.name))     = lower(trim(t.name))
  AND lower(trim(p.category)) = lower(trim(t.category))
WHERE trim(t.unit_code) <> ''
  AND trim(t.campus) IN ('Monterrico', 'San Miguel')
ON CONFLICT (product_id, unit_code) DO NOTHING;


-- Step 4 — Seed initial notes into the notes history (optional)
-- -------------------------------------------------------------
INSERT INTO inventory_unit_notes (unit_id, note)
SELECT
    iu.id,
    trim(t.initial_note)
FROM tmp_excel_import t
JOIN products p
  ON  lower(trim(p.name))     = lower(trim(t.name))
  AND lower(trim(p.category)) = lower(trim(t.category))
JOIN inventory_units iu
  ON  iu.product_id = p.id
  AND iu.unit_code  = trim(t.unit_code)
WHERE trim(t.initial_note) <> '';


-- Step 5 — Verify the import
-- --------------------------
-- SELECT p.name, p.category, p.campus, count(iu.id) AS units
-- FROM products p
-- LEFT JOIN inventory_units iu ON iu.product_id = p.id
-- GROUP BY p.id, p.name, p.category, p.campus
-- ORDER BY p.name;

-- ===========================================================================
-- END OF SCHEMA
-- ===========================================================================
