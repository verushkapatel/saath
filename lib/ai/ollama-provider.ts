import { search } from "./knowledge";
import { buildMessages, inventedNumbers, tidy, type Task } from "./prompt";
import type { AiAnswer, AiRequest, Doc, MistakeInput, SaathAIProvider } from "./types";
import type { Lang } from "../catalog";

const TIMEOUT_MS = 45_000;

function normalized(raw: string): string {
  const value = raw.trim().replace(/\/$/, "");
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

/** Connects directly to a user-configured local Ollama server. No key or Saath server is involved. */
export function createOllamaProvider(endpoint: string, model: string, docsFor: (lang: Lang) => Doc[]): SaathAIProvider {
  const base = normalized(endpoint);

  async function call(task: Task, input: string, request: AiRequest, query: string): Promise<AiAnswer> {
    if (!base) throw new Error("ollama endpoint");
    const docs = docsFor(request.lang);
    const hits = search(query, docs, request.context?.id ? { id: request.context.id } : undefined).slice(0, 6);
    const passages = hits.map((hit) => ({ title: hit.doc.title, text: `${hit.doc.lead} ${hit.doc.points.join(" ")}`.slice(0, 1200) }));
    const messages = buildMessages({ task, input, request, passages });
    const openAi = /\/v1$/i.test(base) || /\/v1\/chat\/completions$/i.test(base);
    const url = /\/chat\/completions$/i.test(base) ? base : openAi ? `${base}/chat/completions` : `${base}/api/chat`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(openAi
          ? { model, messages, temperature: 0.25, max_tokens: 700 }
          : { model, messages, stream: false, options: { temperature: 0.25, num_predict: 700 } }),
      });
      if (!response.ok) throw new Error(`ollama ${response.status}`);
      const data = await response.json() as { message?: { content?: string }; choices?: { message?: { content?: string } }[] };
      const text = tidy(data.message?.content ?? data.choices?.[0]?.message?.content ?? "");
      if (!text) throw new Error("ollama empty");
      const given = [input, request.context?.text ?? "", request.context?.title ?? "", ...passages.map((item) => item.text)].join(" ");
      if (inventedNumbers(text, given).length) throw new Error("ollama ungrounded");
      const guides = hits.filter((hit) => hit.doc.kind === "guide").slice(0, 3);
      return {
        text,
        sources: guides.map((hit) => ({ title: hit.doc.title, href: hit.doc.href })),
        via: "local",
        grounded: hits.length > 0,
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  return {
    id: "ollama",
    answerQuestion: (question, request) => call("answer", question, request, question),
    explainLesson: (id, request) => call("lesson", id, request, request.context?.title ?? id),
    explainForm: (input, request) => call("form", input, request, input),
    explainMistake: (mistake: MistakeInput, request) => call("mistake", `Question: ${mistake.question}\nPicked: ${mistake.picked}\nCorrect: ${mistake.correct}\nWhy: ${mistake.why}`, request, `${mistake.question} ${mistake.correct}`),
    recommendRevision: (request) => call("revise", "", request, request.progress?.nextUp.join(" ") ?? "revision"),
    summarizeProgress: (request) => call("progress", "", request, request.progress?.nextUp.join(" ") ?? "progress"),
  };
}