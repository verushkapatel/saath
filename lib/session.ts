import type { Figures } from "./finance";
import type { Extraction } from "./schema";

export type SessionDoc = {
  extraction: Extraction;
  figures: Figures | null;
  sampleId: string | null;
  titleKey: string | null;
};

const KEY = "saath-doc";
let current: SessionDoc | null = null;

export function setSessionDoc(doc: SessionDoc): void {
  current = doc;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    // Storage can be full or blocked; the tab still holds the result.
  }
}

export function getSessionDoc(): SessionDoc | null {
  if (current) return current;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw) as SessionDoc;
  } catch {
    return current;
  }
  return current;
}
