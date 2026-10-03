import type { Lang } from "../catalog";
import { search, type Hit } from "./knowledge";
import { buildMessages, inventedNumbers, tidy, type ChatMessage, type Passage, type Task } from "./prompt";
import { ADVICE_ASK, EMERGENCY, MIN_SCORE, RATE_ASK, VAGUE } from "./rule-provider";
import type { AiAnswer, AiRequest, AiSource, Doc, MistakeInput, SaathAIProvider } from "./types";

/**
 * Saath AI running entirely in the browser: a small open model, run on the graphics chip with WebLLM (WebGPU).
 *
 * - Nothing is downloaded until the person asks for it in Settings, and nothing is sent anywhere while it runs.
 *   The question, the passages and the answer stay on the device.
 * - It is grounded the same way as the hosted model: the closest checked passages are retrieved first, and the model
 *   is told (with the same rules as server/saath-ai-worker) to answer only from them.
 * - Questions about rates, personal advice and emergencies never reach the model. The on-device rule provider answers
 *   those, because its wording is fixed and checked.
 * - An answer that contains a number found nowhere in the passages is thrown away, and the checked answer is used.
 */

export type LocalModel = { id: string; key: "small" | "better" };

/** Qwen 2.5 Instruct is used because it is small, openly licensed (Apache 2.0) and was trained on Hindi as well as English. */
export const LOCAL_MODELS: LocalModel[] = [
  { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", key: "small" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", key: "better" },
];
export const DEFAULT_LOCAL_MODEL = LOCAL_MODELS[0].id;

export type Generate = (messages: ChatMessage[]) => Promise<string>;

type Engine = {
  chat: { completions: { create: (request: { messages: ChatMessage[]; temperature: number; max_tokens: number; stream?: false }) => Promise<{ choices: { message?: { content?: string | null } }[] }> } };
  unload: () => Promise<void>;
};
type WebLlm = typeof import("@mlc-ai/web-llm");

let engine: Engine | null = null;
let engineModel: string | null = null;
let loading: Promise<Engine> | null = null;

const webllm = (): Promise<WebLlm> => import("@mlc-ai/web-llm");

