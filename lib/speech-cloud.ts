import type { Lang } from "./catalog";
import { logAnonymous } from "./rate-limit";

export type SpeechProvider = "sarvam" | "bhashini" | "browser";

export function speechProvider(): SpeechProvider {
  if (process.env.SARVAM_API_KEY) return "sarvam";
  if (process.env.BHASHINI_API_KEY) return "bhashini";
  return "browser";
}

const SARVAM_LANG: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  kn: "kn-IN",
};

export async function speakWithProvider(text: string, lang: Lang): Promise<ArrayBuffer | null> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-subscription-key": key,
      },
      body: JSON.stringify({
        text: text.slice(0, 2000),
        target_language_code: SARVAM_LANG[lang],
      }),
    });
    if (!response.ok) {
      logAnonymous("sarvam-http");
      return null;
    }
    return await response.arrayBuffer();
  } catch {
    logAnonymous("sarvam-fail");
    return null;
  }
}
