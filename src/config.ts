import path from "node:path";
import os from "node:os";
import { readFileSync, writeFileSync } from "node:fs";

const CONFIG_FILE_NAME = ".gatorconfig.json";

type Config = {
  dbUrl: string;
  currentUserName: string;
};

export function setUser(username: string): void {
  const config = readConfig();
  config.currentUserName = username;
  writeConfig(config);
}

export function readConfig(): Config {
  const url = getConfigFilePath();
  const rawConfig = readFileSync(url, { encoding: "utf-8" });
  const config = validateConfig(rawConfig);
  return config;
}

function getConfigFilePath(): string {
  return path.join(os.homedir(), "/" + CONFIG_FILE_NAME);
}

function writeConfig(cfg: Config): void {
  const url = getConfigFilePath();
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  writeFileSync(url, JSON.stringify(rawConfig));
}

function validateConfig(rawConfig: any): Config {
  const config = JSON.parse(rawConfig);
  if (!config.db_url || typeof config.db_url !== "string") {
    throw new Error("db_url is required in config file");
  }

  return {
    dbUrl: config.db_url,
    currentUserName: config.current_user_name,
  };
}
