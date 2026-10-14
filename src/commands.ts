import { readConfig, setUser } from "./config";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feedFollows";
import {
  createFeed,
  getFeedByUrl,
  getFeedsWithUsernames,
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds";
import { resetDatabase } from "./lib/db/queries/reset";
import { createUser, getUser, getUsers } from "./lib/db/queries/users";
import { Feed, User } from "./lib/db/schema";
import { fetchFeed } from "./lib/rss";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName, ...args) => {
    const currentUser = readConfig().currentUserName;
    if (!currentUser) {
      throw new Error("not logged in");
    }
    const user = await getUser(currentUser);
    if (!user) {
      throw new Error("logged in user doesn't exist");
    }

    await handler(cmdName, user, ...args);
  };
}

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

export async function handlerAgg(_cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error(" please enter valid duration");
  }
  const timeBetweenReqs = args[0];
  const duration = parseDuration(timeBetweenReqs);
  if (duration < 5 * 1000) {
    throw new Error("duration between requests should be at least 5s");
  }
  console.log(`Collecting feeds every ${timeBetweenReqs}`);
  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, duration);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

function handleError(error: unknown) {
  console.error(`${error}`);
  if (error instanceof Error && error.cause instanceof Error) {
    console.error(`Cause: ${error.cause.message}`);
  }
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) {
    throw new Error("invalid duration form");
  }
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
  };
  const number = parseInt(match[1]);
  const unit = match[2] as keyof typeof multipliers;
  return number * multipliers[unit];
}

export async function handlerAddfeed(
  _cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 2) {
    throw new Error("feed name and url are required to add feed");
  }
  const name = args[0];
  const url = args[1];

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

export async function handlerFollow(
  _cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error("one url is required, to follow");
  }
  const url = args[0];
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error("feed isn't available");
  }
  await createFeedFollow(user.id, feed.id);
  console.log(`${user.name} now follows ${feed.name}!`);
}

export async function handlerFollowing(_cmdName: string, user: User) {
  const feedFollows = await getFeedFollowsForUser(user.id);
  const formattedFeeds = feedFollows.map(
    (feed) => `- ${feed.feedName} (${feed.feedUrl})`,
  );
  console.log(`Feeds followed by ${user.name}:\n${formattedFeeds.join("\n")}`);
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

export async function handlerUnfollow(
  _cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error("one url is required, to unfollow");
  }
  const url = args[0];
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error("feed isn't available");
  }
  await deleteFeedFollow(user.id, feed.id);
  console.log(`${user.name} unfollowed ${feed.name}!`);
}

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    throw new Error("no feeds to fetch");
  }
  await markFeedFetched(feed.id);
  const result = await fetchFeed(feed.url);
  console.log(`Posts from ${feed.name}:`);
  for (const item of result.channel.item) {
    console.log(`- ${item.title}`);
  }
  console.log();
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
