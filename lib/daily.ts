/** Picks the same item for everyone on the same calendar day, and a different one the next day. */
export function pickByDay<T>(list: readonly T[], today: string): T | null {
  if (list.length === 0) return null;
  const [year, month, day] = today.split("-").map(Number);
  const n = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return list[((n % list.length) + list.length) % list.length];
}

export type NextAction =
  | { kind: "episode"; id: string }
  | { kind: "question" }
  | { kind: "lesson"; id: string; revise: boolean }
  | { kind: "story"; id: string }
  | { kind: "done" };

/**
 * The one thing Home puts first. The story comes first when today's episode is open, because it is the heart of Saath;
 * then the daily question, then today's real story, then the best lesson to read or revise.
 */
export function nextAction(input: {
  episode: { id: string; open: boolean } | null;
  answeredToday: boolean;
  lesson: { id: string; revise: boolean } | null;
  story: { id: string; read: boolean } | null;
}): NextAction {
  if (input.episode?.open) return { kind: "episode", id: input.episode.id };
  if (!input.answeredToday) return { kind: "question" };
  if (input.story && !input.story.read) return { kind: "story", id: input.story.id };
  if (input.lesson) return { kind: "lesson", ...input.lesson };
  return { kind: "done" };
}
