import type { Copy } from "./content-types";

/** One thing that commonly appears on a financial form, and what it means in plain words. */
export type FieldRule = {
  id: string;
  /** Lower-case words or phrases that identify the field, in any of the three languages. */
  patterns: string[];
  label: Copy;
  meaning: Copy;
  /** What to check before filling or signing. */
  tip: Copy;
};

export type FormReading = {
  /** False when the photo could not be read well enough to say anything honest about it. */
  readable: boolean;
  /** Fields recognised, in the order they appear on the paper, each with the line it was found on. */
  found: { rule: FieldRule; line: string }[];
  /** How many lines of text were read. */
  lines: number;
};

/**
 * Matches the words read from a photo against fields Saath knows.
 * It never guesses a field that is not printed on the paper, and it says so when the photo is unreadable.
 */
export function explainFormText(text: string, rules: FieldRule[]): FormReading {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => line.length > 2);
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  const words = text.split(/\s+/).filter((word) => /^\p{L}{3,}$/u.test(word)).length;
  const found: FormReading["found"] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const rule of rules) {
      if (seen.has(rule.id)) continue;
      if (rule.patterns.some((pattern) => matches(lower, pattern))) {
        seen.add(rule.id);
        found.push({ rule, line: line.slice(0, 120) });
      }
    }
  }
  // A real form photo gives dozens of words. A blurred one gives a handful of stray letters.
  const readable = letters >= 60 && words >= 10 && found.length >= 1;
  return { readable, found: readable ? found : [], lines: lines.length };
}

function matches(line: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  // The pattern must stand as its own word, in Latin or Devanagari, so "pan" does not match "company".
  return new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${escaped}([^\\p{L}\\p{M}\\p{N}]|$)`, "u").test(line);
}
