import { db, profilesTable, postsTable, postLikesTable, commentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  seedPersonas,
  demoPersonas,
  pickPostContent,
  commentTemplates,
} from "./seed-data";

const DAYS_OF_HISTORY = 14;
const MIN_POSTS_PER_DAY = 1;
const MAX_POSTS_PER_DAY = 2;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function upsertProfiles() {
  for (const persona of seedPersonas) {
    await db
      .insert(profilesTable)
      .values({
        id: persona.id,
        name: persona.name,
        username: persona.username,
        avatar: persona.avatar,
        bio: persona.bio,
        location: persona.location,
        skills: persona.skills,
        onboarded: true,
        isSeed: true,
      })
      .onConflictDoUpdate({
        target: profilesTable.id,
        set: {
          name: persona.name,
          username: persona.username,
          avatar: persona.avatar,
          bio: persona.bio,
          location: persona.location,
          skills: persona.skills,
          onboarded: true,
          isSeed: true,
        },
      });
  }
  console.log(`Upserted ${seedPersonas.length} seed profiles.`);
}

async function backfillPosts() {
  for (const persona of seedPersonas) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postsTable)
      .where(eq(postsTable.authorId, persona.id));

    if (count > 0) {
      console.log(`Skipping backfill for ${persona.username}, already has ${count} posts.`);
      continue;
    }

    const usedIndexes = new Set<number>();
    const now = Date.now();
    let createdCount = 0;

    for (let dayOffset = DAYS_OF_HISTORY; dayOffset >= 0; dayOffset--) {
      const postsToday = randomInt(MIN_POSTS_PER_DAY, MAX_POSTS_PER_DAY);
      for (let i = 0; i < postsToday; i++) {
        const { content, index } = pickPostContent(persona.postTopics[0], usedIndexes);
        usedIndexes.add(index);

        const hourOffset = randomInt(8, 22);
        const minuteOffset = randomInt(0, 59);
        const createdAt = new Date(
          now - dayOffset * 24 * 60 * 60 * 1000,
        );
        createdAt.setHours(hourOffset, minuteOffset, 0, 0);

        if (createdAt.getTime() > now) continue;

        await db.insert(postsTable).values({
          authorId: persona.id,
          content,
          tags: persona.skills.slice(0, 2),
          createdAt,
        });
        createdCount++;
      }
    }
    console.log(`Backfilled ${createdCount} posts for ${persona.username}.`);
  }
}

async function seedEngagement() {
  const allPosts = await db.select().from(postsTable);
  if (allPosts.length === 0) return;

  let likeCount = 0;
  let commentCount = 0;

  for (const post of allPosts) {
    const engagers = demoPersonas.filter((p) => p.id !== post.authorId);

    for (const engager of engagers) {
      if (Math.random() < 0.35) {
        try {
          await db
            .insert(postLikesTable)
            .values({ postId: post.id, userId: engager.id })
            .onConflictDoNothing();
          likeCount++;
        } catch {
          // ignore duplicate/constraint races
        }
      }
    }

    if (Math.random() < 0.25) {
      const commenter = pick(demoPersonas.filter((p) => p.id !== post.authorId));
      if (commenter) {
        await db.insert(commentsTable).values({
          postId: post.id,
          authorId: commenter.id,
          content: pick(commentTemplates),
        });
        commentCount++;
      }
    }
  }

  console.log(`Seeded ${likeCount} likes and ${commentCount} comments.`);
}

async function main() {
  console.log("Seeding Skillect demo data...");
  await upsertProfiles();
  await backfillPosts();
  await seedEngagement();
  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
