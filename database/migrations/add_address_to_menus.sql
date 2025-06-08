-- Add address field to menus table
-- This migration adds an address field to store location information for each menu

ALTER TABLE menus 
ADD COLUMN address TEXT;

-- Add index for address searches (optional, useful for location-based queries)
CREATE INDEX idx_menus_address ON menus(address);
