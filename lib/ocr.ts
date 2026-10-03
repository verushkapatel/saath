import type { Lang } from "./catalog";
import { asset } from "./config";

export type OcrProgress = {
  phase: "download" | "read";
  progress: number;
};

const TESS: Record<Lang, string> = {
  en: "eng",
  hi: "eng+hin",
  mr: "eng+mar",
};

type Worker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;

// The reader is slow to start (it loads the language data), so it is kept for a minute after each photo.
// A second photo, or a retake, is then read in a few seconds instead of half a minute.
const KEEP_MS = 60_000;
let cached: { lang: Lang; worker: Promise<Worker>; timer: ReturnType<typeof setTimeout> | null } | null = null;
let listener: ((state: OcrProgress) => void) | undefined;

async function workerFor(lang: Lang): Promise<Worker> {
  if (cached && cached.lang === lang) {
    if (cached.timer) clearTimeout(cached.timer);
    cached.timer = null;
    return cached.worker;
  }
  if (cached) {
    const old = cached.worker;
    cached = null;
    void old.then((worker) => worker.terminate()).catch(() => undefined);
  }
  const { createWorker } = await import("tesseract.js");
  const worker = createWorker(TESS[lang], 1, {
    workerPath: asset("/tesseract/worker.min.js"),
    corePath: asset("/tesseract/tesseract-core.wasm.js"),
    langPath: asset("/tessdata"),
    logger: (message) => {
      const status = String(message.status ?? "");
      const progress = typeof message.progress === "number" ? message.progress : 0;
      if (status.includes("loading language") || status.includes("loading tesseract") || status.includes("initializing")) {
        listener?.({ phase: "download", progress });
      } else if (status.includes("recognizing")) {
        listener?.({ phase: "read", progress });
      }
    },
  });
  cached = { lang, worker, timer: null };
  worker.catch(() => {
    if (cached?.worker === worker) cached = null;
  });
  return worker;
}

function release(lang: Lang) {
  if (!cached || cached.lang !== lang) return;
  const entry = cached;
  entry.timer = setTimeout(() => {
    if (cached === entry) cached = null;
    void entry.worker.then((worker) => worker.terminate()).catch(() => undefined);
  }, KEEP_MS);
}

/** Reads the words in a photo, on this device. The photo is not kept: only the text comes back. */
export async function readPhoto(
  blob: Blob,
  lang: Lang,
  onProgress?: (state: OcrProgress) => void,
): Promise<string> {
  listener = onProgress;
  try {
    const worker = await workerFor(lang);
    const result = await worker.recognize(blob);
    return result.data.text ?? "";
  } finally {
    listener = undefined;
    release(lang);
  }
}

/**
 * Reads the cleaned-up photo first. If that reading scores below `good`, reads the original photo too and keeps
 * whichever scores higher. Cleaning helps most photos, but it can hurt some (thin Devanagari strokes, receipts on
 * a dark table), and a second reading costs only a few seconds once the reader is loaded.
 */
export async function readPhotoBest(
  original: Blob,
  cleaned: Blob,
  lang: Lang,
  score: (text: string) => number,
  good: number,
  onProgress?: (state: OcrProgress) => void,
): Promise<string> {
  const first = await readPhoto(cleaned, lang, onProgress);
  const firstScore = score(first);
  if (firstScore >= good) return first;
  const second = await readPhoto(original, lang, onProgress);
  return score(second) > firstScore ? second : first;
}
