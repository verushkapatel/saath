import { UNITS, type Unit } from "./catalog";
import { IMPACT_URL } from "./config";

/**
 * Anonymous cohort numbers.
 *
 * An event carries a school code, a grade, what happened, and at most four unit scores.
 * It carries no name, no nickname, no phone or device identifier, and no timestamp finer than the server adds.
 * Events leave the phone only when all three are true: the student joined a school, the student switched
 * sharing on, and an endpoint is configured. Otherwise nothing is ever sent.
 */
export type ImpactEvent = {
  cohort: string;
  grade: string;
  kind: "join" | "check-before" | "check-after" | "lesson" | "path";
  /** For lesson and path events: how many. Defaults to 1. */
  count?: number;
  /** For check events: the share right in each unit, 0 to 1, in unit order. */
  units?: number[];
};

export type CohortRow = {
  cohort: string;
  grade: string;
  students: number;
  lessons: number;
  paths: number;
  /** Average share right per unit before, 0 to 1. Null when no check was shared. */
  before: Record<Unit, number> | null;
  after: Record<Unit, number> | null;
  /** After minus before, in percentage points. Null unless both exist. */
  change: Record<Unit, number> | null;
  beforeCount: number;
  afterCount: number;
};

export const MIN_COHORT = 10;

function average(rows: number[][]): Record<Unit, number> | null {
  const valid = rows.filter((row) => Array.isArray(row) && row.length === UNITS.length && row.every((n) => Number.isFinite(n)));
  if (!valid.length) return null;
  return Object.fromEntries(
    UNITS.map((unit, index) => [unit, valid.reduce((sum, row) => sum + Math.min(1, Math.max(0, row[index])), 0) / valid.length]),
  ) as Record<Unit, number>;
}

/**
 * Turns raw events into one row per school and grade.
 * Any group with fewer than ten students is left out entirely, so nobody can be picked out of a small class.
 */
export function aggregate(events: ImpactEvent[], min = MIN_COHORT): { rows: CohortRow[]; hidden: number } {
  const groups = new Map<string, ImpactEvent[]>();
  for (const event of events) {
    if (!event || typeof event.cohort !== "string" || !event.cohort.trim()) continue;
    const key = `${event.cohort.trim().toUpperCase()}|${String(event.grade ?? "").trim()}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const rows: CohortRow[] = [];
  let hidden = 0;
  for (const [key, list] of groups) {
    const [cohort, grade] = key.split("|");
    const students = list.filter((event) => event.kind === "join").length;
    if (students < min) {
      hidden += 1;
      continue;
    }
    const sum = (kind: ImpactEvent["kind"]) =>
      list.filter((event) => event.kind === kind).reduce((total, event) => total + Math.max(1, Math.floor(event.count ?? 1)), 0);
    const befores = list.filter((event) => event.kind === "check-before").map((event) => event.units ?? []);
    const afters = list.filter((event) => event.kind === "check-after").map((event) => event.units ?? []);
    const before = average(befores);
    const after = average(afters);
    rows.push({
      cohort,
      grade,
      students,
      lessons: sum("lesson"),
      paths: sum("path"),
      before,
      after,
      change: before && after
        ? (Object.fromEntries(UNITS.map((unit) => [unit, Math.round((after[unit] - before[unit]) * 100)])) as Record<Unit, number>)
        : null,
      beforeCount: befores.length,
      afterCount: afters.length,
    });
  }
  rows.sort((a, b) => a.cohort.localeCompare(b.cohort) || Number(a.grade) - Number(b.grade));
  return { rows, hidden };
}

export type Sharer = { schoolCode: string | null; grade: string | null; shareAggregates: boolean };

/** True only when the student joined a school, said yes to sharing, and an endpoint exists. */
export function canShare(profile: Sharer, url = IMPACT_URL): boolean {
  return Boolean(url && profile.shareAggregates && profile.schoolCode && profile.grade);
}

/** Builds exactly what would be sent. Kept separate so a test can prove nothing personal is in it. */
export function buildEvent(profile: Sharer, kind: ImpactEvent["kind"], extra: { count?: number; units?: number[] } = {}): ImpactEvent | null {
  if (!profile.schoolCode || !profile.grade) return null;
  const event: ImpactEvent = { cohort: profile.schoolCode, grade: profile.grade, kind };
  if (extra.count && extra.count > 1) event.count = extra.count;
  if (extra.units) event.units = extra.units.map((n) => Math.round(n * 100) / 100);
  return event;
}

/** Sends one event and forgets it. A failure is silent: the app never queues or retries personal activity. */
export function share(profile: Sharer, kind: ImpactEvent["kind"], extra: { count?: number; units?: number[] } = {}): void {
  if (!canShare(profile) || typeof fetch === "undefined") return;
  const event = buildEvent(profile, kind, extra);
  if (!event) return;
  try {
    void fetch(IMPACT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // Offline or blocked. Nothing is stored for later.
  }
}
