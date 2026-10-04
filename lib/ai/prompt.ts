import { redact } from "../redact";
import type { AiRequest } from "./types";

/**
 * The instructions every model that answers for Saath receives, on the device or on the server.
 * server/saath-ai-worker/worker.js carries an identical copy (a test checks they match),
 * because the Worker is deployed on its own and cannot import from the app.
 */
export const SYSTEM = `You are Saath AI, a warm and clear money tutor inside the Saath app, used in India by people of every age.
How to answer:
- Start with a direct answer in one or two plain sentences. Then, if it helps, give 2 to 4 short bullet points starting with "- ". End with one practical tip or a question the user can check, when useful.
- You may put a key term in **bold**. No headings, no tables, no long paragraphs. At most 170 words.
- Talk like a kind elder sibling: simple words, short sentences, no jargon without a quick explanation. Use the user's name only if given.
- Reply only in the language code given (en = English, hi = Hindi in Devanagari, mr = Marathi in Devanagari).
What you may use:
- Facts about Indian schemes, rules, limits, rates, fees, deadlines and documents must come from the PASSAGES or SCREEN text. If they are not there, say you do not have a checked figure and point to the official source or a Saath guide. Never guess a number.
- You may explain general ideas (what a budget, EMI, interest, insurance or inflation is, and how they work) in your own words.
- If you give an example with money, say it is an example and use simple round amounts.
Safety:
- Never tell the user what to buy, sell or invest in, and never predict returns. Explain how things work and what to check. You are not a licensed financial adviser; say so if asked for personal advice.
- If the user says money was stolen or an OTP was shared, tell them first to call 1930 and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords.`;

export const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example.",
  form: "Explain in plain words what this form is for, what each important part asks, and what to check before signing.",
  mistake: "The user answered a practice question wrongly. Kindly explain why the correct answer is right, in two or three lines, and give a way to remember it.",
  revise: "From the PROGRESS data, suggest what the user should revise next and why, in three short bullet points.",
  progress: "Summarise the user's PROGRESS in three encouraging, honest bullet points and name one next step.",
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
/** A sentence that sets up a made-up illustration ("for example, if you earn ₹20,000…"). */
const EXAMPLE = /\b(example|e\.g\.|for instance|say you|suppose|imagine|let's say|if you earn|if you spend)\b|उदाहरण|मान लीजिए|मान लो|समजा|उदा\./i;
/** Numbers that are facts even inside an example: rates, lakh and crore limits, years, sections and long codes. */
const FACTLIKE = /^(\s*(%|per\s?cent|percent|प्रतिशत|टक्के|lakh|lac|crore|लाख|करोड़|कोटी)|[A-Z]{1,3}\b)/;
/** Numbers the rules themselves give every model, such as the cyber-fraud helpline. */
const ALWAYS = new Set(["1930", "112", "100", "24", "7"]);

/**
 * Numbers a model wrote that appear nowhere in what it was given.
 * A model can invent a rate or an amount; when it does, the answer is thrown away and the checked answer is used instead.
 * Round amounts in a sentence that is plainly a made-up example are allowed, unless they look like a rate, a lakh or
 * crore limit, a year or a section number, because those are exactly the figures a model must not invent.
 */
export function inventedNumbers(answer: string, givenText: string): string[] {
  const given = new Set((givenText.match(NUMBER) ?? []).map((value) => value.replace(/,/g, "")));
  const out: string[] = [];
  for (const sentence of answer.split(/(?<=[.!?।])\s+|\n+/)) {
    const example = EXAMPLE.test(sentence);
    for (const match of sentence.matchAll(NUMBER)) {
      const raw = match[0];
      const value = raw.replace(/,/g, "").replace(/\.$/, "");
      // Single digits are list numbers and counting words, not facts.
      if (value.length < 2 || given.has(value) || ALWAYS.has(value)) continue;
      const after = sentence.slice((match.index ?? 0) + raw.length, (match.index ?? 0) + raw.length + 12);
      const year = /^(19|20)\d\d$/.test(value);
      if (example && !year && !FACTLIKE.test(after)) continue;
      out.push(raw);
    }
  }
  return out;
}

/** Trims what a model returns into text for the chat bubble. Bold and simple bullets are kept; the bubble renders them. */
export function tidy(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}
