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
  kn: "eng+kan",
};

export async function readPhoto(
  blob: Blob,
  lang: Lang,
  onProgress?: (state: OcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(TESS[lang], 1, {
    workerPath: asset("/tesseract/worker.min.js"),
    corePath: asset("/tesseract/tesseract-core.wasm.js"),
    langPath: asset("/tessdata"),
    logger: (message) => {
      const status = String(message.status ?? "");
      const progress = typeof message.progress === "number" ? message.progress : 0;
      if (status.includes("loading language") || status.includes("loading tesseract") || status.includes("initializing")) {
        onProgress?.({ phase: "download", progress });
      } else if (status.includes("recognizing")) {
        onProgress?.({ phase: "read", progress });
      }
    },
  });
  try {
    const result = await worker.recognize(blob);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
