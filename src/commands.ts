import { readConfig, setUser } from "./config";
import {
  createFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feedFollows";
import {
  createFeed,
  getFeedByUrl,
  getFeedsWithUsernames,
} from "./lib/db/queries/feeds";
import { resetDatabase } from "./lib/db/queries/reset";
import { createUser, getUser, getUsers } from "./lib/db/queries/users";
import { Feed, User } from "./lib/db/schema";
import { fetchFeed } from "./lib/rss";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export async function handlerLogin(_cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error("username is required to login");
  }
  const username = args[0];
  if (!(await getUser(username))) {
    throw new Error("user doesn't exist");
  }
  setUser(username);
  console.log(`Logged in as ${username}!`);
}

export async function handlerRegister(_cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error("a username is required to register");
  }
  const username = args[0];
  if (await getUser(username)) {
    throw new Error("user already exists");
  }
  await createUser(username);
  setUser(username);
  console.log(`User ${username} has been registered!`);
}

export async function handlerUsers() {
  const currentUser = readConfig().currentUserName;
  const users = await getUsers();
  for (const user of users) {
    const suffix = user.name === currentUser ? " (current)" : "";
    console.log(`* ${user.name}${suffix}`);
  }
}

export async function handlerReset() {
  await resetDatabase();
  console.log("Database reset successfully!");
}

export async function handlerAgg() {
  const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
  console.log(JSON.stringify(feed, null, 2));
}

export async function handlerAddfeed(_cmdName: string, ...args: string[]) {
  if (args.length !== 2) {
    throw new Error("feed name and url are required to add feed");
  }
  const name = args[0];
  const url = args[1];
  const user = await getCurrentUser();

  const feed = await createFeed(name, url, user.id);
  await createFeedFollow(user.id, feed.id);

  printFeed(feed, user);
}

export async function handlerFeeds() {
  const rows = await getFeedsWithUsernames();
  for (const row of rows) {
    console.log(`- ${row.feedName} (${row.feedUrl}) added by ${row.username}`);
  }
}

export async function handlerFollow(_cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error("one url is required, to follow");
  }
  const url = args[0];
  const user = await getCurrentUser();
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error("feed isn't available");
  }
  await createFeedFollow(user.id, feed.id);
  console.log(`${user.name} now follows ${feed.name}!`);
}

export async function handlerFollowing() {
  const user = await getCurrentUser();
  const feedFollows = await getFeedFollowsForUser(user.id);
  const formattedFeeds = feedFollows.map(
    (feed) => `- ${feed.feedName} (${feed.feedUrl})`,
  );
  console.log(`Feeds followed by ${user.name}:\n${formattedFeeds.join("\n")}`);
}

async function getCurrentUser() {
  const currentUser = readConfig().currentUserName;
  if (!currentUser) {
    throw new Error("not logged in");
  }
  const user = await getUser(currentUser);
  if (!user) {
    throw new Error("logged in user doesn't exist");
  }
  return user;
}

function printFeed(feed: Feed, user: User) {
  const message = `Feed created:
  ID:       ${feed.id}
  Name:     ${feed.name}
  URL:      ${feed.url}
  Added by: ${user.name}
  Created:  ${feed.createdAt}`;
  console.log(message);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
) {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }
  return handler(cmdName, ...args);
}

export type CommandsRegistry = Record<string, CommandHandler>;
