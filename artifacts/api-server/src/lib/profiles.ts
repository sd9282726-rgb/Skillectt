import { clerkClient } from "@clerk/express";
import { and, count, eq } from "drizzle-orm";
import { db, followsTable, profilesTable, type Profile } from "@workspace/db";

function slugifyUsername(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "user";
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (existing) return existing;

  const user = await clerkClient.users.getUser(userId);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    "New User";
  const baseUsername = slugifyUsername(
    user.username || name || `user_${userId.slice(-6)}`,
  ).slice(0, 24);

  let username = baseUsername;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [taken] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.username, username));
    if (!taken) break;
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  const avatar =
    user.imageUrl ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

  const [profile] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      name,
      username,
      avatar,
      bio: "",
      location: "",
      skills: [],
      onboarded: false,
      isSeed: false,
    })
    .returning();

  return profile;
}

export interface ProfileDto {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  skills: string[];
  onboarded: boolean;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  createdAt: Date;
}

export async function toProfileDto(
  profile: Profile,
  viewerId: string | undefined,
): Promise<ProfileDto> {
  const [[followerRow], [followingRow], followedRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(followsTable)
      .where(eq(followsTable.followingId, profile.id)),
    db
      .select({ value: count() })
      .from(followsTable)
      .where(eq(followsTable.followerId, profile.id)),
    viewerId
      ? db
          .select({ value: count() })
          .from(followsTable)
          .where(
            and(
              eq(followsTable.followerId, viewerId),
              eq(followsTable.followingId, profile.id),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
  ]);

  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    avatar: profile.avatar,
    bio: profile.bio,
    location: profile.location,
    skills: profile.skills,
    onboarded: profile.onboarded,
    followerCount: followerRow?.value ?? 0,
    followingCount: followingRow?.value ?? 0,
    isFollowedByMe: (Array.isArray(followedRow) ? followedRow[0]?.value : 0) > 0,
    createdAt: profile.createdAt,
  };
}
