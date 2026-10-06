import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { users } from "../schema";

export async function getUser(name: string) {
  const [result] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.name, name));
  return result;
}

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function resetUsers() {
  return db.execute(sql`TRUNCATE TABLE ${users}`);
}
