-- Drop old stock tracking tables
DROP TABLE IF EXISTS "data_freshness" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tracked_symbols" CASCADE;--> statement-breakpoint

-- Create folders table
CREATE TABLE "folders" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text DEFAULT '📁' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "folder_user_name_idx" ON "folders" ("user_id", "name");--> statement-breakpoint

-- Create tracked_pages table
CREATE TABLE "tracked_pages" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "folder_id" integer REFERENCES "folders"("id") ON DELETE SET NULL,
  "url" text NOT NULL,
  "name" text,
  "image_url" text,
  "scrape_interval" text DEFAULT 'manual' NOT NULL,
  "last_scraped_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "pages_user_id_idx" ON "tracked_pages" ("user_id");--> statement-breakpoint
CREATE INDEX "pages_folder_id_idx" ON "tracked_pages" ("folder_id");--> statement-breakpoint

-- Create tracked_fields table
CREATE TABLE "tracked_fields" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL REFERENCES "tracked_pages"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "css_selector" text NOT NULL,
  "attribute" text DEFAULT 'text' NOT NULL,
  "value_type" text DEFAULT 'text' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "fields_page_id_idx" ON "tracked_fields" ("page_id");--> statement-breakpoint

-- Create field_history table
CREATE TABLE "field_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "field_id" integer NOT NULL REFERENCES "tracked_fields"("id") ON DELETE CASCADE,
  "value" text NOT NULL,
  "scraped_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "history_field_id_scraped_at_idx" ON "field_history" ("field_id", "scraped_at");--> statement-breakpoint

-- Add CHECK constraints for enums
ALTER TABLE "tracked_pages" ADD CONSTRAINT "tracked_pages_scrape_interval_check" CHECK ("scrape_interval" IN ('manual', 'hourly', 'daily'));--> statement-breakpoint
ALTER TABLE "tracked_fields" ADD CONSTRAINT "tracked_fields_attribute_check" CHECK ("attribute" IN ('text', 'href', 'src'));--> statement-breakpoint
ALTER TABLE "tracked_fields" ADD CONSTRAINT "tracked_fields_value_type_check" CHECK ("value_type" IN ('text', 'number', 'boolean'));
