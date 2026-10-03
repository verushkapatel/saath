import { EXTRACT_MAX_CHARS } from "./config";
import { logAnonymous } from "./rate-limit";
import { extractionSchema, type Extraction } from "./schema";

export type LlmProvider = "anthropic" | "gemini" | "groq";

export function llmProvider(): LlmProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

const SHAPE = `{
  "documentType": "personal_loan" | "gold_loan" | "scheme_form" | "other",
  "lender": {"value": string|null, "unclear": boolean, "clause": string|null},
  "principal": {"value": number|null, "unclear": boolean, "clause": string|null},
  "interestRate": {"value": number|null, "unclear": boolean, "clause": string|null},
  "rateType": {"value": "flat"|"reducing"|null, "unclear": boolean, "clause": string|null},
  "tenureMonths": {"value": number|null, "unclear": boolean, "clause": string|null},
  "processingFee": {"value": number|null, "unclear": boolean, "clause": string|null},
  "otherFees": [{"name": string, "amount": number, "clause": string|null}],
  "penaltyTerms": [{"text": string, "clause": string|null, "monthlyPercent": number|null}],
  "prepaymentTerms": {"value": string|null, "unclear": boolean, "clause": string|null},
  "prepaymentAllowed": boolean|null,
  "collateral": {"value": string|null, "unclear": boolean, "clause": string|null},
  "blanksToFill": string[]
}`;

function prompt(lang: string, text: string): string {
  return [
    "Extract loan or scheme fields from this OCR text.",
    "Return JSON only, matching this shape:",
    SHAPE,
    "Rules: never guess. If a field is missing or unclear, set unclear true and value null.",
    "clause must be the exact source line. Do not calculate EMI or totals.",
    `The user language is ${lang}. The paper may mix English and that language.`,
    "Text:",
    text.slice(0, EXTRACT_MAX_CHARS),
  ].join("\n");
}

function parseModelJson(raw: string): Extraction | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const parsed = extractionSchema.omit({ sourceText: true }).safeParse(JSON.parse(raw.slice(start, end + 1)));
    if (!parsed.success) return null;
    return { ...parsed.data, sourceText: "" };
  } catch {
    return null;
  }
}

async function anthropicExtract(text: string, lang: string, signal: AbortSignal): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      temperature: 0,
      messages: [{ role: "user", content: prompt(lang, text) }],
    }),
  });
  if (!response.ok) {
    logAnonymous("anthropic-http");
    return null;
  }
  const body = (await response.json()) as { content?: { type: string; text?: string }[] };
  return body.content?.find((part) => part.type === "text")?.text ?? null;
}

async function geminiExtract(text: string, lang: string, signal: AbortSignal): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(lang, text) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  if (!response.ok) {
    logAnonymous("gemini-http");
    return null;
  }
  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function groqExtract(text: string, lang: string, signal: AbortSignal): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    signal,
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return JSON only. Never guess missing numbers. Never do arithmetic." },
        { role: "user", content: prompt(lang, text) },
      ],
    }),
  });
  if (!response.ok) {
    logAnonymous("groq-http");
    return null;
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? null;
}

export async function extractWithModel(
  text: string,
  lang: string,
  timeoutMs = 8_000,
): Promise<Extraction | null> {
  const provider = llmProvider();
  if (!provider) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const raw = provider === "anthropic"
      ? await anthropicExtract(text, lang, controller.signal)
      : provider === "groq"
        ? await groqExtract(text, lang, controller.signal)
        : await geminiExtract(text, lang, controller.signal);
    if (!raw) return null;
    const parsed = parseModelJson(raw);
    if (!parsed) {
      logAnonymous("llm-schema");
      return null;
    }
    return { ...parsed, sourceText: text };
  } catch {
    logAnonymous("llm-timeout");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
