import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/catalog";
import { planDone, planFor, topicFor } from "@/lib/challenges";
import type { ChallengesFile, DailyQuestion } from "@/lib/content-types";
import { emptyProgress, finishChallenge, finishGame, normalizeProgress, XP } from "@/lib/progress";

const file = JSON.parse(readFileSync(`${process.cwd()}/content/challenges.json`, "utf8")) as ChallengesFile;
const questions = JSON.parse(readFileSync(`${process.cwd()}/content/daily-questions.json`, "utf8")) as DailyQuestion[];
const guides = (JSON.parse(readFileSync(`${process.cwd()}/content/guide.json`, "utf8")) as { id: string }[]).map((item) => item.id);

describe("challenge content", () => {
  it("has a crisis and two tasks for every topic, in all three languages", () => {
    for (const topic of TOPICS) {
      expect(file.crises.filter((item) => item.topic === topic).length).toBeGreaterThanOrEqual(1);
      expect(file.tasks.filter((item) => item.topic === topic).length).toBeGreaterThanOrEqual(2);
    }
    for (const crisis of file.crises) {
      for (const copy of [crisis.title, crisis.story, crisis.question, crisis.why, ...crisis.options]) {
        expect(copy.en && copy.hi && copy.mr).toBeTruthy();
      }
      expect(crisis.answer).toBeGreaterThanOrEqual(0);
      expect(crisis.answer).toBeLessThan(crisis.options.length);
      expect(guides).toContain(crisis.guide);
    }
    for (const task of file.tasks) expect(task.text.en && task.text.hi && task.text.mr).toBeTruthy();
  });
});

describe("today's plan", () => {
  it("turns through the chosen topics, one a day", () => {
    const seen = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"].map((day) => topicFor(["scams", "tax"], day)));
    expect([...seen].sort()).toEqual(["scams", "tax"]);
  });

  it("uses every topic when none was chosen", () => {
    expect(TOPICS).toContain(topicFor([], "2026-10-04"));
  });

  it("gives a crisis, a task and three different questions on the day's topic", () => {
    const plan = planFor(file, questions, ["scams"], "2026-10-04");
    expect(plan.topic).toBe("scams");
    expect(plan.crisis?.topic).toBe("scams");
    expect(plan.task?.topic).toBe("scams");
    expect(plan.quiz).toHaveLength(3);
    expect(new Set(plan.quiz.map((item) => item.id)).size).toBe(3);
    expect(plan.quiz.every((item) => item.topic === "scams")).toBe(true);
  });

  it("is the same all day and changes the next day", () => {
    const a = planFor(file, questions, ["scams", "saving"], "2026-10-04");
    const b = planFor(file, questions, ["scams", "saving"], "2026-10-04");
    const c = planFor(file, questions, ["scams", "saving"], "2026-10-05");
    expect(a).toEqual(b);
    expect(c.topic).not.toBe(a.topic);
  });

  it("still makes a quiz for topics without their own questions", () => {
    const plan = planFor(file, questions, ["tax"], "2026-10-04");
    expect(plan.quiz).toHaveLength(3);
  });
});

describe("finishing challenges", () => {
  it("counts each part once a day and gives a bonus when all are done", () => {
    const plan = planFor(file, questions, ["scams"], "2026-10-04");
    let progress = emptyProgress();
    progress = finishChallenge(progress, plan.crisis!.id, XP.crisis, "2026-10-04");
    const once = progress.xp;
    progress = finishChallenge(progress, plan.crisis!.id, XP.crisis, "2026-10-04");
    expect(progress.xp).toBe(once);
    progress = finishChallenge(progress, plan.task!.id, XP.realTask, "2026-10-04");
    progress = finishChallenge(progress, "quiz", XP.quiz, "2026-10-04");
    expect(planDone(progress.challenges["2026-10-04"], plan).count).toBe(3);
    expect(progress.xp).toBe(XP.task + XP.crisis + XP.realTask + XP.quiz + XP.allChallenges);
    expect(progress.days).toContain("2026-10-04");
  });

  it("keeps the best game score and gives game XP once a day", () => {
    let progress = finishGame(emptyProgress(), "needs-wants", 7, "2026-10-04");
    const first = progress.xp;
    progress = finishGame(progress, "needs-wants", 9, "2026-10-04");
    expect(progress.games["needs-wants"]).toBe(9);
    expect(progress.xp).toBe(first);
  });

  it("reads rows saved before challenges existed", () => {
    const old = normalizeProgress({ xp: 40, lessons: ["budget"] });
    expect(old.challenges).toEqual({});
    expect(old.games).toEqual({});
  });
});

