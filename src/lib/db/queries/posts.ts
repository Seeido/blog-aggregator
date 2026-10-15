import { db } from "..";
import { posts } from "../schema";

type NewPost = typeof posts.$inferInsert;

export async function createPosts(newPosts: NewPost[]) {
  const result = await db
    .insert(posts)
    .values(newPosts)
    .onConflictDoNothing()
    .returning();

  return result;
}
