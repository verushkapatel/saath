import type { Look, Progress } from "./progress";

/**
 * Verena grows up with the person using Saath. Every finished guide or story chapter is one step, and every step
 * changes something visible: her age, an outfit, a colour, an extra. She starts as a ten-year-old in a school uniform
 * and, once everything is finished, is a retired woman in a trouser suit with grey hair and reading glasses.
 *
 * Nothing here is random, so the same progress always draws the same Verena, on every device and in every picture.
 */
export type Era = "child" | "teen" | "student" | "young" | "adult" | "middle" | "senior";

export type VerenaLook = Look & { tint: string; age: number; era: Era; step: number };

/** Muted colours only: navy, slate, sage, plum, rust, charcoal, sand, teal-grey. */
export const TINTS = ["#22468F", "#3E5C76", "#4F6B5A", "#5B4B6B", "#7A4E3A", "#2F3B4C", "#8A7458", "#3B5E66"] as const;

const ERA_OUTFITS: Record<Era, string[]> = {
  child: ["uniform", "frock", "uniform", "frock"],
  teen: ["tee", "uniform", "hoodie", "tee"],
  student: ["hoodie", "tee", "jacket", "kurta", "shirt"],
  young: ["kurta", "shirt", "blazer", "jacket", "cardigan"],
  adult: ["blazer", "kurta", "sari", "cardigan", "shirt", "coat"],
  middle: ["sari", "blazer", "coat", "cardigan", "suit", "kurta"],
  senior: ["shawl", "cardigan", "sari", "coat", "suit"],
};

const ERA_EXTRAS: Record<Era, string[]> = {
  child: ["backpack", "none", "backpack"],
  teen: ["backpack", "headphones", "none", "earrings"],
  student: ["backpack", "headphones", "bag", "earrings"],
  young: ["bag", "watch", "earrings", "scarf"],
  adult: ["watch", "bag", "earrings", "scarf", "glasses"],
  middle: ["glasses", "watch", "earrings", "scarf"],
  senior: ["glasses", "scarf", "earrings", "glasses"],
};

const ERA_PLACES: Record<Era, string[]> = {
  child: ["room", "home"],
  teen: ["room", "cafe"],
  student: ["cafe", "room", "rooftop"],
  young: ["office", "bank", "cafe"],
  adult: ["office", "home", "bank"],
  middle: ["home", "office", "rooftop"],
  senior: ["garden", "home"],
};

export function eraFor(age: number): Era {
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 22) return "student";
  if (age < 30) return "young";
  if (age < 45) return "adult";
  if (age < 58) return "middle";
  return "senior";
}

const FIRST_AGE = 10;
const LAST_AGE = 65;

/** How many steps a person has taken: guides read plus chapters lived. */
export function stepsDone(progress: Pick<Progress, "lessons" | "journey">): number {
  return progress.lessons.length + Object.keys(progress.journey).length;
}

/** Verena after `step` of `total` steps. */
export function verenaAt(step: number, total: number): VerenaLook {
  const all = Math.max(1, total);
  const at = Math.max(0, Math.min(step, all));
  if (at >= all) {
    return { outfit: "suit", extra: "glasses", place: "garden", tint: TINTS[0], age: LAST_AGE, era: "senior", step: at };
  }
  const age = Math.round(FIRST_AGE + ((LAST_AGE - 1 - FIRST_AGE) * at) / all);
  const era = eraFor(age);
  const outfits = ERA_OUTFITS[era];
  const extras = ERA_EXTRAS[era];
  const places = ERA_PLACES[era];
  return {
    outfit: outfits[at % outfits.length],
    // A different stride from the outfit, so the same pairs do not come round together.
    extra: extras[(at * 3 + 1) % extras.length],
    place: places[Math.floor(at / 2) % places.length],
    tint: TINTS[(at * 5) % TINTS.length],
    age,
    era,
    step: at,
  };
}

export function verenaFor(progress: Pick<Progress, "lessons" | "journey">, total: number): VerenaLook {
  return verenaAt(stepsDone(progress), total);
}

/** What changed between two Verenas, as keys for the screen to translate. */
export function changes(before: VerenaLook, after: VerenaLook): { key: string; values: Record<string, string | number> }[] {
  const list: { key: string; values: Record<string, string | number> }[] = [];
  if (after.era !== before.era) list.push({ key: `verena.era.${after.era}`, values: { age: after.age } });
  if (after.age !== before.age) list.push({ key: "verena.age", values: { age: after.age } });
  if (after.outfit !== before.outfit || after.tint !== before.tint) list.push({ key: "verena.outfit", values: { outfit: after.outfit } });
  if (after.extra !== before.extra && after.extra !== "none") list.push({ key: "verena.extra", values: { extra: after.extra } });
  if (after.place !== before.place) list.push({ key: "verena.place", values: { place: after.place } });
  return list;
}
