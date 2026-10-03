import { logAnonymous } from "./rate-limit";

export type OcrProvider = "vision" | "tesseract";

export function visionKey(): string | undefined {
  return process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;
}

export async function readWithVision(imageBase64: string, timeoutMs = 8_000): Promise<string | null> {
  const key = visionKey();
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64.replace(/^data:image\/\w+;base64,/, "") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        }],
      }),
    });
    if (!response.ok) {
      logAnonymous("vision-http");
      return null;
    }
    const body = (await response.json()) as { responses?: { fullTextAnnotation?: { text?: string } }[] };
    return body.responses?.[0]?.fullTextAnnotation?.text ?? null;
  } catch {
    logAnonymous("vision-timeout");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
