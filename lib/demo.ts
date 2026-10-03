import type { Lang } from "./catalog";
import { ruleExtract } from "./extract";
import { SAMPLES, type SampleId } from "./samples";
import type { Extraction } from "./schema";

export function isLiveMode(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.BHASHINI_API_KEY ||
    process.env.SARVAM_API_KEY,
  );
}

export function sampleExtraction(id: SampleId, lang: Lang): Extraction {
  const sample = SAMPLES.find((item) => item.id === id);
  return ruleExtract(sample?.text[lang] ?? sample?.text.en ?? "");
}
