import { Router, type IRouter } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, followsTable, profilesTable } from "@workspace/db";
import {
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
  CompleteOnboardingBody,
  CompleteOnboardingResponse,
  ListProfilesQueryParams,
  ListProfilesResponse,
  GetProfileParams,
  GetProfileResponse,
  FollowProfileParams,
  UnfollowProfileParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { ensureProfile, toProfileDto } from "../lib/profiles";

const router: IRouter = Router();

router.get("/profiles/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const profile = await ensureProfile(userId);
  res.json(GetMyProfileResponse.parse(await toProfileDto(profile, userId)));
});

router.patch("/profiles/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureProfile(userId);
  const [updated] = await db
    .update(profilesTable)
    .set(parsed.data)
    .where(eq(profilesTable.id, userId))
    .returning();
  res.json(UpdateMyProfileResponse.parse(await toProfileDto(updated, userId)));
});

router.post(
  "/profiles/me/onboarding",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = getUserId(req)!;
    const parsed = CompleteOnboardingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureProfile(userId);
    const [updated] = await db
      .update(profilesTable)
      .set({ ...parsed.data, onboarded: true })
      .where(eq(profilesTable.id, userId))
      .returning();
    res.json(
      CompleteOnboardingResponse.parse(await toProfileDto(updated, userId)),
    );
  },
);

router.get("/profiles", async (req, res): Promise<void> => {
  const query = ListProfilesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const { q } = query.data;

  const rows = await db
    .select()
    .from(profilesTable)
    .where(
      q
        ? or(
            ilike(profilesTable.name, `%${q}%`),
            ilike(profilesTable.username, `%${q}%`),
            ilike(profilesTable.bio, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(profilesTable.createdAt)
    .limit(100);

  const dtos = await Promise.all(rows.map((row) => toProfileDto(row, viewerId)));
  res.json(ListProfilesResponse.parse(dtos));
});

router.get("/profiles/:id", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetProfileResponse.parse(await toProfileDto(profile, viewerId)));
});

router.post(
  "/profiles/:id/follow",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = FollowProfileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    if (params.data.id === userId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }
    await ensureProfile(userId);
    await db
      .insert(followsTable)
      .values({ followerId: userId, followingId: params.data.id })
      .onConflictDoNothing();
    res.sendStatus(204);
  },
);

router.delete(
  "/profiles/:id/follow",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UnfollowProfileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    await db
      .delete(followsTable)
      .where(
        and(
          eq(followsTable.followerId, userId),
          eq(followsTable.followingId, params.data.id),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
