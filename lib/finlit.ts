import { UNITS, UNIT_PATH, type Unit } from "./catalog";
import type { Copy } from "./content-types";
import { scoped } from "./scope";

/**
 * The FinLit Check: twelve real-life situations, three per unit.
 * It is taken once at the start and once after the first finished path, so a student sees a before and an after.
 * A result is four numbers. It is never a grade and never a rank.
 */
export type FinLitQuestion = {
  id: string;
  unit: Unit;
  prompt: Copy;
  options: Copy[];
  answer: number;
  why: Copy;
};

export type UnitScore = { correct: number; total: number };

export type FinLitResult = {
  at: string;
  byUnit: Record<Unit, UnitScore>;
};

export type FinLitStore = { before: FinLitResult | null; after: FinLitResult | null };

const KEY = "saath-finlit-v2";

export function emptyFinLit(): FinLitStore {
  return { before: null, after: null };
}

export function readFinLit(): FinLitStore {
  if (typeof window === "undefined") return emptyFinLit();
  try {
    const raw = JSON.parse(window.localStorage.getItem(scoped(KEY)) || "{}") as Partial<FinLitStore>;
    return { before: raw.before ?? null, after: raw.after ?? null };
  } catch {
    return emptyFinLit();
  }
}

export function writeFinLit(store: FinLitStore): void {
  try {
    window.localStorage.setItem(scoped(KEY), JSON.stringify(store));
  } catch {
    // The result still shows for this visit.
  }
}

/** Counts right answers per unit. A skipped question counts as not yet right. */
export function scoreFinLit(questions: FinLitQuestion[], answers: (number | null)[], at: string): FinLitResult {
  const byUnit = Object.fromEntries(UNITS.map((unit) => [unit, { correct: 0, total: 0 }])) as Record<Unit, UnitScore>;
  questions.forEach((question, index) => {
    byUnit[question.unit].total += 1;
    if (answers[index] === question.answer) byUnit[question.unit].correct += 1;
  });
  return { at, byUnit };
}

export function unitRatio(result: FinLitResult, unit: Unit): number {
  const row = result.byUnit[unit];
  return row.total ? row.correct / row.total : 0;
}

/** The four ratios in unit order. This is all that is ever shared, and only if the student says yes. */
export function unitRatios(result: FinLitResult): number[] {
  return UNITS.map((unit) => unitRatio(result, unit));
}

/** The unit to start with: the lowest score, and the earlier unit when two are level. */
export function weakestUnit(result: FinLitResult): Unit {
  return UNITS.reduce((weakest, unit) => (unitRatio(result, unit) < unitRatio(result, weakest) ? unit : weakest), UNITS[0]);
}

export function recommendedPath(result: FinLitResult): string {
  return UNIT_PATH[weakestUnit(result)];
}

/** Which check is due: the first one, the second once a path is finished, or none. */
export function checkDue(store: FinLitStore, pathsFinished: number): "before" | "after" | null {
  if (!store.before) return "before";
  if (!store.after && pathsFinished > 0) return "after";
  return null;
}

/** Change per unit between the two checks, in percentage points. */
export function change(store: FinLitStore): Record<Unit, number> | null {
  if (!store.before || !store.after) return null;
  return Object.fromEntries(
    UNITS.map((unit) => [unit, Math.round((unitRatio(store.after!, unit) - unitRatio(store.before!, unit)) * 100)]),
  ) as Record<Unit, number>;
}
