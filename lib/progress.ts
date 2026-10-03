import type { Path } from "./content-types";
import { addDays } from "./dates";
import { computeStreak } from "./streak";

export type TaskId = "question" | "log" | "lesson" | "fee" | "sample" | "case" | "step" | "drill" | "check" | "episode" | "story";

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
  /** Experience points. They only ever go up. */
  xp: number;
  /** Episode id to what was chosen, how many drill questions were right, and the day it was finished. */
  journey: Record<string, EpisodeResult>;
  /** What the character is wearing and where she stands. */
  look: Look;
  /** The money areas this person said are hardest. Empty until they choose. */
  focus: string[];
  /** True once the short "what is hardest" step has been answered or skipped. */
  personalised: boolean;
  /** Topic to the number of wrong answers given in it. Used to suggest what to revise. */
  mistakes: Record<string, number>;
  /** Lesson id to the last day it was finished or revised. */
  seen: Record<string, string>;
  /** Real-life stories that were read. */
  stories: string[];
  /** Forms opened in the forms library. */
  forms: string[];
  /** True once the first-use walk through Money Lab was finished. */
  moneyIntro: boolean;
};

export type EpisodeResult = { choice: number; drill: number; at: string };
export type Look = { outfit: string; extra: string; place: string };

/** What each kind of finished work is worth. */
export const XP = {
  task: 5,
  question: 10,
  lesson: 20,
  revise: 8,
  step: 10,
  case: 15,
  milestone: 50,
  episode: 40,
  drillRight: 10,
  story: 10,
} as const;

/** Level n starts at 50 × n × (n − 1): 0, 100, 300, 600, 1000 … so each level takes a little longer than the last. */
export function levelFor(xp: number): { level: number; into: number; need: number; ratio: number } {
  const points = Math.max(0, Math.floor(xp));
  let level = 1;
  while (50 * (level + 1) * level <= points) level += 1;
  const floor = 50 * level * (level - 1);
  const need = 100 * level;
  return { level, into: points - floor, need, ratio: (points - floor) / need };
}

export function addXp(progress: Progress, amount: number): Progress {
  return amount > 0 ? { ...progress, xp: progress.xp + amount } : progress;
}

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
    xp: 0,
    journey: {},
    look: { outfit: "kurta", extra: "none", place: "room" },
    focus: [],
    personalised: false,
    mistakes: {},
    seen: {},
    stories: [],
    forms: [],
    moneyIntro: false,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : []);

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
    xp: typeof old.xp === "number" && old.xp > 0 ? Math.floor(old.xp) : 0,
    journey: isRecord(old.journey) ? { ...(old.journey as Record<string, EpisodeResult>) } : {},
    look: isRecord(old.look)
      ? {
          outfit: typeof old.look.outfit === "string" ? old.look.outfit : base.look.outfit,
          extra: typeof old.look.extra === "string" ? old.look.extra : base.look.extra,
          place: typeof old.look.place === "string" ? old.look.place : base.look.place,
        }
      : base.look,
    focus: strings(old.focus),
    personalised: old.personalised === true,
    mistakes: isRecord(old.mistakes) ? { ...(old.mistakes as Record<string, number>) } : {},
    seen: isRecord(old.seen) ? { ...(old.seen as Record<string, string>) } : {},
    stories: strings(old.stories),
    forms: strings(old.forms),
    moneyIntro: old.moneyIntro === true,
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
  const fresh = !done.includes(task);
  const tasks = prune({ ...progress.tasks, [today]: fresh ? [...done, task] : done }, today);
  return { ...progress, days, tasks, streak: computeStreak(days, today).count, xp: progress.xp + (fresh ? XP.task : 0) };
}

export function answerQuestion(progress: Progress, choice: number, today: string): Progress {
  if (today in progress.answers) return progress;
  const next = markTask(progress, "question", today);
  return { ...next, xp: next.xp + XP.question, lastAnswerDate: today, answers: prune({ ...next.answers, [today]: choice }, today) };
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
  if (milestones === progress.milestones) return progress;
  const earned = Object.keys(milestones).length - Object.keys(progress.milestones).length;
  return { ...progress, milestones, xp: progress.xp + earned * XP.milestone };
}

