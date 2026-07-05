import { pgTable, text, integer, primaryKey } from "drizzle-orm/pg-core";
import { conversationsTable } from "./conversations";
import { profilesTable } from "./profiles";

export const conversationParticipantsTable = pgTable(
  "conversation_participants",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.conversationId, table.userId] })],
);

export type ConversationParticipant = typeof conversationParticipantsTable.$inferSelect;
