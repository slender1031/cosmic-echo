CREATE TABLE "user_forest_scores" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"stability_score" integer DEFAULT 50 NOT NULL,
	"exploration_score" integer DEFAULT 50 NOT NULL,
	"introspection_score" integer DEFAULT 50 NOT NULL,
	"action_score" integer DEFAULT 50 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "stability_delta" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "exploration_delta" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "introspection_delta" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "action_delta" integer DEFAULT 0;