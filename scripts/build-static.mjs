// Builds a fully static copy of Saath in out/, for GitHub Pages or any static host.
// A static host cannot run the optional /api/extract route, so it is set aside for the build and put back after.
import { existsSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = join(root, "app", "api");
const aside = join(root, ".api-set-aside");

if (existsSync(api)) renameSync(api, aside);
let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, SAATH_STATIC: "1" },
  });
  status = result.status ?? 1;
  if (status === 0) writeFileSync(join(root, "out", ".nojekyll"), "");
} finally {
  if (existsSync(aside)) renameSync(aside, api);
}
process.exit(status);
