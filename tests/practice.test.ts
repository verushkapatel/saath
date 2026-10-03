import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Path } from "@/lib/content-types";
import { continuePath, scorePractice } from "@/lib/practice";
import { completeLesson, completeStep, emptyProgress } from "@/lib/progress";
import { caseOfTheDay, completeScenario, dueRecall, emptySimulationState, sentenceBeats } from "@/lib/simulations";

const paths = JSON.parse(readFileSync(`${process.cwd()}/content/paths.json`, "utf8")) as Path[];
const TODAY = "2026-10-05";

describe("scorePractice", () => {
  it("starts at zero with curious stage", () => {
    const score = scorePractice(emptyProgress(), paths, 0);
    expect(score).toMatchObject({ points: 0, level: 1, withinLevel: 0, growthStage: 0 });
    expect(score.earned.every((item) => !item)).toBe(true);
  });

  it("awards XP from lessons, steps, paths, and scenarios — not answers", () => {
    let progress = emptyProgress();
    const budget = paths.find((path) => path.id === "first-budget")!;
    for (const step of budget.steps) {
      if (step.kind === "lesson") progress = completeLesson(progress, step.lessonId, paths, TODAY);
      else progress = completeStep(progress, budget.id, step.id, paths, TODAY);
    }
    const score = scorePractice(progress, paths, 2);
    expect(score.points).toBeGreaterThan(0);
    expect(score.earned[0]).toBe(true);
    expect(score.earned[1]).toBe(true);
    expect(score.growthStage).toBeGreaterThanOrEqual(2);
    expect(score.completedPaths.has("first-budget")).toBe(true);
  });

  it("names the path to continue", () => {
    expect(continuePath(emptyProgress(), paths)?.id).toBe("first-budget");
  });
});

describe("simulations helpers", () => {
  it("splits story beats and schedules recalls", () => {
    expect(sentenceBeats("One. Two! Three?").length).toBe(3);
    const state = completeScenario(emptySimulationState(), "upi-pin", 0, 1, TODAY);
    expect(state.cases["upi-pin"]?.recalls.map((item) => item.due)).toEqual(["2026-10-06", "2026-10-12"]);
    expect(dueRecall(state, "2026-10-06")?.id).toBe("upi-pin");
    expect(caseOfTheDay([{ id: "a" }, { id: "b" }], TODAY)?.id).toBeTruthy();
  });
});
