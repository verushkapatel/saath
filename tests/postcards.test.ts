import { describe, expect, it } from "vitest";
import chapters from "../content/journey-chapters.json";
import { POSTCARDS, postcards } from "../lib/postcards";

const episodes = (chapters as { chapters: { id: string; age: number }[] }).chapters;

describe("Verena postcards", () => {
  it("cover all 45 chapters once, in order, without gaps", () => {
    expect(POSTCARDS[0].from).toBe(1);
    expect(POSTCARDS.at(-1)?.to).toBe(episodes.length);
    POSTCARDS.slice(1).forEach((card, index) => expect(card.from).toBe(POSTCARDS[index].to + 1));
  });

  it("are all locked before the story starts", () => {
    expect(postcards(episodes, {}).every((card) => !card.unlocked)).toBe(true);
  });

  it("unlock when the first chapter of a stage is finished, and show her ages", () => {
    const journey = { [episodes[0].id]: { choice: 0 }, [episodes[8].id]: { choice: 1 } } as never;
    const cards = postcards(episodes, journey);
    expect(cards.map((card) => card.unlocked)).toEqual([true, true, false, false, false, false]);
    expect(cards[0].ageFrom).toBe(22);
    expect(cards.at(-1)!.ageFrom).toBeGreaterThanOrEqual(60);
    cards.forEach((card) => expect(card.ageTo).toBeGreaterThanOrEqual(card.ageFrom));
  });
});
