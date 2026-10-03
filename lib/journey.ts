import type { StageId, Topic } from "./catalog";
import type { Copy, MiniCheck } from "./content-types";
import { emiReducing } from "./finance";
import type { Progress } from "./progress";

/** What a decision does to the character's money. Amounts are rupees in her story, never the user's. */
export type Effects = { cash?: number; savings?: number; debt?: number };

export type EpisodeOption = {
  text: Copy;
  /** What happens next, told as story. */
  outcome: Copy;
  verdict: "good" | "okay" | "costly";
  effects: Effects;
};

/** The hands-on part of an episode, before the decision. */
export type Sim =
  | { kind: "inspect"; title: Copy; hint: Copy; lines: { label: Copy; value: Copy; note: Copy; flag?: boolean }[] }
  | { kind: "budget"; title: Copy; hint: Copy; income: number; needs: number }
  | { kind: "grow"; title: Copy; hint: Copy; monthly: number; rate: number; years: number[] }
  | { kind: "emi"; title: Copy; hint: Copy; principal: number; rate: number; months: number[] };

export type Episode = {
  id: string;
  stage: StageId;
  topic: Topic;
  /** The character's age in this episode. */
  age: number;
  place: string;
  title: Copy;
  /** Three or four short paragraphs. */
  story: Copy[];
  /** Something she already got wrong before the decision. Shown plainly: the story does not hide failure. */
  slip?: Copy;
  sim: Sim;
  question: Copy;
  options: EpisodeOption[];
  /** The plain explanation after the consequence. */
  lesson: Copy;
  drill: MiniCheck[];
  /** Guide ids to read more. */
  guides: string[];
};

export type Stage = { id: StageId; title: Copy };

export type JourneyFile = {
  reviewed: string;
  name: Copy;
  intro: Copy;
  stages: Stage[];
  episodes: Episode[];
};

export type Money = { cash: number; savings: number; debt: number };

export type JourneyState = {
  done: number;
  total: number;
  /** The next episode to play, whether or not it is open yet. Null when the story is complete. */
  next: Episode | null;
  /** True when the next episode can be played today. */
  open: boolean;
  /** The day the next episode opens, when it is not open yet. */
  opensOn: string | null;
  finished: boolean;
  money: Money;
  stage: Stage | null;
  age: number;
};

/** Adds up what her decisions have done so far. Savings and cash never show below zero: a shortfall becomes debt. */
export function moneyAfter(file: JourneyFile, journey: Progress["journey"]): Money {
  const money: Money = { cash: 0, savings: 0, debt: 0 };
  for (const episode of file.episodes) {
    const result = journey[episode.id];
    if (!result) continue;
    const effects = episode.options[result.choice]?.effects ?? {};
    money.cash += effects.cash ?? 0;
    money.savings += effects.savings ?? 0;
    money.debt += effects.debt ?? 0;
    if (money.savings < 0) {
      money.cash += money.savings;
      money.savings = 0;
    }
    if (money.cash < 0) {
      money.debt += -money.cash;
      money.cash = 0;
    }
    if (money.debt < 0) money.debt = 0;
  }
  return money;
}

/**
 * Where the story stands. One new episode opens per calendar day, so the story is lived over weeks.
 * An episode already finished can be replayed at any time.
 */
export function journeyState(file: JourneyFile, progress: Progress, today: string): JourneyState {
  const finishedIds = file.episodes.filter((episode) => episode.id in progress.journey);
  const next = file.episodes.find((episode) => !(episode.id in progress.journey)) ?? null;
  const lastDay = finishedIds.map((episode) => progress.journey[episode.id].at).sort().at(-1) ?? null;
  const open = Boolean(next) && (lastDay === null || lastDay < today);
  const current = next ?? file.episodes.at(-1) ?? null;
  return {
    done: finishedIds.length,
    total: file.episodes.length,
    next,
    open,
    opensOn: next && !open ? nextDay(lastDay as string) : null,
    finished: file.episodes.length > 0 && !next,
    money: moneyAfter(file, progress.journey),
    stage: current ? file.stages.find((stage) => stage.id === current.stage) ?? null : null,
    age: current?.age ?? 0,
  };
}

function nextDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** What regular saving grows to. An illustration of compounding at an assumed rate, not a promise of any return. */
export function grownValue(monthly: number, annualRate: number, years: number): { paid: number; value: number } {
  const months = Math.round(years * 12);
  const rate = annualRate / 100 / 12;
  const value = rate === 0 ? monthly * months : monthly * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
  return { paid: monthly * months, value: Math.round(value) };
}

export function loanCost(principal: number, annualRate: number, months: number): { emi: number; total: number; interest: number } {
  const emi = Math.round(emiReducing(principal, annualRate, months));
  const total = emi * months;
  return { emi, total, interest: Math.max(0, total - principal) };
}
