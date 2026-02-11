
-- Agregar columna delivery_type a la tabla orders si no existe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup';

-- Actualizar registros existentes basados en si hay dirección o no
UPDATE orders 
SET delivery_type = CASE 
    WHEN delivery_address IS NOT NULL AND delivery_address != '' THEN 'delivery' 
    ELSE 'pickup' 
END
WHERE delivery_type IS NULL;
