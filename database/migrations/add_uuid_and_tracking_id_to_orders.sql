
-- 1. Agregar columna UUID para enlaces públicos si no existe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_uuid ON orders(uuid);

-- 2. Agregar columna para consecutivo por restaurante
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_id INTEGER;

-- 3. Función para calcular el siguiente consecutivo por lugar
CREATE OR REPLACE FUNCTION set_order_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT COALESCE(MAX(tracking_id), 0) + 1 
    INTO NEW.tracking_id 
    FROM orders 
    WHERE place_id = NEW.place_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para asignar el consecutivo automáticamente
DROP TRIGGER IF EXISTS trigger_set_order_tracking_id ON orders;
CREATE TRIGGER trigger_set_order_tracking_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_tracking_id();

-- 5. Actualizar registros existentes (opcional pero recomendado)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT place_id FROM orders WHERE tracking_id IS NULL LOOP
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as nr
            FROM orders
            WHERE place_id = r.place_id AND tracking_id IS NULL
        )
        UPDATE orders o
        SET tracking_id = n.nr
        FROM numbered n
        WHERE o.id = n.id;
    END LOOP;
END $$;
