CREATE TABLE IF NOT EXISTS "character_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_week" text NOT NULL,
	"patience" smallint NOT NULL,
	"discipline" smallint NOT NULL,
	"gratitude" smallint NOT NULL,
	"humility" smallint NOT NULL,
	"truthfulness" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_ratings_iso_week_unique" UNIQUE("iso_week")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"date" date NOT NULL,
	"feeds_schedule" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"user_notes" text DEFAULT '' NOT NULL,
	"tasks" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"generation_error" text,
	CONSTRAINT "daily_schedule_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hadith_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_week" text NOT NULL,
	"arabic_text" text DEFAULT '' NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"reflection" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hadith_log_iso_week_unique" UNIQUE("iso_week")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prayer_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"fajr" text DEFAULT '05:20' NOT NULL,
	"dhuhr" text DEFAULT '13:00' NOT NULL,
	"asr" text DEFAULT '16:45' NOT NULL,
	"maghrib" text DEFAULT '19:30' NOT NULL,
	"isha" text DEFAULT '21:00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "province_daily_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"slug" text NOT NULL,
	"score" real NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "province_daily_snapshots_date_slug_unique" UNIQUE("date","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"pull_secret" text NOT NULL,
	"weight" real DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cached_score" real,
	"cached_details" jsonb,
	"cached_at" timestamp with time zone,
	"last_pushed_at" timestamp with time zone,
	"last_pulled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provinces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weekly_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_week" text NOT NULL,
	"went_well" text DEFAULT '' NOT NULL,
	"went_wrong" text DEFAULT '' NOT NULL,
	"distractions" text DEFAULT '' NOT NULL,
	"must_improve" text DEFAULT '' NOT NULL,
	"intentions" text DEFAULT '' NOT NULL,
	"mission_align_score" smallint,
	"mission_align_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_review_iso_week_unique" UNIQUE("iso_week")
);
