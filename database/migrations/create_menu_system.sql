-- Migración para sistema de menús
-- Crear tabla de categorías
CREATE TABLE menu_categories (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image TEXT, -- URL de la imagen de la categoría
    parent_id INTEGER REFERENCES menu_categories(id) ON DELETE CASCADE, -- Para subcategorías
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de platillos/items del menú
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    image TEXT, -- URL de la imagen del platillo
    ingredients TEXT[], -- Array de ingredientes
    allergens TEXT[], -- Array de alérgenos
    calories INTEGER,
    preparation_time INTEGER, -- Tiempo de preparación en minutos
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Para platillos destacados
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    spicy_level INTEGER DEFAULT 0, -- 0-5 nivel de picante
    availability_start TIME, -- Horario de disponibilidad
    availability_end TIME,
    stock_quantity INTEGER, -- Para control de inventario (opcional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de opciones de personalización (tamaños, extras, etc.)
CREATE TABLE menu_item_options (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    option_type VARCHAR(50) NOT NULL, -- 'size', 'extra', 'customization', etc.
    name VARCHAR(255) NOT NULL, -- ej: "Grande", "Extra queso", "Sin cebolla"
    description TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0, -- Precio adicional o descuento
    is_required BOOLEAN DEFAULT false, -- Si es obligatorio elegir esta opción
    max_selections INTEGER DEFAULT 1, -- Máximo de selecciones permitidas
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de grupos de opciones (para agrupar opciones relacionadas)
CREATE TABLE menu_option_groups (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- ej: "Tamaño", "Extras", "Tipo de cocción"
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    max_selections INTEGER DEFAULT 1,
    min_selections INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla intermedia para relacionar opciones con grupos
CREATE TABLE menu_option_group_items (
    id SERIAL PRIMARY KEY,
    option_group_id INTEGER NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    UNIQUE(option_group_id, option_id)
);

-- Crear tabla de menús (para diferentes tipos de menú por restaurante)
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- ej: "Menú Principal", "Menú Infantil", "Menú del Día"
    description TEXT,
    menu_type VARCHAR(50) DEFAULT 'main', -- 'main', 'kids', 'daily', 'drinks', etc.
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    availability_days INTEGER[], -- Array de días de la semana (0=domingo, 6=sábado)
    availability_start TIME,
    availability_end TIME,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla intermedia para relacionar categorías con menús
CREATE TABLE menu_category_assignments (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    UNIQUE(menu_id, category_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_categories_parent_id ON menu_categories(parent_id);
CREATE INDEX idx_menu_categories_active ON menu_categories(is_active);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);
CREATE INDEX idx_menu_item_options_menu_item_id ON menu_item_options(menu_item_id);
CREATE INDEX idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX idx_menus_active ON menus(is_active);

-- Crear triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos de ejemplo (opcional)
-- INSERT INTO menu_categories (restaurant_id, name, description, display_order) VALUES
-- (1, 'Entradas', 'Deliciosos aperitivos para comenzar', 1),
-- (1, 'Platos Principales', 'Nuestros mejores platos', 2),
-- (1, 'Postres', 'Dulces tentaciones', 3),
-- (1, 'Bebidas', 'Refrescantes opciones', 4);