/** Finishes one step of a path, and the milestone if that was the last one. */
export function completeStep(progress: Progress, pathId: string, stepId: string, paths: Path[], today: string): Progress {
  const path = paths.find((item) => item.id === pathId);
  if (!path || !path.steps.some((step) => step.id === stepId)) return progress;
  const finished = progress.paths[pathId] ?? [];
  if (finished.includes(stepId)) return progress;
  const next = markTask(
    { ...progress, xp: progress.xp + XP.step, paths: { ...progress.paths, [pathId]: [...finished, stepId] }, activePath: pathId },
    "step",
    today,
  );
  return awardMilestones(next, paths, today);
}

/** Finishes a lesson. Every path step that points at this lesson is finished with it. */
export function completeLesson(progress: Progress, lessonId: string, paths: Path[], today: string): Progress {
  const revisedToday = progress.seen[lessonId] === today;
  let next: Progress = progress.lessons.includes(lessonId)
    ? { ...progress, xp: progress.xp + (revisedToday ? 0 : XP.revise) }
    : { ...progress, lessons: [...progress.lessons, lessonId], xp: progress.xp + XP.lesson };
  next = { ...next, seen: { ...next.seen, [lessonId]: today } };
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
  return markTask({ ...progress, xp: progress.xp + XP.case, cases: { ...progress.cases, [caseId]: choice } }, "case", today);
}

/** Finishes one episode of the story. Playing it again changes nothing: the first decision is the one that counts. */
export function completeEpisode(progress: Progress, episodeId: string, choice: number, drillRight: number, today: string): Progress {
  if (episodeId in progress.journey) return progress;
  const next = markTask(
    { ...progress, journey: { ...progress.journey, [episodeId]: { choice, drill: drillRight, at: today } } },
    "episode",
    today,
  );
  return { ...next, xp: next.xp + XP.episode + drillRight * XP.drillRight };
}

/** Remembers a wrong answer in a topic, so it can be suggested for revision. */
export function noteMistake(progress: Progress, topic: string | null | undefined): Progress {
  if (!topic) return progress;
  return { ...progress, mistakes: { ...progress.mistakes, [topic]: (progress.mistakes[topic] ?? 0) + 1 } };
}

export function readStory(progress: Progress, storyId: string, today: string): Progress {
  if (progress.stories.includes(storyId)) return progress;
  const next = markTask({ ...progress, stories: [...progress.stories, storyId] }, "story", today);
  return { ...next, xp: next.xp + XP.story };
}

export function openForm(progress: Progress, formId: string): Progress {
  return progress.forms.includes(formId) ? progress : { ...progress, forms: [...progress.forms, formId] };
}

export function setFocus(progress: Progress, focus: string[]): Progress {
  return { ...progress, focus: [...new Set(focus)], personalised: true };
}

export function setLook(progress: Progress, look: Partial<Look>): Progress {
  return { ...progress, look: { ...progress.look, ...look } };
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
    xp: Math.max(local.xp, remote.xp),
    journey: { ...remote.journey, ...local.journey },
    look: local.look,
    focus: local.focus.length ? local.focus : remote.focus,
    personalised: local.personalised || remote.personalised,
    mistakes: Object.fromEntries(
      [...new Set([...Object.keys(local.mistakes), ...Object.keys(remote.mistakes)])].map((key) => [key, Math.max(local.mistakes[key] ?? 0, remote.mistakes[key] ?? 0)]),
    ),
    seen: Object.fromEntries(
      [...new Set([...Object.keys(local.seen), ...Object.keys(remote.seen)])].map((key) => [key, [local.seen[key], remote.seen[key]].filter(Boolean).sort().at(-1) as string]),
    ),
    stories: [...new Set([...local.stories, ...remote.stories])],
    forms: [...new Set([...local.forms, ...remote.forms])],
    moneyIntro: local.moneyIntro || remote.moneyIntro,
  };
}
