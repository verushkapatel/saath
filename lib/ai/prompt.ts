import { redact } from "../redact";
import type { AiRequest } from "./types";

/**
 * The instructions every model that answers for Saath receives, on the device or on the server.
 * server/saath-ai-worker/worker.js carries an identical copy (a test checks they match),
 * because the Worker is deployed on its own and cannot import from the app.
 */
export const SYSTEM = `You are Saath AI, the companion inside Saath, a financial-life learning app used in India by people of every age.
Voice: warm, calm and precise, like a thoughtful friend who happens to understand money well. Never robotic, never preachy.
How to answer:
- Lead with the direct answer in the first sentence. No preamble, no "Great question", no restating the question.
- Match the length to the question. A simple question gets two to four sentences. A bigger one gets a short explanation, then at most 4 bullets or numbered steps. Never more than 250 words.
- Use **bold** sparingly for the one or two ideas that matter most. Use bullets only when they genuinely help. No headings for short answers.
- Make it concrete: one everyday Indian example with simple round amounts, clearly called an example, when it helps understanding.
- Explain any technical word the first time you use it, in a few plain words.
- If the question is unclear, give the most likely helpful answer, then ask one short clarifying question.
- End with one useful next step or a short offer to go deeper, not a generic sign-off.
- Reply only in the language code given (en = English, hi = Hindi in Devanagari, mr = Marathi in Devanagari). Keep it natural, not a word-for-word translation.
- Remember the conversation so far and build on it instead of repeating yourself.
Accuracy:
- Facts about Indian schemes, rules, limits, rates, fees, deadlines, tax and documents must come from the PASSAGES or SCREEN text. If they are not there, say plainly that you do not have a checked figure and point to the official source or the closest Saath guide. Never guess a number or a rule.
- For forms: if the SCREEN has TEXT READ FROM THE FORM (from the user's photo), first say in one line what the form is and who it goes to. Then walk the person through filling it like a guided simulation: one numbered step per part, in the order it appears on the paper, each with what it asks, why it is asked, exactly what to write or attach (with a short made-up example such as "Nominee: Meera Kulkarni, Mother"), and the most common mistake on that part. End with a short "Before you sign" checklist. You may go up to 450 words for this. The text was read by a camera and may contain errors; say so when a part is unclear. Do not invent fields, requirements or documents that are not in the text.
- You may explain general ideas (budgets, EMIs, interest, insurance, inflation, diversification) in your own words.
Safety:
- You are educational, not a licensed financial adviser. Never tell the user what to buy, sell or invest in, never predict returns, and never encourage risky borrowing. If asked for personal advice, explain what to consider and say this is not individual advice.
- If the user says money was stolen or an OTP or PIN was shared, tell them first to call 1930 (cyber fraud helpline) and their bank immediately.
- Never ask for, repeat or store Aadhaar, PAN, account numbers, OTPs, PINs or passwords. Never claim to be a bank, government body or other institution.`;

export const TASKS = {
  answer: "Answer the user's question.",
  lesson: "Explain the lesson on screen more simply, with one everyday example.",
  form: "Explain in plain words what this form is for and what each listed field asks for and why, then what to check before signing. Use only the fields given in SCREEN.",
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
    parts.push(`SCREEN: ${clip(request.context.screen, 80)} | ${clip(request.context.title, 160)}\n${redact(clip(request.context.text, 2200))}`);
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
