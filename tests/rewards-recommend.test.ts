import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAGE_IDS } from "@/lib/catalog";
import type { Lesson } from "@/lib/content-types";
import { nextAction, pickByDay } from "@/lib/daily";
import { journeyState, type JourneyFile } from "@/lib/journey";
import { completeEpisode, completeLesson, emptyProgress, noteMistake, setFocus, setLook } from "@/lib/progress";
import { recommend, topLesson, weakTopics } from "@/lib/recommend";
import { met, newlyUnlocked, REWARDS, safeLook, unlocked } from "@/lib/rewards";

const file = JSON.parse(readFileSync(`${process.cwd()}/content/journey.json`, "utf8")) as JourneyFile;
const lessons = JSON.parse(readFileSync(`${process.cwd()}/content/guide.json`, "utf8")) as Lesson[];
const TODAY = "2026-10-05";

describe("rewards", () => {
  it("gives everyone the starting outfit, extra and place, and no badge", () => {
    const open = unlocked({ progress: emptyProgress(), streak: 0 });
    expect(open.has("outfit:kurta")).toBe(true);
    expect(open.has("extra:none")).toBe(true);
    expect(open.has("place:room")).toBe(true);
    expect([...open].some((key) => key.startsWith("badge:"))).toBe(false);
  });

  it("opens the first-step badge after the first episode, and only once", () => {
    const before = { progress: emptyProgress(), streak: 0 };
    const after = { progress: completeEpisode(emptyProgress(), STAGE_IDS[0], 0, 0, TODAY), streak: 1 };
    const opened = newlyUnlocked(before, after);
    expect(opened.map((reward) => `${reward.kind}:${reward.id}`)).toContain("badge:first-step");
    expect(newlyUnlocked(after, after)).toEqual([]);
  });

  it("keeps a streak reward once the days prove it, even after the streak breaks", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"];
    const progress = { ...emptyProgress(), days };
    expect(met({ type: "streak", value: 7 }, { progress, streak: 0 })).toBe(true);
    expect(met({ type: "streak", value: 30 }, { progress, streak: 0 })).toBe(false);
  });

  it("falls back to the starting look when a saved item is not earned", () => {
    const progress = setLook(emptyProgress(), { outfit: "shawl", place: "garden", extra: "bag" });
    expect(safeLook({ progress, streak: 0 })).toEqual({ outfit: "kurta", extra: "none", place: "room" });
  });

  it("names only episodes that exist", () => {
    for (const reward of REWARDS) {
      if (reward.need.type === "episode") expect(STAGE_IDS).toContain(reward.need.id);
    }
  });
});

describe("recommendations", () => {
  it("puts today's open episode first", () => {
    const recs = recommend({ progress: emptyProgress(), lessons, journey: journeyState(file, emptyProgress(), TODAY), today: TODAY });
    expect(recs[0]).toMatchObject({ kind: "episode", id: STAGE_IDS[0] });
  });

  it("puts a guide in a chosen hard topic ahead of the plain reading order", () => {
    const progress = setFocus(emptyProgress(), ["retirement"]);
    const best = topLesson(recommend({ progress, lessons, journey: null, today: TODAY }));
    expect(best?.reason).toBe("focus");
    expect(lessons.find((lesson) => lesson.id === best?.id)?.topic).toBe("retirement");
  });

  it("suggests revising a read guide in a topic with wrong answers", () => {
    let progress = completeLesson(emptyProgress(), "what-emi", [], "2026-09-01");
    progress = noteMistake(noteMistake(progress, "borrowing"), "borrowing");
    const recs = recommend({ progress, lessons, journey: null, today: TODAY });
    const revise = recs.find((rec) => rec.kind === "revise" && rec.id === "what-emi");
    expect(revise).toMatchObject({ reason: "mistake" });
    expect(weakTopics(progress)).toEqual(["borrowing"]);
  });

  it("suggests revising after two weeks without one", () => {
    const progress = completeLesson(emptyProgress(), "budget", [], "2026-09-01");
    const recs = recommend({ progress, lessons, journey: null, today: TODAY });
    expect(recs.find((rec) => rec.kind === "revise" && rec.id === "budget")).toMatchObject({ reason: "stale" });
    const fresh = recommend({ progress, lessons, journey: null, today: "2026-09-03" });
    expect(fresh.find((rec) => rec.kind === "revise" && rec.id === "budget")).toBeUndefined();
  });
});

describe("today's Saath", () => {
  it("picks the same item all day and moves on the next day", () => {
    const list = ["a", "b", "c"];
    expect(pickByDay(list, TODAY)).toBe(pickByDay(list, TODAY));
    expect(pickByDay(list, TODAY)).not.toBe(pickByDay(list, "2026-10-06"));
    expect(pickByDay([], TODAY)).toBeNull();
  });

  it("puts the open episode first, then the question, then the real story, then a guide", () => {
    const base = { episode: { id: "e", open: true }, answeredToday: false, lesson: { id: "l", revise: false }, story: { id: "s", read: false } };
    expect(nextAction(base)).toEqual({ kind: "episode", id: "e" });
    expect(nextAction({ ...base, episode: { id: "e", open: false } })).toEqual({ kind: "question" });
    expect(nextAction({ ...base, episode: null, answeredToday: true })).toEqual({ kind: "story", id: "s" });
    expect(nextAction({ ...base, episode: null, answeredToday: true, story: { id: "s", read: true } })).toEqual({ kind: "lesson", id: "l", revise: false });
    expect(nextAction({ episode: null, answeredToday: true, lesson: null, story: null })).toEqual({ kind: "done" });
  });
});
