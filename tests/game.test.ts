import { describe, expect, it } from "vitest";
import { missionDone, starTotals, starsFor, worlds } from "@/lib/game";

const ep = (verdicts: ("good" | "okay" | "costly")[], drill = 2) => ({
  id: "x",
  options: verdicts.map((verdict) => ({ verdict })) as never,
  drill: Array.from({ length: drill }) as never,
});

describe("game layer", () => {
  it("gives one star for finishing, one for a good choice, one for a perfect quiz", () => {
    const episode = ep(["costly", "good", "okay"]);
    expect(starsFor(episode, undefined)).toBe(0);
    expect(starsFor(episode, { choice: 0, drill: 0, at: "" })).toBe(1);
    expect(starsFor(episode, { choice: 1, drill: 1, at: "" })).toBe(2);
    expect(starsFor(episode, { choice: 1, drill: 2, at: "" })).toBe(3);
    expect(starsFor(episode, { choice: 2, drill: 2, at: "" })).toBe(2);
  });

  it("adds stars across the story", () => {
    const a = { ...ep(["good"]), id: "a" };
    const b = { ...ep(["costly"]), id: "b" };
    expect(starTotals([a, b], { a: { choice: 0, drill: 2, at: "" } })).toEqual({ earned: 3, max: 6 });
  });

  it("groups chapters into worlds by age, in order", () => {
    const out = worlds([{ age: 21 }, { age: 24 }, { age: 25 }, { age: 62 }]);
    expect(out.map((w) => [w.band, w.from, w.to, w.episodes.length])).toEqual([[0, 21, 24, 2], [1, 25, 25, 1], [6, 62, 62, 1]]);
    expect(out[2].episodes[0].index).toBe(3);
  });

  it("ticks the mission off as the chapter moves along", () => {
    const order = ["story", "sim", "live", "decide", "outcome", "why", "drill", "done"];
    expect(missionDone("story", order)).toEqual({ story: false, live: false, decide: false, drill: false });
    expect(missionDone("decide", order)).toEqual({ story: true, live: true, decide: false, drill: false });
    expect(missionDone("done", order).drill).toBe(true);
  });
});

import { completeEpisode as complete, emptyProgress as empty, scoreDrill } from "@/lib/progress";

describe("a chapter counts once", () => {
  it("records at the outcome, then the questions only add their bonus once", () => {
    const lived = complete(empty(), "ch", 0, 0, "2026-10-09");
    const xp = lived.xp;
    expect(complete(lived, "ch", 0, 0, "2026-10-09")).toBe(lived);
    const scored = scoreDrill(lived, "ch", 4);
    expect(scored.xp).toBeGreaterThan(xp);
    expect(scoreDrill(scored, "ch", 4)).toBe(scored);
    expect(scoreDrill(scored, "ch", 2)).toBe(scored);
  });
});
