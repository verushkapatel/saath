import type { Lang } from "../catalog";
import { AI_URL } from "../config";
import { createRemoteProvider } from "./remote-provider";
import { createRuleProvider } from "./rule-provider";
import type { Doc, SaathAIProvider } from "./types";

export type { AiAnswer, AiContext, AiProgress, AiRequest, AiSource, AiTurn, Doc, MistakeInput, SaathAIProvider } from "./types";

/** True when a hosted model has been set up for this build. */
export function onlineConfigured(): boolean {
  return AI_URL.length > 0;
}

/** Wraps one provider with another to fall back on. If the first throws for any reason, the second answers. */
export function withFallback(primary: SaathAIProvider, fallback: SaathAIProvider): SaathAIProvider {
  const guard = <A extends unknown[], R>(first: (...args: A) => Promise<R>, second: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      try {
        return await first(...args);
      } catch {
        return second(...args);
      }
    };
  return {
    id: `${primary.id}+${fallback.id}`,
    answerQuestion: guard(primary.answerQuestion, fallback.answerQuestion),
    explainLesson: guard(primary.explainLesson, fallback.explainLesson),
    explainForm: guard(primary.explainForm, fallback.explainForm),
    explainMistake: guard(primary.explainMistake, fallback.explainMistake),
    recommendRevision: guard(primary.recommendRevision, fallback.recommendRevision),
    summarizeProgress: guard(primary.summarizeProgress, fallback.summarizeProgress),
  };
}

/**
 * The one place a provider is chosen. Screens call this and use whatever comes back.
 * Online is used only when a server address is configured, the person switched it on, and the device is connected.
 */
export function getProvider(options: { docsFor: (lang: Lang) => Doc[]; allowOnline: boolean; online?: boolean }): SaathAIProvider {
  const device = createRuleProvider(options.docsFor);
  const connected = options.online ?? (typeof navigator === "undefined" ? false : navigator.onLine);
  if (!options.allowOnline || !onlineConfigured() || !connected) return device;
  return withFallback(createRemoteProvider(AI_URL, options.docsFor), device);
}
