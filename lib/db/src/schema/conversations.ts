import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
