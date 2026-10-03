import type { Lesson, Path } from "./content-types";
import { pathProgress, type Progress, type TaskId } from "./progress";

export type TodayTask = {
  id: Extract<TaskId, "question" | "log" | "lesson" | "fee" | "sample">;
  href: string;
  /** Set for the lesson task so the card can name the lesson. */
  lessonId?: string;
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

/**
 * Three small tasks for the day. The question is always there.
 * The other two rotate with the calendar so the same date always shows the same three.
 */
export function pickTasks(today: string, progress: Progress, lessons: Lesson[], paths: Path[]): TodayTask[] {
  const done = new Set(progress.tasks[today] ?? []);
  const n = dayNumber(today);
  const lessonId = nextLesson(progress, lessons, paths) ?? undefined;
  const sample = SAMPLE_ORDER[n % SAMPLE_ORDER.length];

  const pool: Omit<TodayTask, "done">[] = [
    { id: "log", href: "/money-lab?log=1" },
    { id: "lesson", href: lessonId ? `/guide/${lessonId}` : "/guide", lessonId },
    { id: "fee", href: `/scan?sample=${n % 2 === 0 ? "personal-loan" : "gold-loan"}` },
    { id: "sample", href: `/scan?sample=${sample}` },
  ];
  // Fee and sample both open the scanner, so they never share a day.
  const pairs: [number, number][] = [[0, 1], [0, 2], [1, 3], [0, 1], [1, 2], [0, 3]];
  const [first, second] = pairs[n % pairs.length];

  return [{ id: "question" as const, href: "/#question" }, pool[first], pool[second]].map((task) => ({
    ...task,
    done: done.has(task.id),
  }));
}
