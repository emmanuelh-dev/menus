-- Tabla de municipios vinculada a estados
CREATE TABLE IF NOT EXISTS municipalities (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_municipalities_state_id ON municipalities(state_id);

-- Agregar municipio a la tabla de lugares (opcional pero recomendado)
ALTER TABLE places ADD COLUMN IF NOT EXISTS municipality_id INTEGER REFERENCES municipalities(id);
