import { sql } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, users } from "../schema";

export async function resetDatabase() {
  await db.execute(sql`TRUNCATE TABLE ${users}, ${feeds}, ${feedFollows}`);
}
