import type { Look, Progress } from "./progress";

/**
 * Verena Postcards: one picture of Verena for each stage of her life.
 * A postcard unlocks once the first chapter of its stage is finished. Chapter numbers are 1-based.
 * Each card holds only story facts (her age, the chapters, one lesson) plus the user's level and streak. Never money.
 */
export type PostcardDef = { id: string; from: number; to: number; look: Look };

export const POSTCARDS: PostcardDef[] = [
  { id: "first-steps", from: 1, to: 11, look: { outfit: "blazer", extra: "bag", place: "office" } },
  { id: "finding-balance", from: 12, to: 22, look: { outfit: "hoodie", extra: "headphones", place: "cafe" } },
  { id: "tested", from: 23, to: 31, look: { outfit: "jacket", extra: "watch", place: "home" } },
  { id: "family", from: 32, to: 42, look: { outfit: "sari", extra: "earrings", place: "home" } },
  { id: "long-view", from: 43, to: 53, look: { outfit: "suit", extra: "glasses", place: "office" } },
  { id: "retirement", from: 54, to: 55, look: { outfit: "shawl", extra: "glasses", place: "garden" } },
];

export type Postcard = PostcardDef & { index: number; ageFrom: number; ageTo: number; unlocked: boolean };

/** Works out every postcard's ages and whether it is open, from the chapter order and the saved journey. */
export function postcards(episodes: { id: string; age: number }[], journey: Progress["journey"]): Postcard[] {
  return POSTCARDS.map((card, index) => {
    const range = episodes.slice(card.from - 1, card.to);
    const ages = range.map((episode) => episode.age);
    return {
      ...card,
      index,
      ageFrom: ages.length ? Math.min(...ages) : 0,
      ageTo: ages.length ? Math.max(...ages) : 0,
      unlocked: Boolean(range[0] && range[0].id in journey),
    };
  });
}
