CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"date" varchar(10) NOT NULL,
	"card_id" varchar(64) NOT NULL,
	"card_name" varchar(128) NOT NULL,
	"card_orientation" varchar(16) DEFAULT 'upright' NOT NULL,
	"astrology_tag" varchar(128) NOT NULL,
	"astrology_description" text,
	"morning_theme" text,
	"morning_question" text,
	"morning_question_description" text,
	"journal_text" text,
	"journal_submitted_at" timestamp,
	"evening_summary" text,
	"behavior_patterns" text,
	"pattern_mapping" text,
	"evening_echo" text,
	"morning_drawn_at" timestamp,
	"is_complete" boolean DEFAULT false NOT NULL,
	"streak_day" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "journal_user_date_idx" ON "journal_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "journal_user_idx" ON "journal_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journal_date_idx" ON "journal_entries" USING btree ("date");