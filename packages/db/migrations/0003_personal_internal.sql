CREATE TABLE IF NOT EXISTS "personal_daily_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"workout_done" boolean DEFAULT false,
	"all_sets_done" boolean DEFAULT false,
	"effort_rating" integer DEFAULT 0,
	"is_rest_day" boolean DEFAULT false,
	"calories" integer DEFAULT 0,
	"protein" integer DEFAULT 0,
	"meals" boolean DEFAULT false,
	"sleep_hours" real DEFAULT 0,
	"productive_hours" real DEFAULT 0,
	"social_media_ok" boolean DEFAULT false,
	"helped_someone" boolean DEFAULT false,
	"contacted_parents" boolean DEFAULT false,
	"family_ties" boolean DEFAULT false,
	"charity_amount" integer DEFAULT 0,
	"good_deeds" integer DEFAULT 0,
	"total_score" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "personal_daily_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "personal_daily_logs_user_id_date_unique" UNIQUE("user_id", "date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_workout_plans" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_start" text NOT NULL,
	"day" text NOT NULL,
	"date" text NOT NULL,
	"plan" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "personal_workout_plans_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "personal_workout_plans_user_id_date_unique" UNIQUE("user_id", "date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_exercise_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"exercise_name" text NOT NULL,
	"sets_planned" integer DEFAULT 0,
	"sets_completed" integer DEFAULT 0,
	"reps" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '',
	CONSTRAINT "personal_exercise_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "personal_exercise_logs_user_id_date_exercise_name_unique" UNIQUE("user_id", "date", "exercise_name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_daily_logs_user_date_idx" ON "personal_daily_logs" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_workout_plans_user_date_idx" ON "personal_workout_plans" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_exercise_logs_user_date_idx" ON "personal_exercise_logs" USING btree ("user_id", "date");
