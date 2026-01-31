-- Agregar campos de estado y municipio a las tablas de clientes y pedidos
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS default_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS default_municipality VARCHAR(100);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_municipality VARCHAR(100);

COMMENT ON COLUMN customers.default_state IS 'Estado por defecto del cliente';
COMMENT ON COLUMN customers.default_municipality IS 'Municipio por defecto del cliente';
COMMENT ON COLUMN orders.delivery_state IS 'Estado de entrega del pedido';
COMMENT ON COLUMN orders.delivery_municipality IS 'Municipio de entrega del pedido';
