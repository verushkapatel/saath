import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESSON_IDS, PATH_IDS } from "@/lib/catalog";
import type { Lesson, Path } from "@/lib/content-types";
import {
  answerQuestion,
  completeLesson,
  completeStep,
  emptyProgress,
  markTask,
  mergeProgress,
  normalizeProgress,
  pathProgress,
} from "@/lib/progress";
import { pickTasks } from "@/lib/tasks";

const paths = JSON.parse(readFileSync(`${process.cwd()}/content/paths.json`, "utf8")) as Path[];
const lessons = JSON.parse(readFileSync(`${process.cwd()}/content/guide.json`, "utf8")) as Lesson[];
const TODAY = "2026-10-05";
const budget = paths.find((path) => path.id === "first-budget")!;

describe("paths", () => {
  it("ships eight paths of five to seven real steps, in three languages", () => {
    expect(paths.map((path) => path.id)).toEqual([...PATH_IDS]);
    for (const path of paths) {
      expect(path.steps.length).toBeGreaterThanOrEqual(5);
      expect(path.steps.length).toBeLessThanOrEqual(7);
      const kinds = new Set(path.steps.map((step) => step.kind));
      expect(kinds.has("action")).toBe(true);
      expect(kinds.has("check")).toBe(true);
      for (const lang of ["en", "hi", "mr"] as const) {
        expect(path.title[lang].length).toBeGreaterThan(0);
        expect(path.milestone[lang].length).toBeGreaterThan(0);
        for (const step of path.steps) expect(step.title[lang].length).toBeGreaterThan(0);
      }
      for (const step of path.steps) {
        if (step.kind === "lesson") expect(LESSON_IDS).toContain(step.lessonId);
        if (step.kind === "check") expect(step.check.answer).toBeLessThan(step.check.options.length);
      }
    }
  });

  it("starts at zero and names the first step as next", () => {
    const state = pathProgress(budget, emptyProgress());
    expect(state).toMatchObject({ done: 0, total: budget.steps.length, ratio: 0, complete: false });
    expect(state.nextStepId).toBe(budget.steps[0].id);
  });

  it("finishes a lesson step when the lesson is completed", () => {
    const next = completeLesson(emptyProgress(), "budget", paths, TODAY);
    expect(next.lessons).toEqual(["budget"]);
    expect(pathProgress(budget, next).done).toBe(1);
    expect(next.days).toEqual([TODAY]);
    expect(next.tasks[TODAY]).toEqual(["lesson"]);
  });

  it("does not count the same step twice", () => {
    const once = completeStep(emptyProgress(), "first-budget", "s2", paths, TODAY);
    const twice = completeStep(once, "first-budget", "s2", paths, TODAY);
    expect(twice).toBe(once);
    expect(pathProgress(budget, twice).done).toBe(1);
  });

  it("ignores a step that is not on the path", () => {
    const start = emptyProgress();
    expect(completeStep(start, "first-budget", "nope", paths, TODAY)).toBe(start);
    expect(completeStep(start, "no-such-path", "s1", paths, TODAY)).toBe(start);
  });

  it("awards one milestone when the last step is finished", () => {
    let progress = emptyProgress();
    for (const step of budget.steps.slice(0, -1)) progress = completeStep(progress, budget.id, step.id, paths, TODAY);
    expect(progress.milestones).toEqual({});
    expect(pathProgress(budget, progress).ratio).toBeCloseTo((budget.steps.length - 1) / budget.steps.length);
    progress = completeStep(progress, budget.id, budget.steps.at(-1)!.id, paths, "2026-10-06");
    expect(pathProgress(budget, progress).complete).toBe(true);
    expect(progress.milestones).toEqual({ "first-budget": "2026-10-06" });
  });

  it("upgrades progress saved by the older build", () => {
    const old = { id: "progress", streak: 3, lastAnswerDate: TODAY, cases: { "upi-pin": 1 }, lessons: ["budget"] };
    const next = normalizeProgress(old);
    expect(next.days).toEqual(["2026-10-03", "2026-10-04", TODAY]);
    expect(next.cases).toEqual({ "upi-pin": 1 });
    expect(next.paths).toEqual({});
  });

  it("joins two phones without losing anything", () => {
    const phone = completeLesson(answerQuestion(emptyProgress(), 1, "2026-10-04"), "budget", paths, "2026-10-04");
    const other = completeStep(markTask(emptyProgress(), "log", TODAY), "first-budget", "s2", paths, TODAY);
    const merged = mergeProgress(phone, other, TODAY);
    expect(merged.days).toEqual(["2026-10-04", TODAY]);
    expect(merged.streak).toBe(2);
    expect(merged.lessons).toEqual(["budget"]);
    expect(merged.paths["first-budget"].sort()).toEqual(["s1", "s2"]);
    expect(merged.lastAnswerDate).toBe("2026-10-04");
  });
});

describe("today's tasks", () => {
  it("offers three tasks, always with the question, the same for the same date", () => {
    const first = pickTasks(TODAY, emptyProgress(), lessons, paths);
    const again = pickTasks(TODAY, emptyProgress(), lessons, paths);
    expect(first).toEqual(again);
    expect(first).toHaveLength(3);
    expect(first[0].id).toBe("question");
    expect(new Set(first.map((task) => task.id)).size).toBe(3);
  });

  it("never pairs the fee task with the sample task", () => {
    for (let offset = 0; offset < 30; offset += 1) {
      const date = `2026-10-${String(offset + 1).padStart(2, "0")}`;
      const ids = pickTasks(date, emptyProgress(), lessons, paths).map((task) => task.id);
      expect(ids.includes("fee") && ids.includes("sample")).toBe(false);
    }
  });

  it("marks a task done once it is finished", () => {
    const progress = answerQuestion(emptyProgress(), 0, TODAY);
    expect(pickTasks(TODAY, progress, lessons, paths)[0].done).toBe(true);
  });
});
