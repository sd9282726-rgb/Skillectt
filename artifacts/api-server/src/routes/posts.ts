import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  commentsTable,
  postLikesTable,
  postsTable,
  profilesTable,
} from "@workspace/db";
import {
  ListPostsQueryParams,
  ListPostsResponse,
  CreatePostBody,
  GetPostParams,
  GetPostResponse,
  LikePostParams,
  UnlikePostParams,
  ListCommentsParams,
  ListCommentsResponse,
  CreateCommentParams,
  CreateCommentBody,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { ensureProfile, toProfileDto } from "../lib/profiles";
import { toPostDto } from "../lib/posts";

const router: IRouter = Router();

router.get("/posts", async (req, res): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const { authorId, sort, q } = query.data;

  const conditions = [
    authorId ? eq(postsTable.authorId, authorId) : undefined,
    q
      ? or(
          ilike(postsTable.content, `%${q}%`),
          sql`${postsTable.tags}::text ilike ${`%${q}%`}`,
        )
      : undefined,
  ].filter(Boolean);

  let rows;
  if (sort === "trending") {
    rows = await db
      .select({
        post: postsTable,
        likeCount: sql<number>`count(distinct ${postLikesTable.userId})`.as(
          "like_count",
        ),
      })
      .from(postsTable)
      .leftJoin(postLikesTable, eq(postLikesTable.postId, postsTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(postsTable.id)
      .orderBy(desc(sql`count(distinct ${postLikesTable.userId})`), desc(postsTable.createdAt))
      .limit(100)
      .then((r) => r.map((row) => row.post));
  } else {
    rows = await db
      .select()
      .from(postsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(postsTable.createdAt))
      .limit(100);
  }

  const dtos = await Promise.all(rows.map((row) => toPostDto(row, viewerId)));
  res.json(ListPostsResponse.parse(dtos));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureProfile(userId);
  const [post] = await db
    .insert(postsTable)
    .values({
      authorId: userId,
      content: parsed.data.content,
      image: parsed.data.image,
      tags: parsed.data.tags ?? [],
    })
    .returning();
  res.status(201).json(GetPostResponse.parse(await toPostDto(post, userId)));
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetPostResponse.parse(await toPostDto(post, viewerId)));
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const params = LikePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = getUserId(req)!;
  await ensureProfile(userId);
  await db
    .insert(postLikesTable)
    .values({ postId: params.data.id, userId })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.delete(
  "/posts/:id/like",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UnlikePostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = getUserId(req)!;
    await db
      .delete(postLikesTable)
      .where(
        and(
          eq(postLikesTable.postId, params.data.id),
          eq(postLikesTable.userId, userId),
        ),
      );
    res.sendStatus(204);
  },
);

router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const params = ListCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, params.data.id))
    .orderBy(commentsTable.createdAt);

  const dtos = await Promise.all(
    rows.map(async (row) => {
      const [author] = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.id, row.authorId));
      return {
        id: row.id,
        postId: row.postId,
        authorId: row.authorId,
        author: await toProfileDto(author, viewerId),
        content: row.content,
        createdAt: row.createdAt,
      };
    }),
  );
  res.json(ListCommentsResponse.parse(dtos));
});

router.post(
  "/posts/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateCommentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = getUserId(req)!;
    await ensureProfile(userId);
    const [comment] = await db
      .insert(commentsTable)
      .values({
        postId: params.data.id,
        authorId: userId,
        content: parsed.data.content,
      })
      .returning();
    const [author] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, userId));
    res.status(201).json({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      author: await toProfileDto(author, userId),
      content: comment.content,
      createdAt: comment.createdAt,
    });
  },
);

export default router;
