import { and, count, eq } from "drizzle-orm";
import {
  db,
  commentsTable,
  postLikesTable,
  postsTable,
  profilesTable,
  type Post,
} from "@workspace/db";
import { toProfileDto, type ProfileDto } from "./profiles";

export interface PostDto {
  id: number;
  authorId: string;
  author: ProfileDto;
  content: string;
  image: string | null;
  tags: string[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: Date;
}

export async function toPostDto(
  post: Post,
  viewerId: string | undefined,
): Promise<PostDto> {
  const [[author], [likeRow], [commentRow], likedRow] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.id, post.authorId)),
    db
      .select({ value: count() })
      .from(postLikesTable)
      .where(eq(postLikesTable.postId, post.id)),
    db
      .select({ value: count() })
      .from(commentsTable)
      .where(eq(commentsTable.postId, post.id)),
    viewerId
      ? db
          .select({ value: count() })
          .from(postLikesTable)
          .where(
            and(
              eq(postLikesTable.postId, post.id),
              eq(postLikesTable.userId, viewerId),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
  ]);

  return {
    id: post.id,
    authorId: post.authorId,
    author: await toProfileDto(author, viewerId),
    content: post.content,
    image: post.image ?? null,
    tags: post.tags,
    likeCount: likeRow?.value ?? 0,
    commentCount: commentRow?.value ?? 0,
    likedByMe: (Array.isArray(likedRow) ? likedRow[0]?.value : 0) > 0,
    createdAt: post.createdAt,
  };
}
