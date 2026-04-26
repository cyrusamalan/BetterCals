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
