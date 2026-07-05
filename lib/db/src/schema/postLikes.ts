import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { profilesTable } from "./profiles";

export const postLikesTable = pgTable(
  "post_likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export type PostLike = typeof postLikesTable.$inferSelect;
