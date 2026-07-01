import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Daily journal entries — one per user per day
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD

    // Morning — card draw
    cardId: varchar("card_id", { length: 64 }).notNull(),
    cardName: varchar("card_name", { length: 128 }).notNull(),
    cardOrientation: varchar("card_orientation", { length: 16 }).notNull().default("upright"), // upright | reversed
    astrologyTag: varchar("astrology_tag", { length: 128 }).notNull(),
    astrologyDescription: text("astrology_description"),

    // Morning AI output
    morningTheme: text("morning_theme"),      // 今日宇宙课题
    morningQuestion: text("morning_question"), // 今日反思问题
    morningQuestionDescription: text("morning_question_description"), // 反思问题引导描述

    // Evening — journal
    journalText: text("journal_text"),
    journalSubmittedAt: timestamp("journal_submitted_at"),

    // Evening AI output
    eveningSummary: text("evening_summary"),         // 今日回响总结
    behaviorPatterns: text("behavior_patterns"),      // JSON array of keywords
    patternMapping: text("pattern_mapping"),          // 与晨间课题的关系
    eveningEcho: text("evening_echo"),                // 一句回响

    // Tracking
    morningDrawnAt: timestamp("morning_drawn_at"),
    isComplete: boolean("is_complete").notNull().default(false),
    streakDay: integer("streak_day").notNull().default(1),

    // Forest scores (delta for this entry, cumulative stored separately)
    stabilityDelta: integer("stability_delta").default(0),
    explorationDelta: integer("exploration_delta").default(0),
    introspectionDelta: integer("introspection_delta").default(0),
    actionDelta: integer("action_delta").default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("journal_user_date_idx").on(table.userId, table.date),
    userIdx: index("journal_user_idx").on(table.userId),
    dateIdx: index("journal_date_idx").on(table.date),
  })
);

export type JournalEntry = InferSelectModel<typeof journalEntries>;

// User forest scores — cumulative scores for the tree visualization
export const userForestScores = pgTable(
  "user_forest_scores",
  {
    userId: varchar("user_id", { length: 128 }).primaryKey(),
    stabilityScore: integer("stability_score").notNull().default(0),
    explorationScore: integer("exploration_score").notNull().default(0),
    introspectionScore: integer("introspection_score").notNull().default(0),
    actionScore: integer("action_score").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export type UserForestScores = InferSelectModel<typeof userForestScores>;
