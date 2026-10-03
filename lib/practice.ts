import type { Path } from "./content-types";
import { pathProgress, type Progress } from "./progress";

export type PracticeScore = {
  points: number;
  level: number;
  withinLevel: number;
  growthStage: 0 | 1 | 2 | 3;
  earned: boolean[];
  completedPaths: Set<string>;
};

const BUDGET = "first-budget";
const PAPER = ["bank-visit", "salary-slip", "first-loan-paper"] as const;
const DIGITAL = ["loan-scam", "upi-without-fear"] as const;

/** Practice XP from lessons, steps, paths, and case simulations — never from test scores. */
export function scorePractice(progress: Progress, paths: Path[], scenarioCount = 0): PracticeScore {
  const lessons = new Set(progress.lessons);
  const completedPaths = new Set<string>();
  let actionSteps = 0;

  for (const path of paths) {
    const done = new Set(progress.paths[path.id] ?? []);
    for (const step of path.steps) {
      if (step.kind !== "lesson" && done.has(step.id)) actionSteps += 1;
    }
    if (pathProgress(path, progress).complete) completedPaths.add(path.id);
  }

  const points = lessons.size * 20 + actionSteps * 10 + completedPaths.size * 25 + scenarioCount * 10;
  const earned = [
    lessons.size > 0,
    completedPaths.has(BUDGET),
    PAPER.some((id) => completedPaths.has(id)),
    DIGITAL.some((id) => completedPaths.has(id)),
  ];
  const hasPracticeAcrossDomains = earned.slice(1).every(Boolean);
  const growthStage: PracticeScore["growthStage"] = hasPracticeAcrossDomains
    ? 3
    : completedPaths.size > 0
      ? 2
      : points > 0
        ? 1
        : 0;

  return {
    points,
    level: Math.floor(points / 100) + 1,
    withinLevel: points % 100,
    growthStage,
    earned,
    completedPaths,
  };
}

/** Active incomplete path, else the first incomplete path. */
export function continuePath(progress: Progress, paths: Path[]): Path | null {
  const active = paths.find((path) => path.id === progress.activePath && !pathProgress(path, progress).complete);
  if (active) return active;
  return paths.find((path) => !pathProgress(path, progress).complete) ?? null;
}
