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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || `community-${Date.now()}`;
}

router.get("/communities", async (req, res): Promise<void> => {
  const viewerId = getUserId(req);
  const rows = await db.select().from(communitiesTable).orderBy(communitiesTable.createdAt);
  const dtos = await Promise.all(
    rows.map((row) => toCommunityDto(row, viewerId)),
  );
  res.json(ListCommunitiesResponse.parse(dtos));
});

router.post("/communities", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  await ensureProfile(userId);
  const name = String(req.body?.name ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const cover = String(req.body?.cover ?? req.body?.cover_url ?? "");
  const tags = Array.isArray(req.body?.tags)
    ? req.body.tags.map((t: unknown) => String(t)).slice(0, 12)
    : [];
  if (!name || name.length < 2) {
    res.status(400).json({ error: "Community name is required (min 2 characters)" });
    return;
  }
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    try {
      const [created] = await db
        .insert(communitiesTable)
        .values({
          name,
          description,
          cover,
          tags,
          // creator may be stored differently depending on schema; keep minimal fields
        } as any)
        .returning();
      if (!created) {
        res.status(500).json({ error: "Failed to create community" });
        return;
      }
      await db
        .insert(communityMembersTable)
        .values({ communityId: created.id, userId } as any)
        .onConflictDoNothing();
      res.status(201).json(await toCommunityDto(created, userId, true));
      return;
    } catch (e: any) {
      if (String(e?.message ?? e).includes("unique") || e?.code === "23505") {
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
        continue;
      }
      res.status(500).json({ error: String(e?.message ?? e) });
      return;
    }
  }
  res.status(409).json({ error: "Could not allocate a unique community slug" });
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
