import { asset } from "./config";
import type { Category, Lang } from "./catalog";

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
  | `case:${string}`
  | null;

export type Lesson = {
  id: string;
  category: Category;
  icon: string;
  title: Copy;
  summary: Copy;
  /** Short intro. May hold [[glossary-id]] markers. */
  body: Copy;
  points: Copy[];
  example: Copy;
  tryIt: { text: Copy; link: ActionLink };
  check: MiniCheck;
};

export type PathStep =
  | { id: string; kind: "lesson"; lessonId: string; title: Copy }
  | { id: string; kind: "action"; title: Copy; body: Copy; link: ActionLink }
  | { id: string; kind: "check"; title: Copy; check: MiniCheck };

export type Path = {
  id: string;
  icon: string;
  title: Copy;
  summary: Copy;
  /** The one line on the milestone card: "You can now ...". */
  milestone: Copy;
  /** Weekly cases that belong to this path. */
  caseIds: string[];
  steps: PathStep[];
};

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
  if (link === "scan") return "/scan";
  if (link.startsWith("scan:")) return `/scan?sample=${link.slice(5)}`;
  if (link.startsWith("case:")) return `/money-lab/case/${link.slice(5)}`;
  return null;
}
