import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASE_IDS, CHAPTER_IDS, DRILL_IDS, FORM_IDS, LANGS, LESSON_IDS, PATH_IDS, TOPICS, UNITS } from "@/lib/catalog";
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
  it("ships sixty questions, twelve cases, forty-five guides, and sixty terms", () => {
    const questions = readJson("content/daily-questions.json");
    const cases = readJson("content/cases.json");
    const guide = readJson("content/guide.json");
    const glossary = readJson("content/glossary.json");
    expect(questions).toHaveLength(60);
    expect(cases).toHaveLength(12);
    expect(guide).toHaveLength(45);
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
      expect(UNITS).toContain(lesson.unit);
      expect(TOPICS).toContain(lesson.topic);
      // Every guide names at least one official page it was checked against.
      expect(lesson.sources?.length).toBeGreaterThan(0);
      for (const url of lesson.sources ?? []) expect(url).toMatch(/^https:\/\/[^/]*(rbi\.org\.in|gov\.in|nic\.in|npci\.org\.in|dicgc\.org\.in|pfrda\.org\.in|ncfe\.org\.in|cybercrime\.gov\.in)/);
      expect(lesson.reviewed).toMatch(/^\d{4}-\d{2}$/);
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
  });

  it("precaches the companion screens and their content, under the new cache name", () => {
    const worker = readFileSync(`${root}/public/sw.js`, "utf8");
    expect(worker).toContain('const CACHE = "saath-v14"');
    for (const page of ["/journey", "/forms", "/forms/explain", "/stories", "/ai", "/progress", "/settings"]) expect(worker).toContain(`"${page}"`);
    expect(worker).not.toContain('"/games"');
    expect(worker).not.toContain('"/comic"');
    for (const id of CHAPTER_IDS) expect(worker).toContain(`/journey/${id}`);
    for (const id of FORM_IDS) expect(worker).toContain(`/forms/${id}`);
    for (const file of ["journey", "forms", "form-fields", "stories", "challenges"]) expect(worker).toContain(`/content/${file}.json`);
    // Only Saath's own caches are cleared, so a downloaded local model survives an update.
    expect(worker).toContain('key.startsWith("saath-")');
  });

  it("gives the installed app the navy of the logo", () => {
    const manifest = readJson("public/manifest.webmanifest");
    expect(manifest.background_color).toBe("#0b1f45");
    expect(manifest.theme_color).toBe("#0b1f45");
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

describe("the Skyward syllabus", () => {
  const guide = readJson("content/guide.json");
  const paths = readJson("content/paths.json");

  it("has no Kannada left anywhere in content or locales", () => {
    for (const file of ["content/guide.json", "content/paths.json", "content/cases.json", "content/daily-questions.json", "content/glossary.json", "content/drills.json", "content/finlit-check.json", "content/journey.json", "content/forms.json", "content/stories.json", "content/form-fields.json", "locales/en.json", "locales/hi.json", "locales/mr.json"]) {
      const text = readFileSync(`${root}/${file}`, "utf8");
      expect(/[\u0C80-\u0CFF]/.test(text)).toBe(false);
      expect(text).not.toContain('"kn"');
    }
  });

  it("covers all four units with lessons and paths", () => {
    for (const unit of UNITS) {
      expect(guide.filter((lesson: { unit: string }) => lesson.unit === unit).length).toBeGreaterThanOrEqual(5);
      expect(paths.filter((path: { unit: string }) => path.unit === unit).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("teaches every topic the partnership brief names", () => {
    const ids = guide.map((lesson: { id: string }) => lesson.id);
    for (const id of ["budget", "pay-yourself", "true-cost", "subscription-traps", "lending-friends", "first-bank-account", "bank-charges", "money-missing", "why-pan", "payment-proof", "credit-score", "pay-later", "guarantor", "fake-loan-apps", "scam-calls", "job-scams", "double-money", "inflation", "what-sip", "who-keeps-safe"]) {
      expect(ids).toContain(id);
    }
  });

  it("does not always put the right answer first", () => {
    const answers = guide.map((lesson: { check: { answer: number } }) => lesson.check.answer);
    expect(new Set(answers).size).toBe(3);
  });

  it("ships fifteen scam messages whose warning words really appear in the message", () => {
    const drills = readJson("content/drills.json");
    expect(drills.scams).toHaveLength(15);
    expect(drills.scams.some((item: { fake: boolean }) => !item.fake)).toBe(true);
    for (const item of drills.scams) {
      for (const lang of LANGS) {
        expect(item.text[lang].length).toBeGreaterThan(20);
        expect(item.why[lang].length).toBeGreaterThan(10);
        for (const flag of item.flags[lang]) expect(item.text[lang]).toContain(flag);
        if (item.fake) expect(item.flags[lang].length).toBeGreaterThan(0);
      }
    }
    expect(drills.form.fields.filter((field: { wrong: boolean }) => field.wrong).length).toBeGreaterThanOrEqual(4);
    expect(drills.price.phones.length).toBeGreaterThanOrEqual(3);
  });

});

describe("language screen", () => {
  it("takes its words from the land section of each locale, and lists every language", () => {
    const gate = readJson("public/locales/gate.json");
    for (const lang of LANGS) {
      const land = readJson(`locales/${lang}.json`).land;
      for (const key of ["hello", "name", "title", "cta", "line", "change"]) expect(land[key]?.length).toBeGreaterThan(0);
      expect(gate[lang]).toEqual(land);
    }
  });
});
