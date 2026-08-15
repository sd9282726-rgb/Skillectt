import { db, profilesTable, postsTable, postLikesTable, commentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { seedPersonas, demoPersonas, pickPostContent, commentTemplates } from "./seed-data";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const TARGET_POSTS_PER_DAY = 1.5;
const AVG_GAP_MS = (24 * 60 * 60 * 1000) / TARGET_POSTS_PER_DAY;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function maybePost(persona: (typeof seedPersonas)[number]) {
  const [lastPost] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.authorId, persona.id))
    .orderBy(desc(postsTable.createdAt))
    .limit(1);

  const sinceLast = lastPost ? Date.now() - lastPost.createdAt.getTime() : Infinity;
  if (sinceLast < AVG_GAP_MS * 0.5) return;

  const probability = Math.min(1, (CHECK_INTERVAL_MS / AVG_GAP_MS) * 1.5);
  if (Math.random() > probability) return;

  const { content } = pickPostContent(persona.postTopics[0], new Set());
  await db.insert(postsTable).values({
    authorId: persona.id,
    content,
    tags: persona.skills.slice(0, 2),
  });
  console.log(`[auto-post] ${persona.username} posted a new update.`);
}

async function maybeEngage() {
  const recentPosts = await db
    .select()
    .from(postsTable)
    .orderBy(desc(postsTable.createdAt))
    .limit(20);

  for (const post of recentPosts) {
    const engagers = demoPersonas.filter((p) => p.id !== post.authorId);

    if (Math.random() < 0.08) {
      const liker = pick(engagers);
      if (liker) {
        await db
          .insert(postLikesTable)
          .values({ postId: post.id, userId: liker.id })
          .onConflictDoNothing();
      }
    }

    if (Math.random() < 0.03) {
      const commenter = pick(engagers);
      if (commenter) {
        await db.insert(commentsTable).values({
          postId: post.id,
          authorId: commenter.id,
          content: pick(commentTemplates),
        });
        console.log(`[auto-post] ${commenter.username} commented on a post.`);
      }
    }
  }
}

async function tick() {
  try {
    const hasSeedProfiles = await ensureSeedProfilesExist();
    if (!hasSeedProfiles) return;

    for (const persona of seedPersonas) {
      await maybePost(persona);
    }
    await maybeEngage();
  } catch (err) {
    console.error("[auto-post] tick failed:", err);
  }
}

async function ensureSeedProfilesExist() {
  const existing = await db.select({ id: profilesTable.id }).from(profilesTable).where(eq(profilesTable.isSeed, true));
  if (existing.length === 0) {
    console.log("[auto-post] no seed profiles found yet, skipping this tick.");
    return false;
  }
  return true;
}

async function main() {
  console.log(
    `[auto-post] scheduler started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.`,
  );
  await tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[auto-post] fatal error:", err);
  process.exit(1);
});
