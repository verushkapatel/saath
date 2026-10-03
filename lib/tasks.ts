import { DRILL_UNIT, TOPIC_UNIT, type DrillId, type Unit } from "./catalog";
import type { Lesson, Path } from "./content-types";
import { pathProgress, type Progress, type TaskId } from "./progress";

export type TodayTask = {
  id: Extract<TaskId, "question" | "log" | "lesson" | "fee" | "sample" | "drill">;
  href: string;
  /** Set for the lesson task so the card can name the lesson. */
  lessonId?: string;
  /** Set for the drill task so the card can name the drill. */
  drillId?: DrillId;
  /** The Skyward unit this task practises. */
  unit: Unit | null;
  done: boolean;
};

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** The next lesson worth reading: the active path's next lesson, else the first unread one. */
export function nextLesson(progress: Progress, lessons: Lesson[], paths: Path[]): string | null {
  const active = paths.find((path) => path.id === progress.activePath && !pathProgress(path, progress).complete);
  if (active) {
    const finished = new Set(progress.paths[active.id] ?? []);
    for (const step of active.steps) {
      if (step.kind === "lesson" && !finished.has(step.id)) return step.lessonId;
    }
  }
  const unread = lessons.find((lesson) => !progress.lessons.includes(lesson.id));
  return unread?.id ?? lessons[0]?.id ?? null;
}

const SAMPLE_ORDER = ["personal-loan", "gold-loan", "scheme-form"] as const;
const DRILL_ORDER: DrillId[] = ["scam", "form", "price"];

/**
 * Three small tasks for the day. The question is always there.
 * The other two rotate with the calendar so the same date always shows the same three.
 */
export function pickTasks(
  today: string,
  progress: Progress,
  lessons: Lesson[],
  paths: Path[],
  questionTopic?: string,
): TodayTask[] {
  const done = new Set(progress.tasks[today] ?? []);
  const n = dayNumber(today);
  const lessonId = nextLesson(progress, lessons, paths) ?? undefined;
  const lesson = lessons.find((item) => item.id === lessonId);
  const sample = SAMPLE_ORDER[n % SAMPLE_ORDER.length];
  const drill = DRILL_ORDER[n % DRILL_ORDER.length];

  const pool: Omit<TodayTask, "done">[] = [
    { id: "log", href: "/money-lab?log=1", unit: "own-money" },
    { id: "lesson", href: lessonId ? `/guide/${lessonId}` : "/guide", lessonId, unit: lesson?.unit ?? null },
    { id: "fee", href: `/scan?sample=${n % 2 === 0 ? "personal-loan" : "gold-loan"}`, unit: "borrow-safe" },
    { id: "sample", href: `/scan?sample=${sample}`, unit: "borrow-safe" },
    { id: "drill", href: `/drills/${drill}`, drillId: drill, unit: DRILL_UNIT[drill] },
  ];
  // Fee and sample both open the scanner, so they never share a day.
  const pairs: [number, number][] = [[0, 1], [4, 2], [1, 3], [0, 4], [1, 2], [4, 3]];
  const [first, second] = pairs[n % pairs.length];
  const question: Omit<TodayTask, "done"> = {
    id: "question",
    href: "/#question",
    unit: questionTopic ? TOPIC_UNIT[questionTopic] ?? null : null,
  };

  return [question, pool[first], pool[second]].map((task) => ({ ...task, done: done.has(task.id) }));
}
