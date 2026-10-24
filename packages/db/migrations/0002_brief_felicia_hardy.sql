CREATE TABLE IF NOT EXISTS "wealth_debts" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lender" text NOT NULL,
	"total_amount" real NOT NULL,
	"payoff_deadline" text,
	"monthly_commitment" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wealth_debts_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wealth_goals" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"target_amount" real NOT NULL,
	"deadline" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wealth_goals_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wealth_settings" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wealth_settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wealth_transactions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"category" text NOT NULL,
	"sub_tag" text NOT NULL,
	"halal_verified" boolean DEFAULT false NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"linked_goal_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wealth_transactions_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wealth_zakat_assets" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"asset_name" text NOT NULL,
	"current_value" real NOT NULL,
	"zakat_eligible" boolean DEFAULT true NOT NULL,
	"nisab_threshold" real DEFAULT 0 NOT NULL,
	"hawl_start_date" text NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_date" text,
	CONSTRAINT "wealth_zakat_assets_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_debts_user_id_idx" ON "wealth_debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_debts_user_created_at_idx" ON "wealth_debts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_goals_user_id_idx" ON "wealth_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_goals_user_created_at_idx" ON "wealth_goals" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_settings_user_id_idx" ON "wealth_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_transactions_user_id_idx" ON "wealth_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_transactions_user_date_idx" ON "wealth_transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wealth_zakat_assets_user_id_idx" ON "wealth_zakat_assets" USING btree ("user_id");