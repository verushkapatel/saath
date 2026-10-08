import { asset } from "./config";
import type { Lang, Topic, Unit } from "./catalog";

export type Copy = Record<Lang, string>;

export type DailyQuestion = {
  id: string;
  topic: string;
  prompt: Copy;
  options: Copy[];
  answer: number;
  why: Copy;
};

export type CaseStudy = {
  id: string;
  title: Copy;
  story: Copy;
  question: Copy;
  options: Copy[];
  best: number;
  debrief: Copy;
  sampleId: "personal-loan" | "gold-loan" | "scheme-form" | null;
};

export type MiniCheck = {
  question: Copy;
  options: Copy[];
  answer: number;
  why: Copy;
};

/** Where a "Try it" action or a path step sends the user. */
export type ActionLink =
  | "tracker"
  | "scan"
  | "scan:personal-loan"
  | "scan:gold-loan"
  | "scan:scheme-form"
  | "drills"
  | "finlit"
  | `case:${string}`
  | `drill:${string}`
  | `episode:${string}`
  | `form:${string}`
  | "resume"
  | null;

export type Lesson = {
  id: string;
  unit: Unit;
  /** The money area this guide belongs to. */
  topic: Topic;
  icon: string;
  title: Copy;
  summary: Copy;
  /** Short intro. May hold [[glossary-id]] markers. */
  body: Copy;
  points: Copy[];
  example: Copy;
  tryIt: { text: Copy; link: ActionLink };
  check: MiniCheck;
  /** YYYY-MM of last factual review against official sources. */
  reviewed?: string;
  /** Official pages the facts in this lesson were checked against. */
  sources?: string[];
};

export type PathStep =
  | { id: string; kind: "lesson"; lessonId: string; title: Copy }
  | { id: string; kind: "action"; title: Copy; body: Copy; link: ActionLink }
  | { id: string; kind: "check"; title: Copy; check: MiniCheck };

export type Path = {
  id: string;
  unit: Unit;
  icon: string;
  title: Copy;
  summary: Copy;
  /** The one line on the milestone card: "You can now ...". */
  milestone: Copy;
  /** Weekly cases that belong to this path. */
  caseIds: string[];
  steps: PathStep[];
};

/** One entry in the forms library. Every fact in it comes from the official page named in `source`. */
export type FormGuide = {
  id: string;
  topic: Topic;
  name: Copy;
  /** Other names and numbers the same form goes by. */
  alsoCalled: Copy;
  purpose: Copy;
  /** Who issues or requires it. */
  authority: Copy;
  /** Who usually fills it. */
  audience: Copy;
  fields: { name: Copy; meaning: Copy }[];
  documents: Copy[];
  terms: { term: Copy; meaning: Copy }[];
  mistakes: Copy[];
  verify: Copy[];
  source: { name: string; url: string }[];
  /** YYYY-MM-DD the entry was last checked against the source. */
  verified: string;
  /** Guides to read with it. */
  guides: string[];
};

export type FormsFile = { note: Copy; forms: FormGuide[] };

/**
 * A real event, summarised in Saath's own words from a published source.
 * `kind` says what the source is: an official release, or a news report of a case.
 */
export type RealStory = {
  id: string;
  topic: Topic;
  kind: "official" | "reported";
  title: Copy;
  /** What happened. */
  what: Copy;
  /** What it teaches. */
  lesson: Copy;
  /** What to do so it does not happen to you. */
  act: Copy;
  /** When and where the event happened, as the source states. */
  when: Copy;
  source: { name: string; title: string; url: string; published: string };
  /** Further published sources for parts of the account. */
  also?: { name: string; url: string }[];
  /** YYYY-MM-DD the summary was checked against the source. */
  verified: string;
  guides: string[];
};

export type StoriesFile = { note: Copy; stories: RealStory[] };

export type GlossaryTerm = {
  id: string;
  term: Copy;
  definition: Copy;
};

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const request = fetch(asset(path)).then((response) => {
    if (!response.ok) throw new Error("load");
    return response.json() as Promise<T>;
  });
  request.catch(() => cache.delete(path));
  cache.set(path, request);
  return request;
}

export function linkHref(link: ActionLink): string | null {
  if (!link) return null;
  if (link === "tracker") return "/money-lab";
  if (link === "resume") return "/resume";
  if (link === "scan") return "/scan";
  if (link === "drills") return "/drills";
  if (link === "finlit") return "/check";
  if (link.startsWith("scan:")) return `/scan?sample=${link.slice(5)}`;
  if (link.startsWith("case:")) return `/money-lab/case/${link.slice(5)}`;
  if (link.startsWith("drill:")) return `/drills/${link.slice(6)}`;
  if (link.startsWith("episode:")) return `/journey/${link.slice(8)}`;
  if (link.startsWith("form:")) return `/forms/${link.slice(5)}`;
  return null;
}

/** A short money crisis to handle: a story, a choice and why the best choice is best. */
export type Crisis = {
  id: string;
  topic: Topic;
  title: Copy;
  story: Copy;
  question: Copy;
  options: Copy[];
  answer: number;
  why: Copy;
  guide: string;
};
/** Something small to do in real life today. */
export type RealTask = { id: string; topic: Topic; text: Copy };
export type ChallengesFile = { reviewed: string; crises: Crisis[]; tasks: RealTask[] };

export type NeedsItem = { id: string; need: boolean; text: Copy; why: Copy };
export type ScamItem = { id: string; scam: boolean; text: Copy; why: Copy };
export type GamesFile = { needs: NeedsItem[]; scams: ScamItem[] };

/**
 * A walkthrough: one real process lived from start to finish, step by step, the way Verena does it.
 * Each step has a scene (the picture), what happens, the small details that matter, words people say,
 * a trap to watch for, and sometimes a decision to make before moving on.
 */
export type WalkChoice = { prompt: Copy; options: { text: Copy; good: boolean; result: Copy }[] };

export type WalkStep = {
  scene: string;
  title: Copy;
  text: Copy;
  /** The words printed on the screen or paper in the picture. First line is the heading. */
  screen?: Copy[];
  details?: Copy[];
  say?: { who: Copy; line: Copy };
  watch?: Copy;
  /** Time, money or documents this step costs, in a few words. */
  cost?: Copy;
  choice?: WalkChoice;
};

export type Walkthrough = {
  id: string;
  /** The guide this walkthrough belongs to. */
  guide: string;
  title: Copy;
  /** Where and when it happens, in one line. */
  setting: Copy;
  steps: WalkStep[];
  takeaways: Copy[];
  /** YYYY-MM the facts were last checked. */
  reviewed?: string;
  sources?: string[];
};

/** Which walkthroughs exist, so lists can show them without loading every file. */
export type WalkIndex = { id: string; guide: string; title: Copy; steps: number }[];

let walkIds: Promise<Set<string> | null> | null = null;

export async function loadWalk(id: string): Promise<Walkthrough> {
  walkIds ??= loadJson<string[]>("/content/walk-ids.json").then((list) => new Set(list)).catch(() => null);
  const known = await walkIds;
  // Without the list, try the file anyway; with it, skip guides that have no walkthrough.
  if (known && !known.has(id)) throw new Error("no walkthrough");
  return loadJson<Walkthrough>(`/content/walks/${id}.json`);
}
