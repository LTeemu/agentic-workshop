ALTER TABLE "tracked_symbols" DROP CONSTRAINT "tracked_symbols_symbol_unique";--> statement-breakpoint
-- Add user_id as nullable first, then clean up orphaned rows before enforcing NOT NULL
ALTER TABLE "tracked_symbols" ADD COLUMN "user_id" text;--> statement-breakpoint
-- Delete symbols that were added before per-user tracking existed (no owner)
DELETE FROM "tracked_symbols" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "tracked_symbols" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_symbols" ADD CONSTRAINT "tracked_symbols_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_symbols" ADD CONSTRAINT "tracked_symbols_user_symbol_unique" UNIQUE("user_id","symbol");