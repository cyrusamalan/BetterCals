CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile" jsonb NOT NULL,
	"markers" jsonb NOT NULL,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile" jsonb NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
