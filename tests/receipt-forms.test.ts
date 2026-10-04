import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORM_IDS, LANGS, TOPICS } from "@/lib/catalog";
import type { FormsFile, Lesson, StoriesFile } from "@/lib/content-types";
import { explainFormText, type FieldRule } from "@/lib/form-explain";
import { recurringSpends, weekendShare } from "@/lib/patterns";
import { parseReceipt } from "@/lib/receipt";

const read = <T,>(path: string) => JSON.parse(readFileSync(`${process.cwd()}/${path}`, "utf8")) as T;
const rules = read<FieldRule[]>("content/form-fields.json");
const forms = read<FormsFile>("content/forms.json");
const stories = read<StoriesFile>("content/stories.json");
const lessons = read<Lesson[]>("content/guide.json");

describe("receipts", () => {
  it("finds the total, the date, the shop and a likely category", () => {
    const guess = parseReceipt(["SHREE KRISHNA SWEETS", "Date: 03/10/2026", "Kaju katli 250g   180.00", "Samosa x2   40.00", "Sub Total 220.00", "GST 11.00", "Grand Total 231.00", "Thank you"].join("\n"));
    expect(guess).toMatchObject({ total: 231, date: "2026-10-03", merchant: "SHREE KRISHNA SWEETS", category: "food", confidence: "good" });
  });

  it("says it is unsure when no line says total", () => {
    const guess = parseReceipt(["City Metro", "Card top up 200", "Balance 35"].join("\n"));
    expect(guess.confidence).toBe("low");
    expect(guess.total).toBe(200);
    expect(guess.category).toBe("travel");
  });

  it("says it read nothing when the photo is noise", () => {
    expect(parseReceipt("~~ ., ;")).toMatchObject({ total: null, confidence: "none" });
    expect(parseReceipt("")).toMatchObject({ total: null, confidence: "none" });
  });

  it("never takes a date as the amount", () => {
    // The total line was lost in the photo, so the guess is low, but it must not be 2026 from the date.
    const guess = parseReceipt(["राम किराणा स्टोर", "दिनांक 01/10/2026", "चावल 5kg 320", "दाल 1kg 140", "Time 18:45"].join("\n"));
    expect(guess.total).toBe(320);
    expect(guess.date).toBe("2026-10-01");
    expect(guess.confidence).toBe("low");
    expect(parseReceipt("राम किराणा स्टोर\nदिनांक 01/10/2026\nकुल 625").total).toBe(625);
  });

  it("ignores phone numbers and bill numbers as amounts", () => {
    const guess = parseReceipt(["Kirana Store", "Ph 9876543210", "Bill No 123456", "Total 95"].join("\n"));
    expect(guess.total).toBe(95);
  });
});

describe("explaining a form from a photo", () => {
  const sample = [
    "PERSONAL LOAN APPLICATION FORM",
    "Name of applicant: ______________________",
    "Date of birth: ____ Permanent address: ________________",
    "PAN: __________  Mobile number: __________",
    "Loan amount requested: Rs ________  Tenure: ____ months",
    "Annual percentage rate (APR): ____ %  Processing fee: ____",
    "Nominee name and relationship: _______________",
    "I hereby declare that the information above is true. Signature of applicant ________",
  ].join("\n");

  it("recognises printed fields and keeps them in order", () => {
    const reading = explainFormText(sample, rules);
    expect(reading.readable).toBe(true);
    const ids = reading.found.map((item) => item.rule.id);
    expect(ids).toEqual(expect.arrayContaining(["name", "dob", "pan", "apr", "tenure", "signature"]));
    expect(ids.indexOf("name")).toBeLessThan(ids.indexOf("signature"));
  });

  it("reads a Hindi form: vowel signs count as letters", () => {
    // Text as Tesseract read a printed Hindi savings-account form during testing.
    const text = "बचत खाता खोलने का फ़ॉर्म\nआवेदक का नाम\nजन्म तिथि\nOT\nRo\nमोबाइल नंबर\nवार्षिक आय\nमैं घोषणा करता/करती हूँ कि ऊपर दी गई जानकारी सही है।";
    const reading = explainFormText(text, rules);
    expect(reading.readable).toBe(true);
    expect(reading.found.map((item) => item.rule.id)).toEqual(expect.arrayContaining(["name", "dob", "mobile", "income", "declaration"]));
  });

  it("says the photo is unreadable rather than guessing", () => {
    const reading = explainFormText("lo an ~~ fo rm .. ;; ", rules);
    expect(reading.readable).toBe(false);
    expect(reading.found).toEqual([]);
  });

  it("matches whole words only, so PAN is not found inside company", () => {
    const text = "The company accompanies its panel of trustees and the expansion of its network of branches across many cities in the state of Maharashtra and beyond.";
    const reading = explainFormText(text, rules);
    expect(reading.found.map((item) => item.rule.id)).not.toContain("pan");
  });

  it("has every field rule in three languages", () => {
    expect(rules.length).toBeGreaterThanOrEqual(20);
    for (const rule of rules) {
      expect(rule.patterns.length).toBeGreaterThan(0);
      for (const lang of LANGS) {
        expect(rule.label[lang].length).toBeGreaterThan(1);
        expect(rule.meaning[lang].length).toBeGreaterThan(5);
        expect(rule.tip[lang].length).toBeGreaterThan(5);
      }
    }
  });
});

