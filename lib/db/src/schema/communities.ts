import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communitiesTable = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cover: text("cover").notNull(),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommunitySchema = createInsertSchema(communitiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;
