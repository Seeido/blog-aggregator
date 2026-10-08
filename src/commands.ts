import { readConfig, setUser } from "./config";
import {
  createUser,
  getUser,
  getUsers,
  resetUsers,
} from "./lib/db/queries/users";
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
  await resetUsers();
  console.log("Table reset successfully!");
}

export async function handlerAgg(cmdName: string, ...args: string[]) {
  const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
  console.log(JSON.stringify(feed, null, 2));
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