describe("forms library", () => {
  it("has every form in the library, each with an official https source and a check date", () => {
    expect(forms.forms.map((form) => form.id)).toEqual([...FORM_IDS]);
    const guideIds = new Set(lessons.map((lesson) => lesson.id));
    for (const form of forms.forms) {
      expect(TOPICS).toContain(form.topic);
      expect(form.source.length).toBeGreaterThan(0);
      for (const source of form.source) expect(source.url).toMatch(/^https:\/\//);
      expect(form.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const id of form.guides) expect(guideIds.has(id)).toBe(true);
      for (const lang of LANGS) {
        expect(form.name[lang].length).toBeGreaterThan(3);
        expect(form.purpose[lang].length).toBeGreaterThan(10);
        expect(form.mistakes.length).toBeGreaterThan(0);
        expect(form.verify.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("real stories", () => {
  it("has a published source, a kind and a check date for every story", () => {
    expect(stories.stories.length).toBeGreaterThanOrEqual(8);
    const guideIds = new Set(lessons.map((lesson) => lesson.id));
    for (const story of stories.stories) {
      expect(["official", "reported"]).toContain(story.kind);
      expect(TOPICS).toContain(story.topic);
      expect(story.source.url).toMatch(/^https:\/\//);
      expect(story.source.name.length).toBeGreaterThan(2);
      expect(story.source.published).toMatch(/^\d{4}-\d{2}/);
      expect(story.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const id of story.guides) expect(guideIds.has(id)).toBe(true);
      for (const lang of LANGS) {
        expect(story.what[lang].length).toBeGreaterThan(40);
        expect(story.lesson[lang].length).toBeGreaterThan(20);
        expect(story.act[lang].length).toBeGreaterThan(20);
      }
    }
  });
});

describe("Money Lab patterns", () => {
  const entry = (date: string, amount: number, category = "phone", note?: string) => ({ kind: "out" as const, category, amount, date, note });

  it("finds a spend that comes back each month at about the same amount", () => {
    const found = recurringSpends([
      entry("2026-08-03", 299, "phone", "Recharge"),
      entry("2026-09-02", 299, "phone", "recharge"),
      entry("2026-10-01", 305, "phone", "Recharge"),
      entry("2026-10-02", 40, "food"),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ amount: 299, months: 3, last: "2026-10-01" });
  });

  it("does not call two spends in the same month recurring, or very different amounts", () => {
    expect(recurringSpends([entry("2026-10-01", 100), entry("2026-10-20", 100)])).toEqual([]);
    expect(recurringSpends([entry("2026-09-01", 100), entry("2026-10-01", 900)])).toEqual([]);
  });

  it("works out the weekend share once there are enough spends", () => {
    expect(weekendShare([entry("2026-10-03", 100)])).toBeNull();
    // 3 and 4 October 2026 are a Saturday and a Sunday.
    const share = weekendShare([entry("2026-10-03", 100), entry("2026-10-04", 100), entry("2026-10-05", 100), entry("2026-10-06", 100), entry("2026-10-07", 100)]);
    expect(share).toBe(40);
  });
});
