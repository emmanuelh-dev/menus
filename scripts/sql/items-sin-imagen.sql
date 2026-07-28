-- Items de menú que no tienen foto, agrupados por nombre normalizado.
--
-- Alimenta a scripts/classify-menu-items.js. Trae también la sección y el lugar
-- porque muchos nombres son ambiguos por sí solos (`hawaiana`, `domingo`,
-- `taro`) y sólo se clasifican bien viendo dónde viven.
--
-- Uso:
--   psql "$DATABASE_URL" -At -F$'\t' -f scripts/sql/items-sin-imagen.sql > /tmp/items.tsv
SELECT translate(lower(trim(i->>'name')), 'áéíóúñü', 'aeiounu')          AS nombre,
       count(*)                                                          AS veces,
       (array_agg(DISTINCT left(COALESCE(b->'data'->>'title', ''), 40)))[1:3] AS secciones,
       (array_agg(DISTINCT p.name))[1:2]                                 AS lugares
FROM places p,
     jsonb_array_elements(COALESCE(p.content->'blocks', '[]'::jsonb)) b,
     jsonb_array_elements(COALESCE(b->'data'->'items', '[]'::jsonb)) i
WHERE p.type IN ('restaurant', 'cafe', 'cafeteria')
  AND COALESCE(NULLIF(i->>'image', ''), NULLIF(i->>'imageUrl', '')) IS NULL
  AND trim(i->>'name') <> ''
GROUP BY 1;
