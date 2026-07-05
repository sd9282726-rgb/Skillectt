import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const followsTable = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

export type Follow = typeof followsTable.$inferSelect;