/** True when this browser can run the model: it needs WebGPU and a graphics adapter. */
export async function webgpuReady(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return false;
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

export async function isDownloaded(modelId: string): Promise<boolean> {
  try {
    const lib = await webllm();
    return await lib.hasModelInCache(modelId);
  } catch {
    return false;
  }
}

/**
 * The size of the model's weights, read from the file that lists them before anything large is downloaded.
 * Returns null when it cannot be checked, and the screen then says so instead of guessing.
 */
export async function modelSizeBytes(modelId: string): Promise<number | null> {
  try {
    const lib = await webllm();
    const record = lib.prebuiltAppConfig.model_list.find((item) => item.model_id === modelId);
    if (!record) return null;
    const base = record.model.replace(/\/$/, "");
    const response = await fetch(`${base}/resolve/main/ndarray-cache.json`);
    if (!response.ok) return null;
    const data = (await response.json()) as { records?: { nbytes?: number }[] };
    const total = (data.records ?? []).reduce((sum, item) => sum + (typeof item.nbytes === "number" ? item.nbytes : 0), 0);
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

export type LoadProgress = { ratio: number; text: string };

/**
 * Downloads the model if needed, then loads it onto the graphics chip. WebLLM keeps the files in the browser's cache,
 * so the next visit loads without a connection.
 */
export async function loadModel(modelId: string, onProgress?: (progress: LoadProgress) => void): Promise<void> {
  if (engine && engineModel === modelId) return;
  if (loading) {
    await loading;
    if (engineModel === modelId) return;
  }
  if (!(await webgpuReady())) throw new Error("no-webgpu");
  loading = (async () => {
    if (engine) {
      await engine.unload().catch(() => undefined);
      engine = null;
      engineModel = null;
    }
    const lib = await webllm();
    const created = (await lib.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => onProgress?.({ ratio: report.progress, text: report.text }),
    })) as unknown as Engine;
    engine = created;
    engineModel = modelId;
    return created;
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}

/** Frees the graphics chip and deletes the downloaded files. */
export async function removeModel(modelId: string): Promise<void> {
  if (engine && engineModel === modelId) {
    await engine.unload().catch(() => undefined);
    engine = null;
    engineModel = null;
  }
  const lib = await webllm();
  await lib.deleteModelAllInfoInCache(modelId);
}

export function modelLoaded(modelId: string): boolean {
  return engine !== null && engineModel === modelId;
}

/**
 * Generation with WebLLM. It loads a model that is already downloaded, but never starts a download by itself:
 * if the files are not on the device it fails, and Saath answers from its rules instead.
 */
export function webllmGenerate(modelId: string): Generate {
  return async (messages) => {
    if (!modelLoaded(modelId)) {
      if (!(await isDownloaded(modelId))) throw new Error("not-downloaded");
      await loadModel(modelId);
    }
    if (!engine) throw new Error("no-engine");
    const reply = await engine.chat.completions.create({ messages, temperature: 0.2, max_tokens: 380, stream: false });
    return reply.choices[0]?.message?.content ?? "";
  };
}

function sourcesOf(hits: Hit[], limit = 3): AiSource[] {
  const seen = new Set<string>();
  const out: AiSource[] = [];
  for (const hit of hits) {
    if (hit.doc.kind === "term" || seen.has(hit.doc.href)) continue;
    seen.add(hit.doc.href);
    out.push({ title: hit.doc.title, href: hit.doc.href });
    if (out.length >= limit) break;
  }
  return out;
}

const passagesOf = (hits: Hit[]): Passage[] => hits.slice(0, 5).map((hit) => ({ title: hit.doc.title, text: `${hit.doc.lead} ${hit.doc.points.join(" ")}`.slice(0, 900) }));

export function createLocalProvider(
  docsFor: (lang: Lang) => Doc[],
  options: { generate: Generate; fallback: SaathAIProvider },
): SaathAIProvider {
  const { generate, fallback } = options;

  async function run(task: Task, input: string, request: AiRequest, hits: Hit[]): Promise<AiAnswer> {
    const passages = passagesOf(hits);
    const messages = buildMessages({ task, input, request, passages });
    const text = tidy(await generate(messages));
    if (!text) throw new Error("empty");
    const given = [
      ...passages.map((item) => `${item.title} ${item.text}`),
      request.context?.text ?? "",
      request.context?.title ?? "",
      input,
      request.progress ? JSON.stringify(request.progress) : "",
      ...request.history.map((turn) => turn.text),
    ].join(" ");
    if (inventedNumbers(text, given).length > 0) throw new Error("ungrounded");
    return { text, sources: sourcesOf(hits), via: "local", grounded: hits.length > 0 };
  }

  async function answerQuestion(question: string, request: AiRequest): Promise<AiAnswer> {
    const asked = question.trim();
    // Fixed, checked wording for the questions where a wrong word does harm.
    if (EMERGENCY.test(asked) || RATE_ASK.test(asked) || ADVICE_ASK.test(asked)) return fallback.answerQuestion(question, request);
    const docs = docsFor(request.lang);
    const context = request.context;
    const vague = VAGUE.test(asked) && Boolean(context?.text);
    const previous = [...request.history].reverse().find((turn) => turn.role === "user")?.text ?? "";
    const query = vague ? `${context?.title ?? ""} ${context?.text ?? ""}` : asked.split(/\s+/).length <= 3 && previous ? `${previous} ${asked}` : asked;
    const hits = search(query, docs, context?.id ? { id: context.id } : undefined).filter((hit) => hit.score >= MIN_SCORE);
    // Nothing checked to answer from: the rules say so plainly, rather than letting the model fill the gap.
    if (hits.length === 0 && !vague) return fallback.answerQuestion(question, request);
    return run("answer", asked, request, hits);
  }

  async function explainLesson(lessonId: string, request: AiRequest): Promise<AiAnswer> {
    const hits = search(request.context?.title ?? lessonId, docsFor(request.lang), { id: lessonId });
    if (!hits.some((hit) => hit.doc.id === lessonId)) return fallback.explainLesson(lessonId, request);
    return run("lesson", lessonId, request, hits);
  }

  async function explainForm(formIdOrText: string, request: AiRequest): Promise<AiAnswer> {
    const forms = docsFor(request.lang).filter((doc) => doc.kind === "form");
    const hits = search(formIdOrText, forms, { id: formIdOrText }).filter((hit) => hit.score >= MIN_SCORE);
    if (hits.length === 0) return fallback.explainForm(formIdOrText, request);
    return run("form", formIdOrText, request, hits);
  }

  async function explainMistake(mistake: MistakeInput, request: AiRequest): Promise<AiAnswer> {
    const hits = search(`${mistake.question} ${mistake.correct}`, docsFor(request.lang).filter((doc) => doc.kind === "guide"), { topic: mistake.topic });
    return run("mistake", `Question: ${mistake.question}\nPicked: ${mistake.picked}\nCorrect: ${mistake.correct}\nWhy: ${mistake.why}`, request, hits);
  }

  return {
    id: "local",
    answerQuestion,
    explainLesson,
    explainForm,
    explainMistake,
    // These are arithmetic on the person's own record. The rules do them exactly; a model adds nothing but risk.
    recommendRevision: (request) => fallback.recommendRevision(request),
    summarizeProgress: (request) => fallback.summarizeProgress(request),
  };
}
