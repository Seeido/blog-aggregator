import { readConfig, setUser } from "./config";
import { createFeed } from "./lib/db/queries/feeds";
import { resetDatabase } from "./lib/db/queries/reset";
import { createUser, getUser, getUsers } from "./lib/db/queries/users";
import { Feed, User } from "./lib/db/schema";
import { fetchFeed } from "./lib/rss";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
    throw new Error("username is required to login");
  }
  const username = args[0];
  if (!(await getUser(username))) {
    throw new Error("user doesn't exist");
  }
  setUser(username);
  console.log(`Logged in as ${username}!`);
}

export async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
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

export async function handlerUsers(cmdName: string, ...args: string[]) {
  const currentUser = readConfig().currentUserName;
  const users = await getUsers();
  for (const user of users) {
    const suffix = user.name === currentUser ? " (current)" : "";
    console.log(`* ${user.name}${suffix}`);
  }
}

export async function handlerReset(cmdName: string, ...args: string[]) {
  await resetDatabase();
  console.log("Database reset successfully!");
}

export async function handlerAgg(cmdName: string, ...args: string[]) {
  const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
  console.log(JSON.stringify(feed, null, 2));
}

export async function handlerAddfeed(cmdName: string, ...args: string[]) {
  if (args.length !== 2) {
    throw new Error("feed name and url are required to add feed");
  }
  const name = args[0];
  const url = args[1];
  const currentUser = readConfig().currentUserName;
  if (!currentUser) {
    throw new Error("not logged in");
  }
  const user = await getUser(currentUser);
  if (!user) {
    throw new Error("logged in user doesn't exist");
  }

  const feed = await createFeed(name, url, user.id);

  printFeed(feed, user);
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
