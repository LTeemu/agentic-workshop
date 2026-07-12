-- Add unique constraint on (field_id, scraped_at) to prevent duplicate entries
-- when scrape runs multiple times in the same second
CREATE UNIQUE INDEX IF NOT EXISTS "history_field_id_scraped_at_unique_idx" ON "field_history" ("field_id", "scraped_at");
