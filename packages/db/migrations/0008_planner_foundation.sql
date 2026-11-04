CREATE TABLE IF NOT EXISTS "planner_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"wake_time" text DEFAULT '05:00' NOT NULL,
	"sleep_time" text DEFAULT '23:00' NOT NULL,
	"prayer_block_minutes" integer DEFAULT 20 NOT NULL,
	"prayer_buffer_before_minutes" integer DEFAULT 10 NOT NULL,
	"jumuah_block_minutes" integer DEFAULT 90 NOT NULL,
	"break_minutes" integer DEFAULT 5 NOT NULL,
	"min_session_minutes" integer DEFAULT 25 NOT NULL,
	"prayer_auto" boolean DEFAULT false NOT NULL,
	"prayer_city" text,
	"prayer_country" text,
	"prayer_method" integer DEFAULT 1 NOT NULL,
	"prayer_asr_school" smallint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_settings_wake_time_check" CHECK ("wake_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "planner_settings_sleep_time_check" CHECK ("sleep_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "planner_settings_prayer_block_check" CHECK ("prayer_block_minutes" BETWEEN 1 AND 360),
	CONSTRAINT "planner_settings_prayer_buffer_check" CHECK ("prayer_buffer_before_minutes" BETWEEN 0 AND 180),
	CONSTRAINT "planner_settings_jumuah_block_check" CHECK ("jumuah_block_minutes" BETWEEN 1 AND 360),
	CONSTRAINT "planner_settings_break_check" CHECK ("break_minutes" BETWEEN 0 AND 180),
	CONSTRAINT "planner_settings_min_session_check" CHECK ("min_session_minutes" BETWEEN 1 AND 1440),
	CONSTRAINT "planner_settings_prayer_method_check" CHECK ("prayer_method" BETWEEN 0 AND 99),
	CONSTRAINT "planner_settings_prayer_asr_school_check" CHECK ("prayer_asr_school" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_commitments" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"weekday" smallint,
	"date" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"valid_from" text,
	"valid_to" text,
	"location" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_commitments_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "planner_commitments_title_check" CHECK (char_length("title") BETWEEN 1 AND 120),
	CONSTRAINT "planner_commitments_kind_check" CHECK ("kind" IN ('lecture', 'work', 'other')),
	CONSTRAINT "planner_commitments_occurrence_check" CHECK (
		("weekday" IS NOT NULL AND "weekday" BETWEEN 0 AND 6 AND "date" IS NULL)
		OR ("weekday" IS NULL AND "date" IS NOT NULL AND "date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
	),
	CONSTRAINT "planner_commitments_start_time_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "planner_commitments_end_time_check" CHECK (
		"end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" > "start_time"
	),
	CONSTRAINT "planner_commitments_date_range_check" CHECK (
		("valid_from" IS NULL OR "valid_from" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
		AND ("valid_to" IS NULL OR "valid_to" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
		AND ("valid_from" IS NULL OR "valid_to" IS NULL OR "valid_from" <= "valid_to")
	),
	CONSTRAINT "planner_commitments_location_check" CHECK ("location" IS NULL OR char_length("location") <= 200),
	CONSTRAINT "planner_commitments_notes_check" CHECK ("notes" IS NULL OR char_length("notes") <= 2000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_commitment_exceptions" (
	"user_id" text NOT NULL,
	"commitment_id" uuid NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_commitment_exceptions_user_commitment_date_pk" PRIMARY KEY("user_id", "commitment_id", "date"),
	CONSTRAINT "planner_commitment_exceptions_date_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "planner_commitment_exceptions_user_commitment_fk"
		FOREIGN KEY ("user_id", "commitment_id")
		REFERENCES "planner_commitments" ("user_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_tracks" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"domain" text DEFAULT 'learning' NOT NULL,
	"weekly_target_minutes" integer NOT NULL,
	"min_session_minutes" integer NOT NULL,
	"max_session_minutes" integer NOT NULL,
	"max_per_day_minutes" integer NOT NULL,
	"preferred_window" text DEFAULT 'any' NOT NULL,
	"allowed_weekdays" smallint DEFAULT 127 NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"goal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_tracks_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "planner_tracks_title_check" CHECK (char_length("title") BETWEEN 1 AND 100),
	CONSTRAINT "planner_tracks_domain_check" CHECK ("domain" IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')),
	CONSTRAINT "planner_tracks_weekly_target_check" CHECK ("weekly_target_minutes" BETWEEN 0 AND 10080),
	CONSTRAINT "planner_tracks_session_limits_check" CHECK (
		"min_session_minutes" > 0
		AND "min_session_minutes" <= "max_session_minutes"
		AND "max_session_minutes" <= "max_per_day_minutes"
	),
	CONSTRAINT "planner_tracks_preferred_window_check" CHECK ("preferred_window" IN ('morning', 'afternoon', 'evening', 'night', 'any')),
	CONSTRAINT "planner_tracks_allowed_weekdays_check" CHECK ("allowed_weekdays" BETWEEN 0 AND 127),
	CONSTRAINT "planner_tracks_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "planner_tracks_user_goal_fk"
		FOREIGN KEY ("user_id", "goal_id")
		REFERENCES "roadmap_goals" ("user_id", "id") ON DELETE SET NULL ("goal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_prayer_cache" (
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"fajr" text NOT NULL,
	"dhuhr" text NOT NULL,
	"asr" text NOT NULL,
	"maghrib" text NOT NULL,
	"isha" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_prayer_cache_user_date_pk" PRIMARY KEY("user_id", "date"),
	CONSTRAINT "planner_prayer_cache_date_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "planner_prayer_cache_times_check" CHECK (
		"fajr" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND "dhuhr" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND "asr" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND "maghrib" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
		AND "isha" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
	),
	CONSTRAINT "planner_prayer_cache_source_check" CHECK ("source" IN ('auto', 'manual', 'default'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planner_commitments_user_weekday_idx"
	ON "planner_commitments" USING btree ("user_id", "active", "weekday", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planner_commitments_user_date_idx"
	ON "planner_commitments" USING btree ("user_id", "active", "date", "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planner_commitment_exceptions_user_date_idx"
	ON "planner_commitment_exceptions" USING btree ("user_id", "date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planner_tracks_user_active_priority_idx"
	ON "planner_tracks" USING btree ("user_id", "active", "priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planner_tracks_user_goal_idx"
	ON "planner_tracks" USING btree ("user_id", "goal_id");
