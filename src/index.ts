import {
  CommandsRegistry,
  handlerLogin,
  handlerRegister,
  registerCommand,
  runCommand,
} from "./commands";
import { argv } from "node:process";

const cliArgs = argv.slice(2);

async function main() {
  let registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  if (cliArgs.length < 1) {
    console.error(`Please provide a command to run`);
    process.exit(1); // No command provided
  }
  const commandIdx = 0;
  const command = cliArgs[commandIdx];
  const args = cliArgs.slice(commandIdx + 1);
  try {
    await runCommand(registry, command, ...args);
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
