import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyDirJson(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    // Sub-folders (content/walks) are copied too, so each walkthrough can load on its own.
    if (entry.isDirectory()) copyDirJson(join(from, entry.name), join(to, entry.name));
    else if (entry.name.endsWith(".json")) copyFileSync(join(from, entry.name), join(to, entry.name));
  }
}

copyDirJson(join(root, "locales"), join(root, "public", "locales"));

// The language screen shows all three languages at once, before any one is chosen, so it cannot load a single
// locale file. Its words live in the "land" section of each locale and are gathered here into one small file.
const gate = Object.fromEntries(["en", "hi", "mr"].map((lang) => {
  const land = JSON.parse(readFileSync(join(root, "locales", `${lang}.json`), "utf8")).land;
  return [lang, land];
}));
writeFileSync(join(root, "public", "locales", "gate.json"), JSON.stringify(gate));
copyDirJson(join(root, "content"), join(root, "public", "content"));

const tessJs = join(root, "node_modules", "tesseract.js", "dist", "worker.min.js");
const tessOut = join(root, "public", "tesseract");
mkdirSync(tessOut, { recursive: true });
if (existsSync(tessJs)) copyFileSync(tessJs, join(tessOut, "worker.min.js"));

const coreDir = join(root, "node_modules", "tesseract.js-core");
const coreCandidates = [
  "tesseract-core.wasm.js",
  "tesseract-core-simd.wasm.js",
  "tesseract-core-lstm.wasm.js",
];
if (existsSync(coreDir)) {
  for (const name of coreCandidates) {
    const path = join(coreDir, name);
    if (existsSync(path)) {
      copyFileSync(path, join(tessOut, "tesseract-core.wasm.js"));
      const wasm = path.replace(/\.js$/, "");
      if (existsSync(wasm)) copyFileSync(wasm, join(tessOut, "tesseract-core.wasm"));
      break;
    }
  }
}

const tessdata = join(root, "public", "tessdata");
mkdirSync(tessdata, { recursive: true });
const langs = ["eng", "hin", "mar"];
const mirrors = [
  "https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_fast",
  "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast",
];

function download(url, dest) {
  const result = spawnSync("curl", ["-fsSL", "--retry", "2", "--max-time", "60", "-o", dest, url], { stdio: "ignore" });
  return result.status === 0 && existsSync(dest);
}

for (const code of langs) {
  const dest = join(tessdata, `${code}.traineddata.gz`);
  if (existsSync(dest)) continue;
  let ok = false;
  for (const base of mirrors) {
    if (download(`${base}/${code}.traineddata.gz`, dest)) {
      ok = true;
      break;
    }
  }
  if (!ok) {
    console.warn(`Could not download ${code} OCR data. Scan will fetch it on first use if the network is available.`);
  }
}

// The service worker precaches every page. Its list is written here so it never falls out of step with the content.
const load = (name) => JSON.parse(readFileSync(join(root, "content", name), "utf8"));
const read = (name) => load(name).map((item) => item.id);
const pages = [
  "/", "/journey", "/guide", "/money-lab", "/forms", "/forms/explain", "/stories", "/ai", "/progress", "/settings",
  "/scan", "/resume", "/paths", "/privacy", "/privacy/partners", "/about", "/admin", "/check", "/drills", "/handbook",
  ...load("journey-chapters.json").chapters.map((chapter) => `/journey/${chapter.id}`),
  ...load("forms.json").forms.map((form) => `/forms/${form.id}`),
  ...["scam", "form", "price", "stories"].map((id) => `/drills/${id}`),
  ...read("guide.json").map((id) => `/guide/${id}`),
  ...readdirSync(join(root, "content", "walks")).map((name) => `/content/walks/${name}`),
  ...read("cases.json").map((id) => `/money-lab/case/${id}`),
  ...read("paths.json").map((id) => `/paths/${id}`),
];
const template = readFileSync(join(root, "scripts", "sw.template.js"), "utf8");
writeFileSync(join(root, "public", "sw.js"), template.replace("/*PAGES*/", pages.map((page) => `  "${page}",`).join("\n")));

console.log("Synced locales, content, OCR files and the service worker into public/");
