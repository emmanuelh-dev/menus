
-- Crear tabla de historial para auditoría y rollbacks
CREATE TABLE IF NOT EXISTS place_content_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    place_id BIGINT REFERENCES places(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT NOT NULL, -- 'quick_feed', 'admin_editor', 'initial_import'
    agent_reasoning TEXT, -- Opcional: Para guardar qué pensó la IA o qué instruyó el usuario
    version_label TEXT -- Opcional: Para nombres de versiones
);

-- Índice para búsquedas rápidas por lugar
CREATE INDEX IF NOT EXISTS idx_place_history_place_id ON place_content_history(place_id);

-- Función para guardar automáticamente el estado actual antes de un cambio (opcional, pero mejor hacerlo en el código para tener contexto del prompt)
