import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASE_IDS, CATEGORIES, LANGS, LESSON_IDS, PATH_IDS } from "@/lib/catalog";
import { answerFromDocument } from "@/lib/ask";
import { fill } from "@/lib/copy";
import { ruleExtract } from "@/lib/extract";
import { redact } from "@/lib/redact";
import { SAMPLES } from "@/lib/samples";

const root = process.cwd();

function readJson(path: string) {
  return JSON.parse(readFileSync(`${root}/${path}`, "utf8"));
}

describe("locales", () => {
  it("keeps the same keys in all three languages", () => {
    const leaves = (value: unknown, prefix = ""): string[] => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
          leaves(child, prefix ? `${prefix}.${key}` : key),
        );
      }
      return [prefix];
    };
    const english = new Set(leaves(readJson("locales/en.json")));
    for (const lang of ["hi", "mr"]) {
      const keys = new Set(leaves(readJson(`locales/${lang}.json`)));
      expect([...english].filter((key) => !keys.has(key))).toEqual([]);
      expect([...keys].filter((key) => !english.has(key))).toEqual([]);
    }
  });
});

describe("content", () => {
  it("ships sixty questions, twelve cases, twenty-five lessons, and sixty terms", () => {
    const questions = readJson("content/daily-questions.json");
    const cases = readJson("content/cases.json");
    const guide = readJson("content/guide.json");
    const glossary = readJson("content/glossary.json");
    expect(questions).toHaveLength(60);
    expect(cases).toHaveLength(12);
    expect(guide).toHaveLength(25);
    expect(glossary).toHaveLength(60);
    expect(guide.map((item: { id: string }) => item.id)).toEqual([...LESSON_IDS]);
    expect(cases.map((item: { id: string }) => item.id)).toEqual([...CASE_IDS]);

    const termIds = new Set(glossary.map((item: { id: string }) => item.id));
    for (const lesson of guide) {
      for (const lang of LANGS) {
        expect(lesson.title[lang].length).toBeGreaterThan(0);
        expect(lesson.body[lang].length).toBeGreaterThan(40);
        for (const id of lesson.body[lang].matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
          expect(termIds.has(id[1])).toBe(true);
        }
        // Every lesson is a real mini lesson: points, an example, something to try, and one question.
        expect(lesson.points.length).toBeGreaterThanOrEqual(3);
        expect(lesson.points.length).toBeLessThanOrEqual(5);
        for (const point of lesson.points) expect(point[lang].length).toBeGreaterThan(10);
        expect(lesson.example[lang].length).toBeGreaterThan(40);
        expect(lesson.tryIt.text[lang].length).toBeGreaterThan(10);
        expect(lesson.check.question[lang].length).toBeGreaterThan(5);
        expect(lesson.check.why[lang].length).toBeGreaterThan(5);
        expect(Object.keys(lesson.title).sort()).toEqual(["en", "hi", "mr"]);
      }
      expect(CATEGORIES).toContain(lesson.category);
      expect(lesson.check.options).toHaveLength(3);
      expect(lesson.check.answer).toBeLessThan(3);
    }
    for (const item of questions) {
      expect(item.options.length === 3 || item.options.length === 4).toBe(true);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(item.options.length);
      for (const lang of LANGS) {
        expect(item.prompt[lang].length).toBeGreaterThan(0);
        expect(item.why[lang].length).toBeGreaterThan(0);
      }
    }
    const linked = cases.filter((item: { sampleId: string | null }) => item.sampleId).map((item: { sampleId: string }) => item.sampleId);
    expect(linked).toEqual(expect.arrayContaining(["personal-loan", "gold-loan", "scheme-form"]));
  });

  it("precaches lessons, cases, locales, and samples", () => {
    const worker = readFileSync(`${root}/public/sw.js`, "utf8");
    for (const id of LESSON_IDS) expect(worker).toContain(`/guide/${id}`);
    for (const id of CASE_IDS) expect(worker).toContain(`/money-lab/case/${id}`);
    for (const lang of LANGS) expect(worker).toContain(`/locales/${lang}.json`);
    expect(worker).toContain("/samples/personal-loan.png");
    expect(worker).toContain("/content/glossary.json");
    expect(worker).toContain("/content/paths.json");
    for (const id of PATH_IDS) expect(worker).toContain(`/paths/${id}`);
    expect(worker).not.toContain("kn.json");
  });
});

describe("copy", () => {
  it("fills a sentence only when the values are known", () => {
    expect(fill("You borrow {principal} from {lender}.")).toBe("You borrow {principal} from {lender}.");
    expect(fill("You borrow {principal} from {lender}.", { principal: "₹1", lender: "Northstar" })).toBe("You borrow ₹1 from Northstar.");
  });
});

describe("documents", () => {
  it("hides identity numbers before any model would see them", () => {
    const hidden = redact("Aadhaar 1234 5678 9012 PAN ABCDE1234F phone 9876543210 account 12345678901234");
    expect(hidden).not.toContain("1234 5678 9012");
    expect(hidden).not.toContain("ABCDE1234F");
    expect(hidden).not.toContain("9876543210");
    expect(hidden).toContain("[aadhaar hidden]");
    expect(hidden).toContain("[pan hidden]");
    expect(hidden).toContain("[phone hidden]");
    expect(hidden).toContain("[account hidden]");
  });

  it("answers from the paper and admits when the paper is silent", () => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    const rate = answerFromDocument("What is the interest rate?", extraction);
    expect(rate.found).toBe(true);
    expect(rate.key).toBe("ask.rate");
    const silent = answerFromDocument("What is the colour of the office wall?", extraction);
    expect(silent.found).toBe(false);
    expect(silent.key).toBe("ask.unknown");
  });
});
