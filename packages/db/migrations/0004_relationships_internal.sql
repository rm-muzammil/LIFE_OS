CREATE TABLE IF NOT EXISTS "relationships_daily_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"contacted_parents" boolean DEFAULT false NOT NULL,
	"family_ties" boolean DEFAULT false NOT NULL,
	"helped_someone" boolean DEFAULT false NOT NULL,
	"good_deed" boolean DEFAULT false NOT NULL,
	"community_obligation" boolean DEFAULT false NOT NULL,
	"charity_amount" integer DEFAULT 0 NOT NULL,
	"good_deeds_count" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationships_daily_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "relationships_daily_logs_user_id_date_unique" UNIQUE("user_id", "date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relationships_settings" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationships_settings_user_id_key_pk" PRIMARY KEY("user_id", "key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_daily_logs_user_date_idx"
	ON "relationships_daily_logs" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_settings_user_id_idx"
	ON "relationships_settings" USING btree ("user_id");
