// Builds content/guide.json and content/paths.json from the hand-written sources in this folder.
// Lesson titles, summaries and intros stay in content/guide.json and are never overwritten here.
import { readFileSync, writeFileSync } from "node:fs";
import a from "./lessons-a.mjs";
import b from "./lessons-b.mjs";
import paths from "./paths.mjs";

const LANGS = ["en", "hi", "mr"];
const root = new URL("../../content/", import.meta.url);
const copy = (triple) => Object.fromEntries(LANGS.map((lang, index) => [lang, triple[index]]));
const check = (item) => ({ question: copy(item.q), options: item.o.map(copy), answer: item.a, why: copy(item.why) });

/** Drops any language that is not one of the three Saath supports. */
function onlyLangs(value) {
  if (Array.isArray(value)) return value.map(onlyLangs);
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.includes("en") && keys.includes("hi")) return Object.fromEntries(LANGS.map((lang) => [lang, value[lang]]));
    return Object.fromEntries(keys.map((key) => [key, onlyLangs(value[key])]));
  }
  return value;
}

for (const name of ["cases", "daily-questions", "glossary"]) {
  const url = new URL(`${name}.json`, root);
  writeFileSync(url, `${JSON.stringify(onlyLangs(JSON.parse(readFileSync(url, "utf8"))), null, 2)}\n`);
}

const depth = { ...a, ...b };
const guideUrl = new URL("guide.json", root);
const guide = onlyLangs(JSON.parse(readFileSync(guideUrl, "utf8"))).map((lesson) => {
  const extra = depth[lesson.id];
  if (!extra) throw new Error(`No depth written for lesson ${lesson.id}`);
  return {
    id: lesson.id,
    category: extra.cat,
    icon: extra.icon,
    title: lesson.title,
    summary: lesson.summary,
    body: lesson.body,
    points: extra.points.map(copy),
    example: copy(extra.example),
    tryIt: { text: copy(extra.try[0]), link: extra.try[1] },
    check: check(extra.check),
  };
});
writeFileSync(guideUrl, `${JSON.stringify(guide, null, 2)}\n`);

const lessonTitles = new Map(guide.map((lesson) => [lesson.id, lesson.title]));
const built = paths.map((path) => ({
  id: path.id,
  icon: path.icon,
  title: copy(path.title),
  summary: copy(path.summary),
  milestone: copy(path.milestone),
  caseIds: path.cases,
  steps: path.steps.map((step, index) => {
    const id = `s${index + 1}`;
    if (step[0] === "L") {
      if (!lessonTitles.has(step[1])) throw new Error(`Path ${path.id} names a missing lesson ${step[1]}`);
      return { id, kind: "lesson", lessonId: step[1], title: lessonTitles.get(step[1]) };
    }
    if (step[0] === "A") return { id, kind: "action", title: copy(step[1]), body: copy(step[2]), link: step[3] };
    return { id, kind: "check", title: copy(step[1]), check: check(step[2]) };
  }),
}));
writeFileSync(new URL("paths.json", root), `${JSON.stringify(built, null, 2)}\n`);
console.log(`Wrote ${guide.length} lessons and ${built.length} paths.`);
