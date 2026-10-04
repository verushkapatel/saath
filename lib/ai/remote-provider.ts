import type { Lang } from "../catalog";
import { redact } from "../redact";
import { search } from "./knowledge";
import { inventedNumbers, SYSTEM, tidy } from "./prompt";
import { ADVICE_ASK, EMERGENCY, FAILED_PAYMENT, GREETING, RATE_ASK, THANKS } from "./rule-provider";
import type { AiAnswer, AiRequest, Doc, MistakeInput, SaathAIProvider } from "./types";

/**
 * Talks to a hosted model through Saath's own small server (see server/saath-ai-worker).
 * The browser never holds a model key: it only knows the address of that server.
 *
 * Before anything is sent:
 *  - identity numbers (Aadhaar, PAN, phone, account) are replaced with placeholders,
 *  - the closest checked passages are attached, and the server tells the model to answer only from them,
 *  - Money Lab amounts are never included. The request type has no field for them.
 */
type Task = "answer" | "lesson" | "form" | "mistake" | "revise" | "progress";

const TIMEOUT_MS = 20_000;

export function createRemoteProvider(
  url: string,
  docsFor: (lang: Lang) => Doc[],
  fetcher: typeof fetch = fetch,
  fallback?: SaathAIProvider,
): SaathAIProvider {
  async function call(task: Task, input: string, request: AiRequest, query: string): Promise<AiAnswer> {
    const docs = docsFor(request.lang);
    const hits = search(query, docs, request.context?.id ? { id: request.context.id } : undefined).slice(0, 5);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          task,
          lang: request.lang,
          input: redact(input).slice(0, 1200),
          context: request.context
            ? { screen: request.context.screen, kind: request.context.kind, title: request.context.title, text: redact(request.context.text ?? "").slice(0, 2200) }
            : null,
          progress: request.progress,
          history: request.history.slice(-6).map((turn) => ({ role: turn.role, text: redact(turn.text).slice(0, 600) })),
          passages: hits.map((hit) => ({ title: hit.doc.title, text: `${hit.doc.lead} ${hit.doc.points.join(" ")}`.slice(0, 900) })),
        }),
      });
      if (!response.ok) throw new Error(`ai ${response.status}`);
      const data = (await response.json()) as { text?: unknown };
      if (typeof data.text !== "string" || !tidy(data.text)) throw new Error("ai empty");
      const text = tidy(data.text);
      // As on the device: an answer with a number that is in none of the passages, the screen or the question is
      // thrown away, and the checked answer is used instead. A model must not invent a rate or an amount.
      const given = [
        ...hits.map((hit) => `${hit.doc.title} ${hit.doc.lead} ${hit.doc.points.join(" ")}`),
        request.context?.text ?? "",
        request.context?.title ?? "",
        input,
        request.progress ? JSON.stringify(request.progress) : "",
        ...request.history.map((turn) => turn.text),
        SYSTEM,
      ].join(" ");
      if (inventedNumbers(text, given).length > 0) throw new Error("ungrounded");
      return {
        text,
        sources: [...hits].sort((a, b) => Number(b.doc.kind === "guide") - Number(a.doc.kind === "guide") || b.score - a.score).filter((hit) => hit.doc.kind !== "term").slice(0, 3).map((hit) => ({ title: hit.doc.title, href: hit.doc.href })),
        via: "online",
        grounded: hits.length > 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: "online",
    answerQuestion: (question, request) => {
      // The same fixed, checked wording as on the device for rates, advice, emergencies and small talk: these never go to a model.
      const asked = question.trim();
      const fixed = RATE_ASK.test(asked) || ADVICE_ASK.test(asked) || GREETING.test(asked) || THANKS.test(asked) || (EMERGENCY.test(asked) && !FAILED_PAYMENT.test(asked));
      if (fixed && fallback) return fallback.answerQuestion(question, request);
      // A short follow-up ("and the fees?") is searched together with the question before it.
      const previous = [...request.history].reverse().find((turn) => turn.role === "user")?.text ?? "";
      const query = asked.split(/\s+/).length <= 3 && previous ? `${previous} ${asked}` : asked;
      return call("answer", question, request, query);
    },
    explainLesson: (lessonId, request) => call("lesson", lessonId, request, request.context?.title ?? lessonId),
    explainForm: (formIdOrText, request) => call("form", formIdOrText, request, formIdOrText),
    explainMistake: (mistake: MistakeInput, request) =>
      call("mistake", `Question: ${mistake.question}\nPicked: ${mistake.picked}\nCorrect: ${mistake.correct}\nWhy: ${mistake.why}`, request, `${mistake.question} ${mistake.correct}`),
    recommendRevision: (request) => call("revise", "", request, request.progress?.nextUp.join(" ") ?? ""),
    summarizeProgress: (request) => call("progress", "", request, request.progress?.nextUp.join(" ") ?? ""),
  };
}
