import { pgTable, serial, timestamp, jsonb, text, index, uniqueIndex, date, integer } from 'drizzle-orm/pg-core';

export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  profile: jsonb('profile').notNull(),
  markers: jsonb('markers').notNull(),
  result: jsonb('result').notNull(),
  shareToken: text('share_token'),
}, (table) => [
  index('analyses_user_id_created_at_idx').on(table.userId, table.createdAt),
  uniqueIndex('analyses_share_token_idx').on(table.shareToken),
]);

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  profile: jsonb('profile').notNull(),
});

export const adherence = pgTable('adherence', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  eventDate: date('event_date').notNull(),
  checks: jsonb('checks').notNull(),
  completedCount: integer('completed_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('adherence_user_date_idx').on(table.userId, table.eventDate),
  index('adherence_user_id_idx').on(table.userId),
]);

export const coachHistory = pgTable('coach_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  eventDateUtc: date('event_date_utc').notNull(),
  source: text('source').notNull(),
  role: text('role').notNull(),
  message: text('message').notNull(),
  analysisId: integer('analysis_id'),
  metadata: jsonb('metadata'),
}, (table) => [
  index('coach_history_user_id_event_date_idx').on(table.userId, table.eventDateUtc),
  index('coach_history_user_id_created_at_idx').on(table.userId, table.createdAt),
]);

export const workoutPlanHistory = pgTable('workout_plan_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  analysisId: integer('analysis_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  eventDateUtc: date('event_date_utc').notNull(),
  constraints: jsonb('constraints').notNull(),
  preferences: jsonb('preferences').notNull(),
  plan: jsonb('plan').notNull(),
}, (table) => [
  index('workout_plan_history_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('workout_plan_history_user_id_event_date_idx').on(table.userId, table.eventDateUtc),
  index('workout_plan_history_analysis_id_idx').on(table.analysisId),
]);
