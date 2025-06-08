-- Add image column to menus table
-- This migration adds image support to the existing menus table

-- Add image column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'menus' 
        AND column_name = 'image'
    ) THEN
        ALTER TABLE menus ADD COLUMN image TEXT;
    END IF;
END $$;

-- Add menu column if it doesn't exist (for short menu name)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'menus' 
        AND column_name = 'menu'
    ) THEN
        ALTER TABLE menus ADD COLUMN menu VARCHAR(255);
    END IF;
END $$;

-- Add comment to the image column
COMMENT ON COLUMN menus.image IS 'URL de la imagen del menú';
COMMENT ON COLUMN menus.menu IS 'Nombre corto del menú';
