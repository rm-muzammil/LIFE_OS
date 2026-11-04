ALTER TABLE "planner_settings"
	ADD COLUMN IF NOT EXISTS "engine_enabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "planner_settings"
	ADD COLUMN IF NOT EXISTS "week_start" smallint NOT NULL DEFAULT 1
		CONSTRAINT "planner_settings_week_start_check"
		CHECK ("week_start" BETWEEN 0 AND 6);
--> statement-breakpoint
ALTER TABLE "planner_settings"
	ADD COLUMN IF NOT EXISTS "slack_percent" smallint NOT NULL DEFAULT 15
		CONSTRAINT "planner_settings_slack_percent_check"
		CHECK ("slack_percent" BETWEEN 0 AND 50);
--> statement-breakpoint
ALTER TABLE "planner_settings"
	ADD COLUMN IF NOT EXISTS "default_task_minutes" integer NOT NULL DEFAULT 30
		CONSTRAINT "planner_settings_default_task_minutes_check"
		CHECK ("default_task_minutes" BETWEEN 5 AND 240);
