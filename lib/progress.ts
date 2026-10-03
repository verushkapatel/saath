import type { Path } from "./content-types";
import { addDays } from "./dates";
import { computeStreak } from "./streak";

export type TaskId = "question" | "log" | "lesson" | "fee" | "sample" | "case" | "step";

export type Progress = {
  id: "progress";
  streak: number;
  lastAnswerDate: string | null;
  cases: Record<string, number>;
  lessons: string[];
  /** Dates on which at least one task was finished. */
  days: string[];
  /** Date to the tasks finished that day. Only recent days are kept. */
  tasks: Record<string, TaskId[]>;
  /** Date to the option picked for that day's question. */
  answers: Record<string, number>;
  /** Path id to the step ids finished. */
  paths: Record<string, string[]>;
  /** Path id to the date its milestone was earned. */
  milestones: Record<string, string>;
  activePath: string | null;
  /** The quiet sign-in offer is shown once. */
  offered: boolean;
};

const KEEP_DAYS = 400;
const KEEP_RECENT = 21;

export function emptyProgress(): Progress {
  return {
    id: "progress",
    streak: 0,
    lastAnswerDate: null,
    cases: {},
    lessons: [],
    days: [],
    tasks: {},
    answers: {},
    paths: {},
    milestones: {},
    activePath: null,
    offered: false,
  };
}

/** Accepts a row saved by an older build and fills in what is missing. */
export function normalizeProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  const old = raw as Partial<Progress>;
  const next: Progress = {
    ...base,
    streak: typeof old.streak === "number" ? old.streak : 0,
    lastAnswerDate: typeof old.lastAnswerDate === "string" ? old.lastAnswerDate : null,
    cases: old.cases && typeof old.cases === "object" ? { ...old.cases } : {},
    lessons: Array.isArray(old.lessons) ? [...new Set(old.lessons)] : [],
    days: Array.isArray(old.days) ? [...new Set(old.days)].sort() : [],
    tasks: old.tasks && typeof old.tasks === "object" ? { ...old.tasks } : {},
    answers: old.answers && typeof old.answers === "object" ? { ...old.answers } : {},
    paths: old.paths && typeof old.paths === "object" ? { ...old.paths } : {},
    milestones: old.milestones && typeof old.milestones === "object" ? { ...old.milestones } : {},
    activePath: typeof old.activePath === "string" ? old.activePath : null,
    offered: old.offered === true,
  };
  // Older builds only stored a count and the last day. Rebuild the days it stood for.
  if (next.days.length === 0 && next.lastAnswerDate && next.streak > 0) {
    next.days = Array.from({ length: Math.min(next.streak, KEEP_DAYS) }, (_, index) =>
      addDays(next.lastAnswerDate as string, -index),
    ).sort();
  }
  return next;
}

function prune<T>(record: Record<string, T>, today: string): Record<string, T> {
  const floor = addDays(today, -KEEP_RECENT);
  return Object.fromEntries(Object.entries(record).filter(([date]) => date >= floor));
}

/** Records one finished task. The day now counts toward the streak. */
export function markTask(progress: Progress, task: TaskId, today: string): Progress {
  const days = progress.days.includes(today) ? progress.days : [...progress.days, today].sort().slice(-KEEP_DAYS);
  const done = progress.tasks[today] ?? [];
  const tasks = prune({ ...progress.tasks, [today]: done.includes(task) ? done : [...done, task] }, today);
  return { ...progress, days, tasks, streak: computeStreak(days, today).count };
}

export function answerQuestion(progress: Progress, choice: number, today: string): Progress {
  if (today in progress.answers) return progress;
  const next = markTask(progress, "question", today);
  return { ...next, lastAnswerDate: today, answers: prune({ ...next.answers, [today]: choice }, today) };
}

export type PathProgress = { done: number; total: number; ratio: number; nextStepId: string | null; complete: boolean };

