// Builds a fully static copy of Saath in out/, for GitHub Pages or any static host.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["next", "build"], { cwd: root, stdio: "inherit", env: { ...process.env, SAATH_STATIC: "1" } });
if (result.status === 0) writeFileSync(join(root, "out", ".nojekyll"), "");
process.exit(result.status ?? 1);
