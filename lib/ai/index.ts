import type { Lang } from "../catalog";
import { AI_URL } from "../config";
import { createLocalProvider, DEFAULT_LOCAL_MODEL, webllmGenerate, type Generate } from "./local-provider";
import { createRemoteProvider } from "./remote-provider";
import { createRuleProvider } from "./rule-provider";
import type { Doc, SaathAIProvider } from "./types";

export { DEFAULT_LOCAL_MODEL, isDownloaded, LOCAL_MODELS, loadModel, modelLoaded, modelSizeBytes, removeModel, webgpuReady } from "./local-provider";
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

export type ProviderOptions = {
  docsFor: (lang: Lang) => Doc[];
  /** The person switched on the model that runs in this browser. */
  allowLocal?: boolean;
  /** Which local model, when local is on. */
  localModel?: string;
  /** The person allowed questions to go to the hosted model. */
  allowOnline: boolean;
  online?: boolean;
  /** Replaces WebLLM, for tests. */
  generate?: Generate;
};

export type ProviderMode = "local" | "online" | "device";

/** Which provider getProvider will use first, for showing in Settings and under answers. */
export function providerMode(options: Omit<ProviderOptions, "docsFor" | "generate">): ProviderMode {
  if (options.allowLocal) return "local";
  const connected = options.online ?? (typeof navigator === "undefined" ? false : navigator.onLine);
  if (options.allowOnline && onlineConfigured() && connected) return "online";
  return "device";
}

/**
 * The one place a provider is chosen. Screens call this and use whatever comes back.
 * Order: the model in this browser (if switched on), then the hosted model (if configured, allowed and connected), then rules.
 * In local mode nothing goes online, so its only fallback is the rule provider.
 */
export function getProvider(options: ProviderOptions): SaathAIProvider {
  const device = createRuleProvider(options.docsFor);
  const mode = providerMode(options);
  if (mode === "local") {
    const generate = options.generate ?? webllmGenerate(options.localModel ?? DEFAULT_LOCAL_MODEL);
    return withFallback(createLocalProvider(options.docsFor, { generate, fallback: device }), device);
  }
  if (mode === "online") return withFallback(createRemoteProvider(AI_URL, options.docsFor, fetch, device), device);
  return device;
}
