import { setUser } from "./config";
import { createUser, getUser } from "./lib/db/queries/users";

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
