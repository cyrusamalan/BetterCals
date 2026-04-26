CREATE TABLE "adherence" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_date" date NOT NULL,
	"checks" jsonb NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "adherence_user_date_idx" ON "adherence" USING btree ("user_id","event_date");--> statement-breakpoint
CREATE INDEX "adherence_user_id_idx" ON "adherence" USING btree ("user_id");