import { eq } from "drizzle-orm";
import { db } from "..";
import { feeds, users } from "../schema";

export async function createFeed(name: string, url: string, user_id: string) {
  const [result] = await db
    .insert(feeds)
    .values({ name: name, url: url, userId: user_id })
    .returning();
  return result;
}

export async function getFeedsWithUsernames() {
  return db
    .select({ feedName: feeds.name, feedUrl: feeds.url, username: users.name })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}
