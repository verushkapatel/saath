import type { Episode } from "./journey";
import type { EpisodeResult } from "./progress";

/**
 * The game layer over Verena's story. Each chapter earns up to three stars: one for finishing it, one for a good
 * decision, and one for a perfect quiz. Stars add up across the story, chapter by chapter and world by world.
 */
export function starsFor(episode: Pick<Episode, "options" | "drill">, result: EpisodeResult | undefined): number {
  if (!result) return 0;
  const verdict = episode.options[result.choice]?.verdict;
  let stars = 1;
  if (verdict === "good") stars += 1;
  if (episode.drill.length > 0 && result.drill >= episode.drill.length) stars += 1;
  return Math.min(3, stars);
}

/** Stars earned so far, and the most there are to earn. */
export function starTotals(episodes: Pick<Episode, "id" | "options" | "drill">[], results: Record<string, EpisodeResult>): { earned: number; max: number } {
  let earned = 0;
  for (const episode of episodes) earned += starsFor(episode, results[episode.id]);
  return { earned, max: episodes.length * 3 };
}

/** Age bands that make up the worlds of the story, from the first job to retirement. */
export const WORLD_BANDS: [number, number][] = [[0, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 54], [55, 120]];

/** The chapters grouped into worlds by Verena's age, in story order. */
export function worlds<T extends { age: number }>(episodes: T[]): { band: number; from: number; to: number; episodes: { episode: T; index: number }[] }[] {
  const out: { band: number; from: number; to: number; episodes: { episode: T; index: number }[] }[] = [];
  episodes.forEach((episode, index) => {
    const band = Math.max(0, WORLD_BANDS.findIndex(([from, to]) => episode.age >= from && episode.age <= to));
    const last = out[out.length - 1];
    if (last && last.band === band) {
      last.episodes.push({ episode, index });
      last.to = Math.max(last.to, episode.age);
    } else out.push({ band, from: episode.age, to: episode.age, episodes: [{ episode, index }] });
  });
  return out;
}

/** The mission checklist for one chapter, ticked off as the chapter moves along. */
export const MISSION = ["story", "live", "decide", "drill"] as const;
export type MissionStep = (typeof MISSION)[number];
export function missionDone(step: string, order: readonly string[]): Record<MissionStep, boolean> {
  const at = order.indexOf(step);
  const passed = (name: string) => order.indexOf(name) >= 0 && order.indexOf(name) < at;
  return {
    story: passed("story"),
    live: passed("live") || (order.indexOf("live") < 0 && passed("sim")),
    decide: passed("decide"),
    drill: step === "done",
  };
}
