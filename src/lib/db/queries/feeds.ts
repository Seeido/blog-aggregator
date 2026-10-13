import { db } from "..";
import { feeds } from "../schema";

export async function createFeed(name: string, url: string, user_id: string) {
  const [result] = await db
    .insert(feeds)
    .values({ name: name, url: url, userId: user_id })
    .returning();
  return result;
}
