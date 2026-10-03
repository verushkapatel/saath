import { AI_ENABLED, asset, EXTRACT_TIMEOUT_MS } from "./config";
import { redact } from "./redact";
import { extractionSchema, type Extraction } from "./schema";

export async function tryAiExtract(text: string, lang: string): Promise<Extraction | null> {
  if (!AI_ENABLED) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  try {
    const response = await fetch(asset("/api/extract"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: redact(text), lang }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { extraction?: unknown };
    const parsed = extractionSchema.safeParse(body.extraction);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
