-- Add alert/notification columns to tracked_fields
ALTER TABLE "tracked_fields" ADD COLUMN "notify_on_change" boolean DEFAULT false NOT NULL;
ALTER TABLE "tracked_fields" ADD COLUMN "alert_min" text;
ALTER TABLE "tracked_fields" ADD COLUMN "alert_max" text;
