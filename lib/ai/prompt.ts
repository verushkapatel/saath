import { redact } from "../redact";
import type { AiRequest } from "./types";

/**
 * The instructions every model that answers for Saath receives, on the device or on the server.
 * server/saath-ai-worker/worker.js carries an identical copy (a test checks they match),
 * because the Worker is deployed on its own and cannot import from the app.
 */
export const SYSTEM = `You are Saath AI, a patient financial-literacy tutor inside the Saath app, used in India.
Rules you must follow:
- Answer ONLY from the PASSAGES and SCREEN text given to you. If they do not contain the answer, say you do not have a checked answer and suggest reading a Saath guide. Do not use outside knowledge for facts.
- Never state an interest rate, return, price, tax rate, scheme benefit, eligibility rule, deadline or legal requirement unless that exact fact appears in the passages.
- Never tell the user what to buy, sell or invest in, and never predict returns. Explain how things work and what to check.
- If the user says money was stolen or an OTP was shared, tell them first to call 1930 and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords.
- Reply in the language code given (en = English, hi = Hindi, mr = Marathi). Plain words, short sentences, at most 150 words. No markdown headings.
- You are not a licensed financial adviser. Say so if asked for personal advice.`;

export const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example drawn from the passages.",
  form: "Explain what this form is for and what to check before signing, using only the passages.",
  mistake: "The user answered a practice question wrongly. Explain kindly why the correct answer is right.",
  revise: "From the PROGRESS data, suggest what the user should revise next and why, in three short lines.",
  progress: "Summarise the user's PROGRESS in three encouraging, honest lines and name one next step.",
} as const;

export type Task = keyof typeof TASKS;
export type Passage = { title: string; text: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** The same message layout the Worker builds, so a local model and the hosted one are asked the same way. */
export function buildMessages(input: { task: Task; input: string; request: AiRequest; passages: Passage[] }): ChatMessage[] {
  const { request } = input;
  const parts = [`LANGUAGE: ${request.lang}`, `TASK: ${TASKS[input.task]}`];
  if (request.context) {
    parts.push(`SCREEN: ${clip(request.context.screen, 80)} | ${clip(request.context.title, 160)}\n${redact(clip(request.context.text, 1500))}`);
  }
  if (request.progress) parts.push(`PROGRESS: ${clip(JSON.stringify(request.progress), 800)}`);
  parts.push(`PASSAGES:\n${input.passages.slice(0, 5).map((item, index) => `[${index + 1}] ${clip(item.title, 160)}: ${clip(item.text, 900)}`).join("\n") || "(none)"}`);
  if (input.input) parts.push(`USER: ${redact(clip(input.input, 1200))}`);
  return [
    { role: "system", content: SYSTEM },
    ...request.history.slice(-6).map((turn): ChatMessage => ({ role: turn.role === "user" ? "user" : "assistant", content: redact(clip(turn.text, 600)) })),
    { role: "user", content: parts.join("\n\n") },
  ];
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/**
 * Numbers a model wrote that appear nowhere in what it was given.
 * A small model can invent a rate or an amount; when it does, the answer is thrown away and the checked answer is used instead.
 */
export function inventedNumbers(answer: string, givenText: string): string[] {
  const given = new Set((givenText.match(NUMBER) ?? []).map((value) => value.replace(/,/g, "")));
  const out: string[] = [];
  for (const raw of answer.match(NUMBER) ?? []) {
    const value = raw.replace(/,/g, "").replace(/\.$/, "");
    // Single digits are list numbers and counting words, not facts.
    if (value.length < 2 || given.has(value)) continue;
    out.push(raw);
  }
  return out;
}

/** Trims what a model returns into plain text for the chat bubble. */
export function tidy(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim()
    .slice(0, 2000);
}
