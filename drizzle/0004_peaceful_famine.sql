CREATE TABLE "workout_plan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"analysis_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_date_utc" date NOT NULL,
	"constraints" jsonb NOT NULL,
	"preferences" jsonb NOT NULL,
	"plan" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workout_plan_history_user_id_created_at_idx" ON "workout_plan_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "workout_plan_history_user_id_event_date_idx" ON "workout_plan_history" USING btree ("user_id","event_date_utc");--> statement-breakpoint
CREATE INDEX "workout_plan_history_analysis_id_idx" ON "workout_plan_history" USING btree ("analysis_id");