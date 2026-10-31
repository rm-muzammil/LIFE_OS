CREATE TABLE IF NOT EXISTS "faith_daily_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"fajr" boolean DEFAULT false NOT NULL,
	"dhuhr" boolean DEFAULT false NOT NULL,
	"asr" boolean DEFAULT false NOT NULL,
	"maghrib" boolean DEFAULT false NOT NULL,
	"isha" boolean DEFAULT false NOT NULL,
	"on_time" integer DEFAULT 0 NOT NULL,
	"morning_adhkar" boolean DEFAULT false NOT NULL,
	"evening_adhkar" boolean DEFAULT false NOT NULL,
	"before_sleep_adhkar" boolean DEFAULT false NOT NULL,
	"dhikr_minutes" integer DEFAULT 0 NOT NULL,
	"dua_minutes" integer DEFAULT 0 NOT NULL,
	"la_ilaha" boolean DEFAULT false NOT NULL,
	"subhanallahi" boolean DEFAULT false NOT NULL,
	"quran_pages" integer DEFAULT 0 NOT NULL,
	"tadabbur_minutes" integer DEFAULT 0 NOT NULL,
	"tafseer_done" boolean DEFAULT false NOT NULL,
	"tajweed_confidence" integer DEFAULT 0 NOT NULL,
	"verse_done" boolean DEFAULT false NOT NULL,
	"islamic_study_minutes" integer DEFAULT 0 NOT NULL,
	"surah_mulk" boolean DEFAULT false NOT NULL,
	"surah_kahf" boolean DEFAULT false NOT NULL,
	"gaze_lowered" integer DEFAULT 0 NOT NULL,
	"haram_free" boolean DEFAULT false NOT NULL,
	"final_score" integer DEFAULT 0 NOT NULL,
	"raw_score" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_daily_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "faith_daily_logs_user_id_date_unique" UNIQUE("user_id", "date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faith_dhikr_counts" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"dhikr_key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"target" integer DEFAULT 100 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_dhikr_counts_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "faith_dhikr_counts_user_id_date_dhikr_key_unique" UNIQUE("user_id", "date", "dhikr_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faith_memorization_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"verse_index" integer NOT NULL,
	"date" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_memorization_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "faith_memorization_logs_user_id_date_unique" UNIQUE("user_id", "date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faith_raku_progress" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"raku_number" integer NOT NULL,
	"tafseer_done" boolean DEFAULT false NOT NULL,
	"tajweed_confidence" integer DEFAULT 0 NOT NULL,
	"vocab_extracted" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_raku_progress_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "faith_raku_progress_user_id_raku_number_unique" UNIQUE("user_id", "raku_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faith_vocab_bank" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"raku_number" integer NOT NULL,
	"word" text NOT NULL,
	"root" text,
	"meaning" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_vocab_bank_user_id_id_pk" PRIMARY KEY("user_id", "id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faith_settings" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faith_settings_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "faith_settings_user_id_key_unique" UNIQUE("user_id", "key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_daily_logs_user_date_idx"
	ON "faith_daily_logs" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_dhikr_counts_user_date_idx"
	ON "faith_dhikr_counts" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_memorization_logs_user_date_idx"
	ON "faith_memorization_logs" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_raku_progress_user_id_idx"
	ON "faith_raku_progress" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_vocab_bank_user_raku_idx"
	ON "faith_vocab_bank" USING btree ("user_id", "raku_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faith_settings_user_id_idx"
	ON "faith_settings" USING btree ("user_id");
