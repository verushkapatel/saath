import type { Lang } from "./catalog";
import type { GlossaryTerm } from "./content-types";

const SCAN_IDS = [
  "emi",
  "interest",
  "principal",
  "processing-fee",
  "prepayment",
  "penalty",
  "collateral",
  "tenure",
  "flat-rate",
  "reducing-balance",
  "repayment",
  "late-fee",
];

export function matchTerm(query: string, terms: GlossaryTerm[], lang: Lang): GlossaryTerm | undefined {
  const hay = query.toLowerCase();
  return terms.find((term) => {
    const name = term.term[lang].toLowerCase();
    return name.length > 1 && (hay.includes(name) || name.includes(hay));
  });
}

export function wrapTerms(text: string, terms: GlossaryTerm[], lang: Lang): string {
  const chosen = terms.filter((term) => SCAN_IDS.includes(term.id));
  const sorted = [...chosen].sort((a, b) => b.term[lang].length - a.term[lang].length);
  let out = text;
  for (const term of sorted) {
    const name = term.term[lang];
    if (name.length < 3 || out.includes(`[[${term.id}]]`)) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "i"), `[[${term.id}]]`);
  }
  return out;
}
