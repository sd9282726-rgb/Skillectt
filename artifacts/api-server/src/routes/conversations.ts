import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  conversationsTable,
  conversationParticipantsTable,
  messagesTable,
  profilesTable,
} from "@workspace/db";
import {
  ListConversationsResponse,
  StartConversationBody,
  GetConversationParams,
  GetConversationResponse,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { ensureProfile, toProfileDto } from "../lib/profiles";

const router: IRouter = Router();

async function buildConversationDto(conversationId: number, viewerId: string) {
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  const participantRows = await db
    .select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.conversationId, conversationId));

  const profiles =
    participantRows.length > 0
      ? await db
          .select()
          .from(profilesTable)
          .where(
            inArray(
              profilesTable.id,
              participantRows.map((p) => p.userId),
            ),
          )
      : [];

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  return {
    id: conversation.id,
    participants: await Promise.all(
      profiles.map((p) => toProfileDto(p, viewerId)),
    ),
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
    })),
    createdAt: conversation.createdAt,
  };
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const myConversations = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, userId));

  const dtos = await Promise.all(
    myConversations.map((row) => buildConversationDto(row.conversationId, userId)),
  );
  dtos.sort((a, b) => {
    const aLast = a.messages.at(-1)?.createdAt ?? a.createdAt;
    const bLast = b.messages.at(-1)?.createdAt ?? b.createdAt;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });
  res.json(ListConversationsResponse.parse(dtos));
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const parsed = StartConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.userId === userId) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }
  await ensureProfile(userId);
  await ensureProfile(parsed.data.userId);

  const myConversations = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, userId));

  let existingId: number | undefined;
  for (const row of myConversations) {
    const participants = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.conversationId, row.conversationId));
    const ids = participants.map((p) => p.userId).sort();
    if (
      ids.length === 2 &&
      ids.includes(userId) &&
      ids.includes(parsed.data.userId)
    ) {
      existingId = row.conversationId;
      break;
    }
  }

  if (existingId) {
    res.status(201).json(await buildConversationDto(existingId, userId));
    return;
  }

  const [conversation] = await db.insert(conversationsTable).values({}).returning();
  await db.insert(conversationParticipantsTable).values([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: parsed.data.userId },
  ]);

  res.status(201).json(await buildConversationDto(conversation.id, userId));
});

router.get(
  "/conversations/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetConversationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    const [membership] = await db
      .select()
      .from(conversationParticipantsTable)
      .where(
        eq(conversationParticipantsTable.conversationId, params.data.id),
      );
    if (!membership) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const participants = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.conversationId, params.data.id));
    if (!participants.some((p) => p.userId === userId)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json(
      GetConversationResponse.parse(
        await buildConversationDto(params.data.id, userId),
      ),
    );
  },
);

router.post(
  "/conversations/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SendMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = getUserId(req)!;
    const participants = await db
      .select({ userId: conversationParticipantsTable.userId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.conversationId, params.data.id));
    if (!participants.some((p) => p.userId === userId)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [message] = await db
      .insert(messagesTable)
      .values({
        conversationId: params.data.id,
        senderId: userId,
        content: parsed.data.content,
      })
      .returning();
    res.status(201).json(message);
  },
);

export default router;
