import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGS, PATH_IDS, UNITS, UNIT_PATH } from "@/lib/catalog";
import { change, checkDue, recommendedPath, scoreFinLit, unitRatio, unitRatios, weakestUnit, type FinLitQuestion } from "@/lib/finlit";

const { questions } = JSON.parse(readFileSync(`${process.cwd()}/content/finlit-check.json`, "utf8")) as { questions: FinLitQuestion[] };
const right = questions.map((question) => question.answer);
const wrong = questions.map((question) => (question.answer + 1) % question.options.length);

describe("FinLit Check content", () => {
  it("has twelve situations, three per unit, in three languages", () => {
    expect(questions).toHaveLength(12);
    for (const unit of UNITS) expect(questions.filter((question) => question.unit === unit)).toHaveLength(3);
    for (const question of questions) {
      expect(question.options).toHaveLength(3);
      for (const lang of LANGS) {
        expect(question.prompt[lang].length).toBeGreaterThan(30);
        expect(question.why[lang].length).toBeGreaterThan(10);
      }
    }
  });

  it("spreads the right answer across all three positions", () => {
    expect(new Set(right).size).toBe(3);
  });
});

describe("FinLit Check scoring", () => {
  it("scores every unit out of three", () => {
    const all = scoreFinLit(questions, right, "2026-10-03");
    for (const unit of UNITS) expect(all.byUnit[unit]).toEqual({ correct: 3, total: 3 });
    const none = scoreFinLit(questions, wrong, "2026-10-03");
    expect(unitRatios(none)).toEqual([0, 0, 0, 0]);
  });

  it("counts a skipped question as not yet right", () => {
    const answers: (number | null)[] = [...right];
    answers[0] = null;
    expect(scoreFinLit(questions, answers, "2026-10-03").byUnit["own-money"]).toEqual({ correct: 2, total: 3 });
  });

  it("finds the weakest unit and recommends its path", () => {
    const answers = [...right];
    // Miss two of the three "borrowing" questions.
    const borrow = questions.map((question, index) => (question.unit === "borrow-safe" ? index : -1)).filter((index) => index >= 0);
    answers[borrow[0]] = wrong[borrow[0]];
    answers[borrow[1]] = wrong[borrow[1]];
    const result = scoreFinLit(questions, answers, "2026-10-03");
    expect(unitRatio(result, "borrow-safe")).toBeCloseTo(1 / 3);
    expect(weakestUnit(result)).toBe("borrow-safe");
    expect(recommendedPath(result)).toBe(UNIT_PATH["borrow-safe"]);
  });

  it("starts with the first unit when every unit is level", () => {
    expect(weakestUnit(scoreFinLit(questions, right, "2026-10-03"))).toBe("own-money");
  });

  it("points every unit at a path that exists", () => {
    for (const unit of UNITS) expect(PATH_IDS).toContain(UNIT_PATH[unit]);
  });

  it("asks for the check once at the start and once after the first finished path", () => {
    const before = scoreFinLit(questions, wrong, "2026-10-03");
    const after = scoreFinLit(questions, right, "2026-10-20");
    expect(checkDue({ before: null, after: null }, 0)).toBe("before");
    expect(checkDue({ before, after: null }, 0)).toBeNull();
    expect(checkDue({ before, after: null }, 1)).toBe("after");
    expect(checkDue({ before, after }, 3)).toBeNull();
  });

  it("reports the change per unit in percentage points", () => {
    const before = scoreFinLit(questions, wrong, "2026-10-03");
    const after = scoreFinLit(questions, right, "2026-10-20");
    expect(change({ before, after: null })).toBeNull();
    expect(change({ before, after })).toEqual({ "own-money": 100, "bank-paper": 100, "borrow-safe": 100, "how-money": 100 });
  });
});
