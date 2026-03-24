import { pgTable, serial, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  profile: jsonb('profile').notNull(),
  markers: jsonb('markers').notNull(),
  result: jsonb('result').notNull(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  profile: jsonb('profile').notNull(),
});
