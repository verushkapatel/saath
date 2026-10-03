import { addDays } from "./dates";

type EntryLike = { kind: "in" | "out" | "save"; category: string; amount: number; date: string };

export type Insight =
  | { key: "insight.topCategory"; category: string; share: number }
  | { key: "insight.dailyAverage"; amount: number }
  | { key: "insight.savedShare"; share: number };

/** Distinct days on which the user logged anything. */
export function loggedDays(entries: EntryLike[]): number {
  return new Set(entries.map((entry) => entry.date)).size;
}

/** One sentence drawn from the user's own entries. Returns null until three days are logged. */
export function insightFor(entries: EntryLike[]): Insight | null {
  if (loggedDays(entries) < 3) return null;
  const spend = entries.filter((entry) => entry.kind === "out");
  const totalOut = spend.reduce((sum, entry) => sum + entry.amount, 0);
  const totalIn = entries.filter((entry) => entry.kind === "in").reduce((sum, entry) => sum + entry.amount, 0);
  const totalSave = entries.filter((entry) => entry.kind === "save").reduce((sum, entry) => sum + entry.amount, 0);

  if (totalOut > 0) {
    const byCategory = new Map<string, number>();
    for (const entry of spend) byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
    const [category, amount] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = Math.round((amount / totalOut) * 100);
    if (byCategory.size > 1 && share >= 40) return { key: "insight.topCategory", category, share };
  }
  if (totalIn > 0 && totalSave > 0) {
    return { key: "insight.savedShare", share: Math.round((totalSave / totalIn) * 100) };
  }
  if (totalOut > 0) {
    const days = new Set(spend.map((entry) => entry.date)).size;
    return { key: "insight.dailyAverage", amount: Math.round(totalOut / days) };
  }
  return null;
}

export type WeekSummary = { in: number; out: number; save: number; days: number };

/** Totals for the seven days ending today. */
export function weekSummary(entries: EntryLike[], today: string): WeekSummary {
  const floor = addDays(today, -6);
  const recent = entries.filter((entry) => entry.date >= floor && entry.date <= today);
  const sum = (kind: EntryLike["kind"]) =>
    recent.filter((entry) => entry.kind === kind).reduce((total, entry) => total + entry.amount, 0);
  return { in: sum("in"), out: sum("out"), save: sum("save"), days: new Set(recent.map((entry) => entry.date)).size };
}
