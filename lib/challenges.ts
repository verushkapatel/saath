import { QUESTION_TOPIC, TOPICS, type Topic } from "./catalog";
import type { ChallengesFile, Crisis, DailyQuestion, RealTask } from "./content-types";

/**
 * Today's challenges: one money crisis to handle, one small real-life task and a three-question quiz.
 * They follow the topics the person said are hardest, one topic a day in turn, so the hardest areas come round most.
 * Everyone with the same topics gets the same set on the same day, and a new set the next day.
 */

export type DayPlan = {
  topic: Topic;
  crisis: Crisis | null;
  task: RealTask | null;
  quiz: DailyQuestion[];
};


export function dayNumber(today: string): number {
  const [year, month, day] = today.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

const at = <T>(list: readonly T[], n: number): T | null => (list.length ? list[((n % list.length) + list.length) % list.length] : null);

export function topicFor(focus: readonly string[], today: string): Topic {
  const valid = focus.filter((item): item is Topic => (TOPICS as readonly string[]).includes(item));
  const pool = valid.length ? valid : TOPICS;
  return at(pool, dayNumber(today)) as Topic;
}

export function planFor(file: ChallengesFile, questions: DailyQuestion[], focus: readonly string[], today: string): DayPlan {
  const topic = topicFor(focus, today);
  const n = dayNumber(today);
  const crises = file.crises.filter((item) => item.topic === topic);
  const tasks = file.tasks.filter((item) => item.topic === topic);
  // Turn through the topic's tasks on the days that topic comes round, so the same task does not repeat each time.
  const round = Math.floor(n / Math.max(1, focus.length || TOPICS.length));
  const matching = questions.filter((item) => QUESTION_TOPIC[item.topic] === topic);
  const source = matching.length >= 3 ? matching : questions;
  const quiz: DailyQuestion[] = [];
  for (let index = 0; quiz.length < Math.min(3, source.length); index += 1) {
    const pick = at(source, round * 3 + index + (matching.length >= 3 ? 0 : n));
    if (pick && !quiz.includes(pick)) quiz.push(pick);
    if (index > source.length + 3) break;
  }
  return {
    topic,
    crisis: at(crises, round) ?? at(file.crises, n),
    task: at(tasks, round) ?? at(file.tasks, n),
    quiz,
  };
}

/** Which parts of today's plan are finished, from the ids saved for today. */
export function planDone(done: readonly string[], plan: DayPlan): { crisis: boolean; task: boolean; quiz: boolean; count: number } {
  const crisis = Boolean(plan.crisis && done.includes(plan.crisis.id));
  const task = Boolean(plan.task && done.includes(plan.task.id));
  const quiz = done.includes("quiz");
  return { crisis, task, quiz, count: [crisis, task, quiz].filter(Boolean).length };
}
