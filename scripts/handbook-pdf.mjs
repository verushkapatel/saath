// Makes one handbook PDF per language from the built site, so the PDF, the app and the printed copy never disagree.
// Run after `npm run build:pages`. It needs Google Chrome. Without Chrome, the Handbook screen still offers
// "Print or save as PDF", which produces the same pages from the same content.
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].find((path) => path && existsSync(path));

if (!existsSync(join(out, "index.html"))) {
  console.error("Build the static site first: npm run build:pages");
  process.exit(1);
}
if (!chrome) {
  console.warn("Chrome was not found, so no PDFs were made. The app's Print button still works.");
  process.exit(0);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((request, response) => {
  let path = decodeURIComponent(new URL(request.url, "http://x").pathname);
  if (base && path.startsWith(base)) path = path.slice(base.length);
  let file = join(out, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
mkdirSync(join(root, "public", "handbook"), { recursive: true });
mkdirSync(join(out, "handbook"), { recursive: true });

let failed = false;
for (const lang of ["en", "hi", "mr"]) {
  const name = `saath-handbook-${lang}.pdf`;
  const target = join(root, "public", "handbook", name);
  // Chrome is started without blocking, because this same process is serving it the pages.
  const status = await new Promise((resolve) => {
    const child = spawn(chrome, [
      "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=20000",
      // Chrome refuses to start its sandbox as root, which is how containers and CI usually run.
      ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
      `--print-to-pdf=${target}`,
      `http://127.0.0.1:${port}${base}/handbook/?lang=${lang}&print=1`,
    ], { stdio: "ignore" });
    const timer = setTimeout(() => child.kill(), 120_000);
    child.on("exit", (code) => { clearTimeout(timer); resolve(code); });
    child.on("error", () => { clearTimeout(timer); resolve(1); });
  });
  if (status !== 0 || !existsSync(target) || statSync(target).size < 20_000) {
    console.warn(`Could not make ${name}.`);
    failed = true;
    continue;
  }
  copyFileSync(target, join(out, "handbook", name));
  console.log(`${name}: ${Math.round(statSync(target).size / 1024)} KB`);
}
server.close();
process.exit(failed ? 1 : 0);
