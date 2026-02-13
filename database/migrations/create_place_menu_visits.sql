CREATE TABLE IF NOT EXISTS place_menu_visits (
  id BIGSERIAL PRIMARY KEY,
  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_place_menu_visits_place_id
  ON place_menu_visits(place_id);

CREATE INDEX IF NOT EXISTS idx_place_menu_visits_visited_at
  ON place_menu_visits(visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_place_menu_visits_place_day
  ON place_menu_visits(place_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_place_menu_visits_place_visitor
  ON place_menu_visits(place_id, visitor_id);
