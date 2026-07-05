import { eq } from "drizzle-orm";
import { db, profilesTable, type Project } from "@workspace/db";
import { toProfileDto, type ProfileDto } from "./profiles";

export interface ProjectDto {
  id: number;
  authorId: string;
  author: ProfileDto;
  title: string;
  description: string;
  image: string | null;
  tags: string[];
  links: { label: string; url: string }[];
  createdAt: Date;
}

export async function toProjectDto(
  project: Project,
  viewerId: string | undefined,
): Promise<ProjectDto> {
  const [author] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, project.authorId));

  return {
    id: project.id,
    authorId: project.authorId,
    author: await toProfileDto(author, viewerId),
    title: project.title,
    description: project.description,
    image: project.image ?? null,
    tags: project.tags,
    links: project.links,
    createdAt: project.createdAt,
  };
}
