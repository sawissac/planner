import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Settings in `config.json` next to this file (copy `config.example.json`),
 * like `execute-cli/claude`. A missing token is generated and saved on first
 * start; `ownerId` is filled in when Planner pairs (see `auth.ts`).
 */

export type Config = {
  host: string;
  port: number;
  /** Bearer token for every request; paste it in Settings → Image server. */
  token: string;
  /** The Planner (Supabase) user the images belong to; set by pairing. */
  ownerId: string;
  allowedOrigins: string[];
  maxMegabytes: number;
};

const CONFIG_PATH = process.env.PLANNER_IMAGES_CONFIG ?? join(import.meta.dir, "config.json");
const EXAMPLE_PATH = join(import.meta.dir, "config.example.json");
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export { CONFIG_PATH, LOOPBACK };

function save(config: Config): void {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function load(): Config {
  const base = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8")) as Config;
  const own: Partial<Config> = existsSync(CONFIG_PATH)
    ? (JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>)
    : {};
  const config: Config = { ...base, ...own };
  if (!config.token) {
    config.token = `pim_${randomBytes(24).toString("base64url")}`;
    save(config);
    console.log(`[planner-images] generated a token and saved it to ${CONFIG_PATH}`);
  }
  if (!LOOPBACK.has(config.host)) {
    throw new Error(`host must be a loopback address, got "${config.host}"`);
  }
  return config;
}

export const config = load();

/** Record the paired Planner user. */
export function setOwner(userId: string): void {
  config.ownerId = userId;
  save(config);
}
