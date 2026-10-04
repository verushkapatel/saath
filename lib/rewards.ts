import { levelFor, type Progress } from "./progress";

/**
 * Things that open as a person keeps going. Nothing here can be bought, and nothing is random.
 * Outfits, extras and places change how the character looks. Badges mark what was done.
 */
export type RewardKind = "outfit" | "extra" | "place" | "badge";

export type Need =
  | { type: "start" }
  | { type: "level"; value: number }
  | { type: "episode"; id: string }
  | { type: "episodes"; value: number }
  | { type: "streak"; value: number }
  | { type: "lessons"; value: number }
  | { type: "stories"; value: number }
  | { type: "paths"; value: number };

export type Reward = { id: string; kind: RewardKind; need: Need };

export const REWARDS: Reward[] = [
  { id: "kurta", kind: "outfit", need: { type: "start" } },
  { id: "hoodie", kind: "outfit", need: { type: "start" } },
  { id: "jacket", kind: "outfit", need: { type: "level", value: 4 } },
  { id: "festive", kind: "outfit", need: { type: "streak", value: 14 } },
  { id: "suit", kind: "outfit", need: { type: "episode", id: "long-term-planning" } },
  { id: "blazer", kind: "outfit", need: { type: "episode", id: "first-job" } },
  { id: "sari", kind: "outfit", need: { type: "episode", id: "family-finances" } },
  { id: "shawl", kind: "outfit", need: { type: "episode", id: "retirement" } },

  { id: "none", kind: "extra", need: { type: "start" } },
  { id: "earrings", kind: "extra", need: { type: "start" } },
  { id: "sunglasses", kind: "extra", need: { type: "streak", value: 3 } },
  { id: "backpack", kind: "extra", need: { type: "episodes", value: 3 } },
  { id: "headphones", kind: "extra", need: { type: "level", value: 4 } },
  { id: "bag", kind: "extra", need: { type: "level", value: 2 } },
  { id: "glasses", kind: "extra", need: { type: "level", value: 3 } },
  { id: "scarf", kind: "extra", need: { type: "streak", value: 7 } },
  { id: "watch", kind: "extra", need: { type: "level", value: 5 } },

  { id: "room", kind: "place", need: { type: "start" } },
  { id: "office", kind: "place", need: { type: "episode", id: "first-job" } },
  { id: "bank", kind: "place", need: { type: "episode", id: "banking" } },
  { id: "home", kind: "place", need: { type: "episode", id: "family-finances" } },
  { id: "garden", kind: "place", need: { type: "episode", id: "retirement" } },
  { id: "cafe", kind: "place", need: { type: "stories", value: 5 } },
  { id: "rooftop", kind: "place", need: { type: "level", value: 6 } },

  { id: "first-step", kind: "badge", need: { type: "episodes", value: 1 } },
  { id: "week", kind: "badge", need: { type: "streak", value: 7 } },
  { id: "month", kind: "badge", need: { type: "streak", value: 30 } },
  { id: "reader", kind: "badge", need: { type: "lessons", value: 10 } },
  { id: "scholar", kind: "badge", need: { type: "lessons", value: 30 } },
  { id: "witness", kind: "badge", need: { type: "stories", value: 3 } },
  { id: "pathfinder", kind: "badge", need: { type: "paths", value: 1 } },
  { id: "halfway", kind: "badge", need: { type: "episodes", value: 7 } },
  { id: "secure", kind: "badge", need: { type: "episode", id: "retirement" } },
];

export type Snapshot = { progress: Progress; streak: number };

/** The best streak a person has reached is not stored, so a streak reward is kept once the days exist to prove it. */
function longestRun(days: string[]): number {
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const iso of [...new Set(days)].sort()) {
    const [year, month, day] = iso.split("-").map(Number);
    const stamp = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
    run = previous !== null && stamp === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = stamp;
  }
  return best;
}

export function met(need: Need, { progress, streak }: Snapshot): boolean {
  switch (need.type) {
    case "start": return true;
    case "level": return levelFor(progress.xp).level >= need.value;
    case "episode": return need.id in progress.journey;
    case "episodes": return Object.keys(progress.journey).length >= need.value;
    case "streak": return Math.max(streak, longestRun(progress.days)) >= need.value;
    case "lessons": return progress.lessons.length >= need.value;
    case "stories": return progress.stories.length >= need.value;
    case "paths": return Object.keys(progress.milestones).length >= need.value;
  }
}

export function unlocked(snapshot: Snapshot): Set<string> {
  return new Set(REWARDS.filter((reward) => met(reward.need, snapshot)).map((reward) => `${reward.kind}:${reward.id}`));
}

/** What opened between two moments, for the small celebration after an episode or a lesson. */
export function newlyUnlocked(before: Snapshot, after: Snapshot): Reward[] {
  const had = unlocked(before);
  return REWARDS.filter((reward) => !had.has(`${reward.kind}:${reward.id}`) && met(reward.need, after));
}

/** Falls back to what everyone starts with if a saved look names something not yet earned. */
export function safeLook(snapshot: Snapshot): Progress["look"] {
  const open = unlocked(snapshot);
  const { look } = snapshot.progress;
  return {
    outfit: open.has(`outfit:${look.outfit}`) ? look.outfit : "kurta",
    extra: open.has(`extra:${look.extra}`) ? look.extra : "none",
    place: open.has(`place:${look.place}`) ? look.place : "room",
  };
}
