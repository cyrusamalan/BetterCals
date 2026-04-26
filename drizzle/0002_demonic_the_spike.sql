CREATE TABLE "coach_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_date_utc" date NOT NULL,
	"source" text NOT NULL,
	"role" text NOT NULL,
	"message" text NOT NULL,
	"analysis_id" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE INDEX "coach_history_user_id_event_date_idx" ON "coach_history" USING btree ("user_id","event_date_utc");--> statement-breakpoint
CREATE INDEX "coach_history_user_id_created_at_idx" ON "coach_history" USING btree ("user_id","created_at");