import type { Topic } from "./catalog";
import type { Lesson } from "./content-types";
import type { JourneyState } from "./journey";
import type { Progress } from "./progress";

/**
 * What to do next, worked out from what Saath already knows about a person:
 * the areas they said are hard, where they answered wrongly, how long since they revised, and where the story is.
 * It is arithmetic on their own record. Nothing leaves the device and no model is involved.
 */
export type Reason = "story" | "focus" | "mistake" | "stale" | "next" | "ahead";

export type Rec =
  | { kind: "episode"; id: string; reason: "story"; score: number }
  | { kind: "lesson"; id: string; reason: Reason; score: number }
  | { kind: "revise"; id: string; reason: Reason; score: number; days: number };

const STALE_DAYS = 14;

function daysBetween(from: string, to: string): number {
  const stamp = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((stamp(to) - stamp(from)) / 86_400_000);
}

export type RecommendInput = {
  progress: Progress;
  lessons: Lesson[];
  journey: JourneyState | null;
  today: string;
};

export function recommend({ progress, lessons, journey, today }: RecommendInput): Rec[] {
  const recs: Rec[] = [];
  const focus = new Set(progress.focus);
  const done = new Set(progress.lessons);
  const storyTopic: Topic | null = journey?.next?.topic ?? null;

  if (journey?.next && journey.open) recs.push({ kind: "episode", id: journey.next.id, reason: "story", score: 100 });

  lessons.forEach((lesson, index) => {
    const topic = lesson.topic;
    const wrong = topic ? Math.min(4, progress.mistakes[topic] ?? 0) : 0;
    if (!done.has(lesson.id)) {
      let score = 20 - index * 0.1;
      let reason: Reason = "next";
      if (topic && storyTopic === topic) {
        score += 15;
        reason = "ahead";
      }
      if (wrong > 0) {
        score += wrong * 10;
        reason = "mistake";
      }
      if (topic && focus.has(topic)) {
        score += 30;
        reason = "focus";
      }
      recs.push({ kind: "lesson", id: lesson.id, reason, score });
      return;
    }
    const last = progress.seen[lesson.id];
    const days = last ? daysBetween(last, today) : STALE_DAYS;
    if (days < STALE_DAYS && wrong === 0) return;
    let score = Math.min(25, 10 + days / 7);
    let reason: Reason = "stale";
    if (wrong > 0 && days >= 1) {
      score += wrong * 10;
      reason = "mistake";
    }
    if (topic && focus.has(topic)) score += 8;
    if (days >= 1) recs.push({ kind: "revise", id: lesson.id, reason, score, days });
  });

  return recs.sort((a, b) => b.score - a.score);
}

/** The single best lesson to read or revise right now, leaving the story episode aside. */
export function topLesson(recs: Rec[]): Extract<Rec, { kind: "lesson" | "revise" }> | null {
  return (recs.find((rec) => rec.kind !== "episode") as Extract<Rec, { kind: "lesson" | "revise" }> | undefined) ?? null;
}

/** Topics a person keeps getting wrong, worst first. */
export function weakTopics(progress: Progress, limit = 3): string[] {
  return Object.entries(progress.mistakes)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
}
