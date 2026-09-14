CREATE TABLE IF NOT EXISTS "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gemini_key_1" text,
	"gemini_key_2" text,
	"gemini_key_3" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_ratings" DROP CONSTRAINT "character_ratings_iso_week_unique";--> statement-breakpoint
ALTER TABLE "daily_schedule" DROP CONSTRAINT "daily_schedule_date_unique";--> statement-breakpoint
ALTER TABLE "hadith_log" DROP CONSTRAINT "hadith_log_iso_week_unique";--> statement-breakpoint
ALTER TABLE "province_daily_snapshots" DROP CONSTRAINT "province_daily_snapshots_date_slug_unique";--> statement-breakpoint
ALTER TABLE "provinces" DROP CONSTRAINT "provinces_slug_unique";--> statement-breakpoint
ALTER TABLE "weekly_review" DROP CONSTRAINT "weekly_review_iso_week_unique";--> statement-breakpoint
ALTER TABLE "character_ratings" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_schedule" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hadith_log" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_times" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "province_daily_snapshots" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "provinces" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_review" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "character_ratings" ADD CONSTRAINT "character_ratings_user_id_iso_week_unique" UNIQUE("user_id","iso_week");--> statement-breakpoint
ALTER TABLE "daily_schedule" ADD CONSTRAINT "daily_schedule_user_id_date_unique" UNIQUE("user_id","date");--> statement-breakpoint
ALTER TABLE "hadith_log" ADD CONSTRAINT "hadith_log_user_id_iso_week_unique" UNIQUE("user_id","iso_week");--> statement-breakpoint
ALTER TABLE "prayer_times" ADD CONSTRAINT "prayer_times_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "province_daily_snapshots" ADD CONSTRAINT "province_daily_snapshots_user_id_date_slug_unique" UNIQUE("user_id","date","slug");--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_user_id_slug_unique" UNIQUE("user_id","slug");--> statement-breakpoint
ALTER TABLE "weekly_review" ADD CONSTRAINT "weekly_review_user_id_iso_week_unique" UNIQUE("user_id","iso_week");