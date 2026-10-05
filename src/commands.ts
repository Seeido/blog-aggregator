import { setUser } from "./config";

type CommandHandler = (cmdName: string, ...args: string[]) => void;

export function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
    throw new Error("username is required to login");
  }
  setUser(args[0]);
  console.log(`User ${args[0]} has been set!`);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
) {
  registry[cmdName] = handler;
}

export function runCommand(
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
