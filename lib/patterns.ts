type EntryLike = { kind: "in" | "out" | "save"; category: string; amount: number; date: string; note?: string };

export type Recurring = {
  /** The shop or note when there is one, otherwise the category. */
  label: string;
  category: string;
  /** The typical amount, rounded to the rupee. */
  amount: number;
  /** Distinct months it was seen in. */
  months: number;
  /** The last date it was paid. */
  last: string;
};

const keyOf = (entry: EntryLike) => (entry.note?.trim().toLowerCase() || `#${entry.category}`);

/**
 * Spending that comes back month after month at about the same amount: a subscription, a recharge, a fee.
 * Two payments in two different months, within 10% of each other, under the same note (or the same category when
 * there is no note), count as recurring. Worked out on the phone from the person's own entries.
 */
export function recurringSpends(entries: EntryLike[]): Recurring[] {
  const groups = new Map<string, EntryLike[]>();
  for (const entry of entries) {
    if (entry.kind !== "out" || entry.amount <= 0) continue;
    const key = keyOf(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const out: Recurring[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    // Cluster by amount: each payment joins the first cluster whose typical amount is within 10%.
    const clusters: EntryLike[][] = [];
    for (const entry of sorted) {
      const home = clusters.find((cluster) => {
        const typical = median(cluster.map((item) => item.amount));
        return Math.abs(entry.amount - typical) <= typical * 0.1;
      });
      if (home) home.push(entry);
      else clusters.push([entry]);
    }
    for (const cluster of clusters) {
      const months = new Set(cluster.map((item) => item.date.slice(0, 7)));
      if (months.size < 2) continue;
      const last = cluster[cluster.length - 1];
      out.push({
        label: last.note?.trim() || last.category,
        category: last.category,
        amount: Math.round(median(cluster.map((item) => item.amount))),
        months: months.size,
        last: last.date,
      });
    }
  }
  return out.sort((a, b) => b.amount * b.months - a.amount * a.months);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The share of spending that falls on Saturday and Sunday, once at least five spends are logged. */
export function weekendShare(entries: EntryLike[]): number | null {
  const spends = entries.filter((entry) => entry.kind === "out");
  if (spends.length < 5) return null;
  const total = spends.reduce((sum, entry) => sum + entry.amount, 0);
  if (total <= 0) return null;
  const weekend = spends
    .filter((entry) => {
      const [year, month, day] = entry.date.split("-").map(Number);
      const weekday = new Date(year, month - 1, day).getDay();
      return weekday === 0 || weekday === 6;
    })
    .reduce((sum, entry) => sum + entry.amount, 0);
  return Math.round((weekend / total) * 100);
}
