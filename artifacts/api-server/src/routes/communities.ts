import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, communitiesTable, communityMembersTable } from "@workspace/db";
import {
  ListCommunitiesResponse,
  GetCommunityParams,
  GetCommunityResponse,
  JoinCommunityParams,
  LeaveCommunityParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { ensureProfile } from "../lib/profiles";
import { toCommunityDto } from "../lib/communities";

const router: IRouter = Router();

router.get("/communities", async (req, res): Promise<void> => {
  const viewerId = getUserId(req);
  const rows = await db.select().from(communitiesTable).orderBy(communitiesTable.createdAt);
  const dtos = await Promise.all(
    rows.map((row) => toCommunityDto(row, viewerId)),
  );
  res.json(ListCommunitiesResponse.parse(dtos));
});

router.get("/communities/:id", async (req, res): Promise<void> => {
  const params = GetCommunityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const [community] = await db
    .select()
    .from(communitiesTable)
    .where(eq(communitiesTable.id, params.data.id));
  if (!community) {
    res.status(404).json({ error: "Community not found" });
    return;
  }
  res.json(
    GetCommunityResponse.parse(await toCommunityDto(community, viewerId, true)),
  );
});

router.post(
  "/communities/:id/join",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = JoinCommunityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    await ensureProfile(userId);
    await db
      .insert(communityMembersTable)
      .values({ communityId: params.data.id, userId })
      .onConflictDoNothing();
    res.sendStatus(204);
  },
);

router.delete(
  "/communities/:id/join",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = LeaveCommunityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    await db
      .delete(communityMembersTable)
      .where(
        and(
          eq(communityMembersTable.communityId, params.data.id),
          eq(communityMembersTable.userId, userId),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
