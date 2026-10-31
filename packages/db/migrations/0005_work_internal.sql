CREATE TABLE IF NOT EXISTS "work_projects" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"target_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_projects_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "work_projects_status_check" CHECK ("status" IN ('active', 'paused', 'completed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_daily_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"log_date" text NOT NULL,
	"deep_work_hours" real DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"milestone_done" boolean DEFAULT false NOT NULL,
	"prof_dev_minutes" integer DEFAULT 0 NOT NULL,
	"no_procrastination" boolean DEFAULT false NOT NULL,
	"client_deliverable" boolean DEFAULT false NOT NULL,
	"project_id" uuid,
	"notes" text,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_daily_logs_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "work_daily_logs_user_id_log_date_unique" UNIQUE("user_id", "log_date"),
	CONSTRAINT "work_daily_logs_user_project_fk" FOREIGN KEY ("user_id", "project_id")
		REFERENCES "work_projects" ("user_id", "id") ON DELETE SET NULL ("project_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_projects_user_status_created_at_idx"
	ON "work_projects" USING btree ("user_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_daily_logs_user_date_idx"
	ON "work_daily_logs" USING btree ("user_id", "log_date");
