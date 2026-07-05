import { and, count, eq } from "drizzle-orm";
import {
  db,
  communitiesTable,
  communityMembersTable,
  profilesTable,
  type Community,
} from "@workspace/db";
import { toProfileDto, type ProfileDto } from "./profiles";

export interface CommunityDto {
  id: number;
  name: string;
  description: string;
  cover: string;
  tags: string[];
  memberCount: number;
  isJoinedByMe: boolean;
  members?: ProfileDto[];
  createdAt: Date;
}

export async function toCommunityDto(
  community: Community,
  viewerId: string | undefined,
  includeMembers = false,
): Promise<CommunityDto> {
  const [[memberRow], joinedRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(communityMembersTable)
      .where(eq(communityMembersTable.communityId, community.id)),
    viewerId
      ? db
          .select({ value: count() })
          .from(communityMembersTable)
          .where(
            and(
              eq(communityMembersTable.communityId, community.id),
              eq(communityMembersTable.userId, viewerId),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
  ]);

  let members: ProfileDto[] | undefined;
  if (includeMembers) {
    const rows = await db
      .select({ profile: profilesTable })
      .from(communityMembersTable)
      .innerJoin(
        profilesTable,
        eq(communityMembersTable.userId, profilesTable.id),
      )
      .where(eq(communityMembersTable.communityId, community.id));
    members = await Promise.all(
      rows.map((row) => toProfileDto(row.profile, viewerId)),
    );
  }

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    cover: community.cover,
    tags: community.tags,
    memberCount: memberRow?.value ?? 0,
    isJoinedByMe: (Array.isArray(joinedRow) ? joinedRow[0]?.value : 0) > 0,
    members,
    createdAt: community.createdAt,
  };
}

export { communitiesTable };
