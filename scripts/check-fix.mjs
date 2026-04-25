import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2).filter((arg, index) => {
  return !(index === 0 && arg === "--");
});
const targets = args.length > 0 ? args : ["."];
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");
const localBiome = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "biome.cmd" : "biome"
);
const biomeCommand = existsSync(localBiome) ? localBiome : "biome";

const result = spawnSync(biomeCommand, ["check", "--write", ...targets], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
