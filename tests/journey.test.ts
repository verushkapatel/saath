import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAPTER_IDS, LANGS, TOPICS } from "@/lib/catalog";
import type { Lesson } from "@/lib/content-types";
import { grownValue, journeyState, loanCost, moneyAfter, type JourneyFile } from "@/lib/journey";
import { completeJourney, type ChaptersFile } from "@/lib/journey-complete";
import { completeEpisode, emptyProgress, levelFor, noteMistake, readStory, XP } from "@/lib/progress";

const base = JSON.parse(readFileSync(`${process.cwd()}/content/journey.json`, "utf8")) as JourneyFile;
const chapters = JSON.parse(readFileSync(`${process.cwd()}/content/journey-chapters.json`, "utf8")) as ChaptersFile;
const file = completeJourney(base, chapters);
const lessons = JSON.parse(readFileSync(`${process.cwd()}/content/guide.json`, "utf8")) as Lesson[];

describe("the story file", () => {
  it("has every connected chapter in order", () => {
    expect(file.episodes).toHaveLength(55);
    expect(file.episodes.map((episode) => episode.id)).toEqual([...CHAPTER_IDS]);
    expect(file.reviewed).toMatch(/^\d{4}-\d{2}/);
  });

  it("has every text in three languages, three options, five drill questions, and real guide links", () => {
    const guideIds = new Set(lessons.map((lesson) => lesson.id));
    let age = 0;
    for (const episode of file.episodes) {
      expect(TOPICS).toContain(episode.topic);
      expect(episode.age).toBeGreaterThanOrEqual(age);
      age = episode.age;
      expect(episode.options).toHaveLength(3);
      expect(episode.drill).toHaveLength(5);
      expect(["inspect", "budget", "grow", "emi"]).toContain(episode.sim.kind);
      for (const id of episode.guides) expect(guideIds.has(id)).toBe(true);
      expect(episode.options.some((option) => option.verdict === "good")).toBe(true);
      for (const lang of LANGS) {
        expect(episode.title[lang].length).toBeGreaterThan(3);
        expect(episode.question[lang].length).toBeGreaterThan(3);
        expect(episode.lesson[lang].length).toBeGreaterThan(20);
        for (const line of episode.story) expect(line[lang].length).toBeGreaterThan(10);
        for (const option of episode.options) expect(option.outcome[lang].length).toBeGreaterThan(10);
        for (const check of episode.drill) {
          expect(check.options).toHaveLength(3);
          expect(check.answer).toBeLessThan(3);
          expect(check.why[lang].length).toBeGreaterThan(5);
        }
      }
    }
  });

  it("labels the sliders' growth and loan rates as examples, never as current rates", () => {
    for (const episode of file.episodes) {
      if (episode.sim.kind === "grow" || episode.sim.kind === "emi") {
        expect(episode.sim.hint.en.toLowerCase()).toMatch(/example|assum|not a promise/);
      }
    }
  });
});

describe("continuous chapter progression", () => {
  it("opens the first episode at once", () => {
    const state = journeyState(file, emptyProgress(), "2026-10-05");
    expect(state.next?.id).toBe(CHAPTER_IDS[0]);
    expect(state.open).toBe(true);
    expect(state.done).toBe(0);
  });

  it("opens the next chapter immediately after completion", () => {
    const played = completeEpisode(emptyProgress(), CHAPTER_IDS[0], 2, 2, "2026-10-05");
    const sameDay = journeyState(file, played, "2026-10-05");
    expect(sameDay.next?.id).toBe(CHAPTER_IDS[1]);
    expect(sameDay.open).toBe(true);
    expect(sameDay.opensOn).toBeNull();
  });

  it("is finished after the last episode", () => {
    let progress = emptyProgress();
    CHAPTER_IDS.forEach((id, index) => {
      progress = completeEpisode(progress, id, 0, 1, `2026-11-${String(index + 1).padStart(2, "0")}`);
    });
    const state = journeyState(file, progress, "2026-12-31");
    expect(state.finished).toBe(true);
    expect(state.next).toBeNull();
    expect(state.done).toBe(55);
  });
});

describe("Verena's money", () => {
  it("never shows cash or savings below zero: a shortfall becomes debt", () => {
    const fake: JourneyFile = {
      ...file,
      episodes: [
        { ...file.episodes[0], id: "a", options: [{ ...file.episodes[0].options[0], effects: { savings: -500 } }] },
        { ...file.episodes[0], id: "b", options: [{ ...file.episodes[0].options[0], effects: { debt: -9000 } }] },
      ],
    };
    const money = moneyAfter(fake, { a: { choice: 0, drill: 0, at: "2026-10-05" } });
    expect(money).toMatchObject({ cash: 0, savings: 0, debt: 500 });
    expect(moneyAfter(fake, { a: { choice: 0, drill: 0, at: "x" }, b: { choice: 0, drill: 0, at: "y" } }).debt).toBe(0);
  });

  it("works out compounding and loan cost as illustrations", () => {
    expect(grownValue(1000, 0, 1)).toEqual({ paid: 12_000, value: 12_000 });
    const grown = grownValue(3000, 10, 10);
    expect(grown.paid).toBe(360_000);
    expect(grown.value).toBeGreaterThan(grown.paid);
    const short = loanCost(300_000, 13, 24);
    const long = loanCost(300_000, 13, 60);
    expect(long.emi).toBeLessThan(short.emi);
    expect(long.interest).toBeGreaterThan(short.interest);
  });
});

describe("XP and levels", () => {
  it("starts at level 1 and needs a little more for each level", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, need: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, need: 200 });
    expect(levelFor(299).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
    expect(levelFor(1000).level).toBe(5);
    expect(levelFor(-5).level).toBe(1);
  });

  it("pays for an episode once, plus each right drill answer", () => {
    const once = completeEpisode(emptyProgress(), CHAPTER_IDS[0], 1, 2, "2026-10-05");
    expect(once.xp).toBe(XP.task + XP.episode + 2 * XP.drillRight);
    expect(once.journey[CHAPTER_IDS[0]]).toEqual({ choice: 1, drill: 2, at: "2026-10-05" });
    const again = completeEpisode(once, CHAPTER_IDS[0], 2, 0, "2026-10-06");
    expect(again).toBe(once);
  });

  it("remembers wrong answers by topic, and reading a story once", () => {
    const wrong = noteMistake(noteMistake(emptyProgress(), "borrowing"), "borrowing");
    expect(wrong.mistakes.borrowing).toBe(2);
    expect(noteMistake(wrong, null)).toBe(wrong);
    const read = readStory(emptyProgress(), "kfs-rule", "2026-10-05");
    expect(read.stories).toEqual(["kfs-rule"]);
    expect(readStory(read, "kfs-rule", "2026-10-05")).toBe(read);
    expect(read.xp).toBe(XP.task + XP.story);
  });
});
