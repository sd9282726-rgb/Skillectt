import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  ListProjectsQueryParams,
  ListProjectsResponse,
  CreateProjectBody,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { ensureProfile } from "../lib/profiles";
import { toProjectDto } from "../lib/projects";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const viewerId = getUserId(req);
  const rows = await db
    .select()
    .from(projectsTable)
    .where(
      query.data.authorId
        ? eq(projectsTable.authorId, query.data.authorId)
        : undefined,
    )
    .orderBy(desc(projectsTable.createdAt))
    .limit(100);

  const dtos = await Promise.all(rows.map((row) => toProjectDto(row, viewerId)));
  res.json(ListProjectsResponse.parse(dtos));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req)!;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureProfile(userId);
  const [project] = await db
    .insert(projectsTable)
    .values({
      authorId: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      image: parsed.data.image,
      tags: parsed.data.tags ?? [],
      links: parsed.data.links ?? [],
    })
    .returning();
  res.status(201).json(await toProjectDto(project, userId));
});

export default router;
