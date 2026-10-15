import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, posts } from "../schema";

type NewPost = typeof posts.$inferInsert;

export async function createPosts(newPosts: NewPost[]) {
  const result = await db
    .insert(posts)
    .values(newPosts)
    .onConflictDoNothing()
    .returning();

  return result;
}

export async function getPostsForUser(userId: string, limit: number) {
  const result = await db
    .select({
      feedName: feeds.name,
      title: posts.title,
      publishedAt: posts.publishedAt,
      url: posts.url,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, posts.feedId))
    .where(eq(feedFollows.userId, userId))
    .orderBy(sql`${posts.publishedAt} DESC NULLS LAST, ${posts.createdAt} DESC`)
    .limit(limit);

  return result;
}
