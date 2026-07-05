import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { communitiesTable } from "./communities";
import { profilesTable } from "./profiles";

export const communityMembersTable = pgTable(
  "community_members",
  {
    communityId: integer("community_id")
      .notNull()
      .references(() => communitiesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.communityId, table.userId] })],
);

export type CommunityMember = typeof communityMembersTable.$inferSelect;
