import { pgTable, serial, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  profile: jsonb('profile').notNull(),
  markers: jsonb('markers').notNull(),
  result: jsonb('result').notNull(),
});
