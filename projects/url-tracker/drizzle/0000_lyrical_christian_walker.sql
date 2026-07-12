CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_freshness" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"data_type" text NOT NULL,
	"last_fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"date" date NOT NULL,
	"sma_20" numeric(12, 4),
	"sma_50" numeric(12, 4),
	"rsi" numeric(8, 2),
	"macd" numeric(12, 4),
	"macd_signal" numeric(12, 4),
	"macd_histogram" numeric(12, 4),
	"bb_upper" numeric(12, 4),
	"bb_mid" numeric(12, 4),
	"bb_lower" numeric(12, 4),
	"volatility" numeric(8, 4),
	"volume_sma" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"date" date NOT NULL,
	"open" numeric(12, 4),
	"high" numeric(12, 4),
	"low" numeric(12, 4),
	"close" numeric(12, 4),
	"volume" bigint,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_symbols" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text,
	"type" text DEFAULT 'stock' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_symbols_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "freshness_sym_type_idx" ON "data_freshness" USING btree ("symbol","data_type");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_sym_date_idx" ON "indicators" USING btree ("symbol","date");--> statement-breakpoint
CREATE UNIQUE INDEX "symbol_date_idx" ON "price_history" USING btree ("symbol","date");