export function pathProgress(path: Path, progress: Progress): PathProgress {
  const finished = new Set(progress.paths[path.id] ?? []);
  const done = path.steps.filter((step) => finished.has(step.id)).length;
  const next = path.steps.find((step) => !finished.has(step.id));
  return {
    done,
    total: path.steps.length,
    ratio: path.steps.length ? done / path.steps.length : 0,
    nextStepId: next?.id ?? null,
    complete: path.steps.length > 0 && done === path.steps.length,
  };
}

function awardMilestones(progress: Progress, paths: Path[], today: string): Progress {
  let milestones = progress.milestones;
  for (const path of paths) {
    if (milestones[path.id]) continue;
    if (pathProgress(path, progress).complete) milestones = { ...milestones, [path.id]: today };
  }
  return milestones === progress.milestones ? progress : { ...progress, milestones };
}

/** Finishes one step of a path, and the milestone if that was the last one. */
export function completeStep(progress: Progress, pathId: string, stepId: string, paths: Path[], today: string): Progress {
  const path = paths.find((item) => item.id === pathId);
  if (!path || !path.steps.some((step) => step.id === stepId)) return progress;
  const finished = progress.paths[pathId] ?? [];
  if (finished.includes(stepId)) return progress;
  const next = markTask(
    { ...progress, paths: { ...progress.paths, [pathId]: [...finished, stepId] }, activePath: pathId },
    "step",
    today,
  );
  return awardMilestones(next, paths, today);
}

/** Finishes a lesson. Every path step that points at this lesson is finished with it. */
export function completeLesson(progress: Progress, lessonId: string, paths: Path[], today: string): Progress {
  let next: Progress = progress.lessons.includes(lessonId)
    ? progress
    : { ...progress, lessons: [...progress.lessons, lessonId] };
  const nextPaths = { ...next.paths };
  for (const path of paths) {
    for (const step of path.steps) {
      if (step.kind !== "lesson" || step.lessonId !== lessonId) continue;
      const finished = nextPaths[path.id] ?? [];
      if (!finished.includes(step.id)) nextPaths[path.id] = [...finished, step.id];
    }
  }
  next = markTask({ ...next, paths: nextPaths }, "lesson", today);
  return awardMilestones(next, paths, today);
}

export function answerCase(progress: Progress, caseId: string, choice: number, today: string): Progress {
  if (caseId in progress.cases) return progress;
  return markTask({ ...progress, cases: { ...progress.cases, [caseId]: choice } }, "case", today);
}

function unionSteps(a: Record<string, string[]>, b: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[key] = [...new Set([...(a[key] ?? []), ...(b[key] ?? [])])];
  }
  return out;
}

/** Joins progress from two phones. Nothing finished on either phone is lost. */
export function mergeProgress(local: Progress, remote: Progress, today: string): Progress {
  const days = [...new Set([...local.days, ...remote.days])].sort().slice(-KEEP_DAYS);
  const tasks: Record<string, TaskId[]> = {};
  for (const date of new Set([...Object.keys(local.tasks), ...Object.keys(remote.tasks)])) {
    tasks[date] = [...new Set([...(local.tasks[date] ?? []), ...(remote.tasks[date] ?? [])])];
  }
  const lastAnswerDate = [local.lastAnswerDate, remote.lastAnswerDate].filter(Boolean).sort().at(-1) ?? null;
  const milestones = { ...remote.milestones };
  for (const [id, date] of Object.entries(local.milestones)) {
    if (!milestones[id] || date < milestones[id]) milestones[id] = date;
  }
  return {
    id: "progress",
    days,
    tasks: prune(tasks, today),
    answers: prune({ ...remote.answers, ...local.answers }, today),
    lessons: [...new Set([...local.lessons, ...remote.lessons])],
    cases: { ...remote.cases, ...local.cases },
    paths: unionSteps(local.paths, remote.paths),
    milestones,
    activePath: local.activePath ?? remote.activePath,
    lastAnswerDate,
    offered: local.offered || remote.offered,
    streak: computeStreak(days, today).count,
  };
}
