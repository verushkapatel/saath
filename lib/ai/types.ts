import type { Lang } from "../catalog";

/** What the person is looking at when they ask. Screens publish this so Saath AI never has to be told. */
export type AiContext = {
  /** A short name for the screen, in the user's language. */
  screen: string;
  kind: "home" | "lesson" | "episode" | "form" | "form-photo" | "story" | "money" | "question" | "progress" | "other";
  id?: string;
  title?: string;
  /** The text on screen that matters: the lesson, the decision and its outcome, the form's purpose. */
  text?: string;
  /** Things worth asking about here, shown as one-tap questions. */
  suggestions?: string[];
};

/** Learning record only. Money Lab amounts are never part of what Saath AI receives. */
export type AiProgress = {
  level: number;
  xp: number;
  streak: number;
  lessonsDone: number;
  lessonsTotal: number;
  episodesDone: number;
  episodesTotal: number;
  stage: string | null;
  focus: string[];
  weak: string[];
  /** Titles of guides worth reading or revising next. */
  nextUp: string[];
};

export type AiTurn = { role: "user" | "saath"; text: string };

export type AiRequest = {
  lang: Lang;
  context: AiContext | null;
  progress: AiProgress | null;
  history: AiTurn[];
};

export type AiSource = { title: string; href: string };

export type AiAnswer = {
  text: string;
  /** Guides, forms or story episodes the answer was built from. */
  sources: AiSource[];
  /** Which provider produced the answer. */
  via: "device" | "local" | "online";
  /** False when Saath had nothing checked to answer from and said so. */
  grounded: boolean;
};

export type MistakeInput = { question: string; picked: string; correct: string; why: string; topic?: string };

/**
 * Every AI provider implements this. The app only ever talks to the interface,
 * so the provider can be swapped (on-device rules, a hosted model, another vendor) without touching a screen.
 */
export interface SaathAIProvider {
  readonly id: string;
  answerQuestion(question: string, request: AiRequest): Promise<AiAnswer>;
  explainLesson(lessonId: string, request: AiRequest): Promise<AiAnswer>;
  explainForm(formIdOrText: string, request: AiRequest): Promise<AiAnswer>;
  explainMistake(mistake: MistakeInput, request: AiRequest): Promise<AiAnswer>;
  recommendRevision(request: AiRequest): Promise<AiAnswer>;
  summarizeProgress(request: AiRequest): Promise<AiAnswer>;
}

/** One passage Saath is allowed to answer from. */
export type Doc = {
  id: string;
  kind: "guide" | "term" | "form" | "episode" | "story";
  topic: string;
  title: string;
  /** One or two sentences that answer "what is this". */
  lead: string;
  /** Further points, each a full sentence. */
  points: string[];
  href: string;
};
