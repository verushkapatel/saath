import { addDays, todayISO } from "./dates";

export type Recall = { due: string; done: boolean; completedAt?: string; correct?: boolean };

export type CaseProgress = {
  completedAt: string;
  firstChoiceCorrect: boolean;
  recalls: Recall[];
};

export type SimulationState = {
  cases: Record<string, CaseProgress>;
  days: Record<string, string>;
};

export const SIM_PALETTE = [
  "#9ec0ef",
  "#7dceb0",
  "#d5dde8",
  "#a8b4c6",
  "#86b7f5",
  "#b8c4d4",
  "#6fd3ad",
  "#c3ccdc",
  "#9ed9f2",
  "#e6eaf0",
  "#74b0e8",
  "#8fb8a8",
] as const;

export const SIM_PEOPLE: Record<string, [string, string]> = {
  "hidden-fees": ["Meera", "Classmate"],
  "gold-emergency": ["Arjun", "Lender"],
  "upi-pin": ["Priya", "Caller"],
  "blank-form": ["Kabir", "Clerk"],
  "store-emi": ["You", "Shopkeeper"],
  "whatsapp-tip": ["Neel", "Group admin"],
  "fest-card": ["Renu", "Card agent"],
  "room-deposit": ["Asha", "Listing contact"],
  "insurance-missold": ["Farhan", "Agent"],
  "payday-app": ["Dev", "Loan app"],
  "two-education-loans": ["Sana", "Lenders"],
  "festival-spend": ["You", "Cousin"],
};

export const SIM_GUIDE: Record<string, string> = {
  "hidden-fees": "/guide/reading-fees",
  "gold-emergency": "/guide/emergency-fund",
  "upi-pin": "/guide/otp-pin",
  "blank-form": "/guide/before-you-sign",
  "store-emi": "/guide/what-emi",
  "whatsapp-tip": "/guide/fake-loan-apps",
  "fest-card": "/guide/credit-score",
  "room-deposit": "/guide/before-you-sign",
  "insurance-missold": "/guide/what-insurance",
  "payday-app": "/guide/job-scams",
  "two-education-loans": "/guide/prepayment",
  "festival-spend": "/guide/budget",
};

const KEY_PREFIX = "saath-simulations-v1:";

function accountKey(): string {
  try {
    return localStorage.getItem("saath-account") || "guest";
  } catch {
    return "guest";
  }
}

export function simulationStorageKey(): string {
  return `${KEY_PREFIX}${accountKey()}`;
}

export function emptySimulationState(): SimulationState {
  return { cases: {}, days: {} };
}

export function readSimulationState(): SimulationState {
  if (typeof window === "undefined") return emptySimulationState();
  try {
    const saved = JSON.parse(localStorage.getItem(simulationStorageKey()) || "{}") as Partial<SimulationState>;
    return {
      cases: saved.cases && typeof saved.cases === "object" ? saved.cases : {},
      days: saved.days && typeof saved.days === "object" ? saved.days : {},
    };
  } catch {
    return emptySimulationState();
  }
}

export function writeSimulationState(state: SimulationState): void {
  try {
    localStorage.setItem(simulationStorageKey(), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("saath-practice-updated"));
  } catch {
    // A full or blocked store must not stop practice.
  }
}

export function scenarioCount(state: SimulationState = readSimulationState()): number {
  return Object.values(state.cases).filter((item) => item?.completedAt).length;
}

export function caseOfTheDay<T extends { id: string }>(cases: T[], today = todayISO()): T | null {
  if (!cases.length) return null;
  const [year, month, day] = today.split("-").map(Number);
  const ordinal = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return cases[((ordinal % cases.length) + cases.length) % cases.length] ?? null;
}

export type DueRecall = { id: string; index: number; due: string };

export function dueRecall(state: SimulationState, today = todayISO()): DueRecall | null {
  return (
    Object.entries(state.cases)
      .flatMap(([id, progress]) =>
        (progress.recalls || []).map((recall, index) => ({ id, index, due: recall.due, done: recall.done })),
      )
      .filter((recall) => !recall.done && recall.due <= today)
      .sort((a, b) => a.due.localeCompare(b.due))[0] ?? null
  );
}

export function completeScenario(
  state: SimulationState,
  caseId: string,
  choice: number,
  best: number,
  today = todayISO(),
): SimulationState {
  const next: SimulationState = {
    cases: { ...state.cases },
    days: { ...state.days, [today]: caseId },
  };
  if (!next.cases[caseId]?.completedAt) {
    next.cases[caseId] = {
      completedAt: today,
      firstChoiceCorrect: choice === best,
      recalls: [1, 7].map((days) => ({ due: addDays(today, days), done: false })),
    };
  }
  return next;
}

export function completeRecall(
  state: SimulationState,
  caseId: string,
  recallIndex: number,
  choice: number,
  best: number,
  today = todayISO(),
): SimulationState {
  const prior = state.cases[caseId];
  if (!prior?.recalls?.[recallIndex] || prior.recalls[recallIndex].done) return state;
  const recalls = prior.recalls.map((recall, index) =>
    index === recallIndex
      ? { ...recall, done: true, completedAt: today, correct: choice === best }
      : recall,
  );
  return {
    ...state,
    cases: { ...state.cases, [caseId]: { ...prior, recalls } },
  };
}

/** Split a story into short beats for the scene walkthrough. */
export function sentenceBeats(story: string): string[] {
  const parts = story.match(/[^.!?।]+[.!?।]*/gu)?.map((part) => part.trim()).filter(Boolean);
  return parts?.length ? parts : [story];
}
