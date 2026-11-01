CREATE TABLE IF NOT EXISTS "roadmap_import_batches" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"goal_count" integer DEFAULT 0 NOT NULL,
	"milestone_count" integer DEFAULT 0 NOT NULL,
	"task_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"confirm_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "roadmap_import_batches_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "roadmap_import_batches_status_check" CHECK ("status" IN ('pending', 'done', 'failed')),
	CONSTRAINT "roadmap_import_batches_filename_check" CHECK (char_length("filename") BETWEEN 1 AND 255),
	CONSTRAINT "roadmap_import_batches_hash_check" CHECK ("content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "roadmap_import_batches_counts_check" CHECK (
		"row_count" >= 0 AND "goal_count" >= 0 AND "milestone_count" >= 0
		AND "task_count" >= 0 AND "skipped_count" >= 0 AND "error_count" >= 0
	)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_goals" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" text DEFAULT 'other' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" text,
	"due_date" text,
	"completed_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_goals_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "roadmap_goals_title_check" CHECK (char_length("title") BETWEEN 1 AND 200),
	CONSTRAINT "roadmap_goals_description_check" CHECK ("description" IS NULL OR char_length("description") <= 4000),
	CONSTRAINT "roadmap_goals_domain_check" CHECK ("domain" IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')),
	CONSTRAINT "roadmap_goals_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "roadmap_goals_status_check" CHECK ("status" IN ('active', 'done', 'paused')),
	CONSTRAINT "roadmap_goals_source_check" CHECK ("source" IN ('csv', 'ai', 'manual')),
	CONSTRAINT "roadmap_goals_dates_check" CHECK (
		("start_date" IS NULL OR "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
		AND ("due_date" IS NULL OR "due_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
	),
	CONSTRAINT "roadmap_goals_user_batch_fk" FOREIGN KEY ("user_id", "import_batch_id")
		REFERENCES "roadmap_import_batches" ("user_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_milestones" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" text DEFAULT 'other' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" text,
	"due_date" text,
	"completed_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_milestones_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "roadmap_milestones_user_goal_id_unique" UNIQUE("user_id", "goal_id", "id"),
	CONSTRAINT "roadmap_milestones_title_check" CHECK (char_length("title") BETWEEN 1 AND 200),
	CONSTRAINT "roadmap_milestones_description_check" CHECK ("description" IS NULL OR char_length("description") <= 4000),
	CONSTRAINT "roadmap_milestones_domain_check" CHECK ("domain" IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')),
	CONSTRAINT "roadmap_milestones_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "roadmap_milestones_status_check" CHECK ("status" IN ('active', 'done', 'paused')),
	CONSTRAINT "roadmap_milestones_source_check" CHECK ("source" IN ('csv', 'ai', 'manual')),
	CONSTRAINT "roadmap_milestones_dates_check" CHECK (
		("start_date" IS NULL OR "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
		AND ("due_date" IS NULL OR "due_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
	),
	CONSTRAINT "roadmap_milestones_user_goal_fk" FOREIGN KEY ("user_id", "goal_id")
		REFERENCES "roadmap_goals" ("user_id", "id") ON DELETE CASCADE,
	CONSTRAINT "roadmap_milestones_user_batch_fk" FOREIGN KEY ("user_id", "import_batch_id")
		REFERENCES "roadmap_import_batches" ("user_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_tasks" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" uuid,
	"milestone_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"domain" text DEFAULT 'other' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"start_date" text,
	"due_date" text,
	"estimate_minutes" integer,
	"completed_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_tasks_user_id_id_pk" PRIMARY KEY("user_id", "id"),
	CONSTRAINT "roadmap_tasks_title_check" CHECK (char_length("title") BETWEEN 1 AND 200),
	CONSTRAINT "roadmap_tasks_description_check" CHECK ("description" IS NULL OR char_length("description") <= 4000),
	CONSTRAINT "roadmap_tasks_domain_check" CHECK ("domain" IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')),
	CONSTRAINT "roadmap_tasks_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "roadmap_tasks_status_check" CHECK ("status" IN ('todo', 'done', 'skipped', 'suggested')),
	CONSTRAINT "roadmap_tasks_source_check" CHECK ("source" IN ('csv', 'ai', 'manual')),
	CONSTRAINT "roadmap_tasks_dates_check" CHECK (
		("start_date" IS NULL OR "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
		AND ("due_date" IS NULL OR "due_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
	),
	CONSTRAINT "roadmap_tasks_estimate_check" CHECK ("estimate_minutes" IS NULL OR "estimate_minutes" > 0),
	CONSTRAINT "roadmap_tasks_user_goal_fk" FOREIGN KEY ("user_id", "goal_id")
		REFERENCES "roadmap_goals" ("user_id", "id") ON DELETE CASCADE,
	CONSTRAINT "roadmap_tasks_user_milestone_fk" FOREIGN KEY ("user_id", "milestone_id")
		REFERENCES "roadmap_milestones" ("user_id", "id") ON DELETE CASCADE,
	CONSTRAINT "roadmap_tasks_user_goal_milestone_fk" FOREIGN KEY ("user_id", "goal_id", "milestone_id")
		REFERENCES "roadmap_milestones" ("user_id", "goal_id", "id") ON DELETE CASCADE,
	CONSTRAINT "roadmap_tasks_user_batch_fk" FOREIGN KEY ("user_id", "import_batch_id")
		REFERENCES "roadmap_import_batches" ("user_id", "id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_import_batches_user_created_idx"
	ON "roadmap_import_batches" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_import_batches_user_hash_idx"
	ON "roadmap_import_batches" USING btree ("user_id", "content_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_goals_user_status_due_idx"
	ON "roadmap_goals" USING btree ("user_id", "status", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_milestones_user_goal_status_due_idx"
	ON "roadmap_milestones" USING btree ("user_id", "goal_id", "status", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_tasks_user_status_due_idx"
	ON "roadmap_tasks" USING btree ("user_id", "status", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_tasks_user_goal_idx"
	ON "roadmap_tasks" USING btree ("user_id", "goal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmap_tasks_user_milestone_idx"
	ON "roadmap_tasks" USING btree ("user_id", "milestone_id");
