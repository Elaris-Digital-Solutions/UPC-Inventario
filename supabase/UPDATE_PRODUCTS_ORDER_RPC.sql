-- ============================================================
-- RPC: update_products_order
-- Actualiza el sort_order de múltiples productos en una sola
-- transacción, eliminando el loop N-queries del cliente.
--
-- Parámetro:
--   updates  jsonb  →  array de { id: uuid, sort_order: int }
--
-- Ejemplo desde supabase-js:
--   await supabase.rpc('update_products_order', {
--     updates: [{ id: '...', sort_order: 0 }, ...]
--   })
--
-- Ejecución: pegar en el SQL Editor de Supabase o correr con
--   supabase db push  si se usa Supabase CLI.
-- ============================================================

CREATE OR REPLACE FUNCTION update_products_order(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates) LOOP
    UPDATE products
    SET sort_order = (item ->> 'sort_order')::integer
    WHERE id = (item ->> 'id')::uuid;
  END LOOP;
END;
$$;

-- Otorgar permisos a los roles de Supabase
-- Ajusta según la política de seguridad del proyecto:
GRANT EXECUTE ON FUNCTION update_products_order(jsonb) TO authenticated;
-- GRANT EXECUTE ON FUNCTION update_products_order(jsonb) TO service_role;
