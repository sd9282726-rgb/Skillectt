import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export interface ProjectLink {
  label: string;
  url: string;
}

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  image: text("image"),
  tags: text("tags").array().notNull().default([]),
  links: jsonb("links").$type<ProjectLink[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
