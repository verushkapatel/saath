import { addDays } from "./dates";

export type DayState = "done" | "frozen" | "missed" | "today" | "future";

export type StreakView = {
  /** Days in the current run. Frozen days hold the run together but are not counted. */
  count: number;
  /** Dates the automatic freeze covered. */
  frozen: string[];
  /** True when a freeze is still unused for the week that holds today. */
  freezeLeft: boolean;
  /** Monday to Sunday of the week that holds today. */
  week: { date: string; state: DayState }[];
};

/** Monday of the week that holds this date. One freeze is allowed per such week. */
export function weekStart(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay() || 7;
  return addDays(iso, 1 - weekday);
}

/**
 * A day counts when at least one task was finished on it.
 * One missed day in each Monday-to-Sunday week is forgiven automatically,
 * as long as there is an active day before it to hold on to.
 */
export function computeStreak(days: Iterable<string>, today: string): StreakView {
  const active = new Set(days);
  const frozen: string[] = [];
  const usedWeeks = new Set<string>();
  let count = 0;
  let cursor = today;

  if (active.has(today)) {
    count = 1;
  }
  cursor = addDays(today, -1);

  for (let guard = 0; guard < 3660; guard += 1) {
    if (active.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    const week = weekStart(cursor);
    const before = addDays(cursor, -1);
    if (!usedWeeks.has(week) && active.has(before)) {
      usedWeeks.add(week);
      frozen.push(cursor);
      cursor = before;
      continue;
    }
    break;
  }

  // A freeze with nothing after it yet (today not done) only matters while the run is alive.
  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    let state: DayState;
    if (date > today) state = "future";
    else if (active.has(date)) state = "done";
    else if (date === today) state = "today";
    else if (frozen.includes(date)) state = "frozen";
    else state = "missed";
    return { date, state };
  });

  return { count, frozen, freezeLeft: !usedWeeks.has(monday), week };
}
