import type { Lang } from "../catalog";
import type { FormsFile, GlossaryTerm, Lesson, StoriesFile } from "../content-types";
import type { JourneyFile } from "../journey";
import type { Doc } from "./types";

const strip = (text: string) => text.replace(/\[\[|\]\]/g, "").replace(/\s+/g, " ").trim();

export type Sources = {
  lessons: Lesson[];
  glossary: GlossaryTerm[];
  forms: FormsFile | null;
  journey: JourneyFile | null;
  stories: StoriesFile | null;
};

/** Turns Saath's checked content into passages the AI may answer from, in one language. */
export function buildDocs(sources: Sources, lang: Lang): Doc[] {
  const docs: Doc[] = [];
  for (const lesson of sources.lessons) {
    docs.push({
      id: lesson.id,
      kind: "guide",
      topic: lesson.topic,
      title: lesson.title[lang],
      lead: `${lesson.summary[lang]} ${strip(lesson.body[lang]).split(/(?<=[.।!?])\s+/).slice(0, 2).join(" ")}`,
      points: [...lesson.points.map((point) => point[lang]), lesson.example[lang]],
      href: `/guide/${lesson.id}`,
    });
  }
  for (const term of sources.glossary) {
    docs.push({ id: term.id, kind: "term", topic: "", title: term.term[lang], lead: term.definition[lang], points: [], href: "/guide" });
  }
  for (const form of sources.forms?.forms ?? []) {
    docs.push({
      id: form.id,
      kind: "form",
      topic: form.topic,
      title: `${form.name[lang]} (${form.alsoCalled[lang]})`,
      lead: `${form.purpose[lang]} ${form.authority[lang]}`,
      points: [...form.mistakes.map((item) => item[lang]), ...form.verify.map((item) => item[lang])],
      href: `/forms/${form.id}`,
    });
  }
  for (const episode of sources.journey?.episodes ?? []) {
    docs.push({ id: episode.id, kind: "episode", topic: episode.topic, title: episode.title[lang], lead: episode.lesson[lang], points: [], href: `/journey/${episode.id}` });
  }
  for (const story of sources.stories?.stories ?? []) {
    docs.push({ id: story.id, kind: "story", topic: story.topic, title: story.title[lang], lead: story.lesson[lang], points: [story.act[lang]], href: "/stories" });
  }
  return docs;
}

const STOP = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "what", "how", "why", "when", "who", "does", "can", "should", "with", "this", "that", "from", "have", "has",
  "was", "were", "will", "would", "about", "into", "than", "then", "them", "they", "any", "all", "much", "many", "need", "tell", "explain", "mean", "means", "please",
  "क्या", "कैसे", "क्यों", "है", "हैं", "और", "का", "की", "के", "को", "में", "से", "पर", "यह", "वह", "मुझे", "मेरा", "मेरी", "कब", "कौन", "होता", "होती", "करें", "बताएँ", "बताओ", "समझाएँ",
  "काय", "कसे", "कसा", "कशी", "का", "आहे", "आहेत", "आणि", "ची", "चा", "चे", "ला", "मध्ये", "हे", "ते", "मला", "माझा", "माझी", "कधी", "कोण", "सांगा", "म्हणजे",
]);

/** A few everyday words mapped to the words the guides use, so a plain question still finds its answer. */
const ALIASES: Record<string, string[]> = {
  loan: ["borrow", "emi", "interest"], emi: ["loan", "instalment"], fraud: ["scam", "otp"], scam: ["fraud", "otp", "fake"], cheated: ["scam", "fraud"],
  pension: ["retirement"], retire: ["retirement", "pension"], salary: ["income", "payslip", "pay"], payslip: ["salary"], sip: ["invest", "mutual"],
  shares: ["invest", "stock"], stocks: ["invest"], fd: ["deposit", "fixed"], policy: ["insurance"], claim: ["insurance"], tax: ["pan", "tds"],
  kyc: ["aadhaar", "identity"], nominee: ["nomination"], upi: ["pin", "payment"], budget: ["plan", "spending"], save: ["saving", "savings"], kids: ["children", "child"],
  कर्ज: ["लोन", "ऋण", "ब्याज"], लोन: ["कर्ज", "ऋण"], ठगी: ["धोखा", "ओटीपी"], धोखा: ["ठगी"], बीमा: ["पॉलिसी"], बचत: ["जमा"], पेंशन: ["सेवानिवृत्ति"],
  फसवणूक: ["ओटीपी"], विमा: ["पॉलिसी"], निवृत्ती: ["पेन्शन"],
};

export function tokens(text: string): string[] {
  const base = text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word.length > 1 && !STOP.has(word));
  const out = new Set<string>();
  for (const word of base) {
    out.add(word);
    // A light stem so "loans" finds "loan" and "saving" finds "save".
    if (/^[a-z]+$/.test(word) && word.length > 4) out.add(word.replace(/(ing|ies|es|s)$/, ""));
    for (const alias of ALIASES[word] ?? []) out.add(alias);
  }
  return [...out].filter(Boolean);
}

export type Hit = { doc: Doc; score: number };

/** Ranks passages by how many of the asked words they contain. Title matches count most. */
export function search(question: string, docs: Doc[], boost?: { id?: string; topic?: string }): Hit[] {
  const asked = tokens(question);
  if (asked.length === 0 && !boost?.id) return [];
  const hits: Hit[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const body = `${doc.lead} ${doc.points.join(" ")}`.toLowerCase();
    let score = 0;
    for (const word of asked) {
      if (title.includes(word)) score += 3;
      else if (doc.id.includes(word)) score += 2.5;
      else if (body.includes(word)) score += 1;
    }
    if (score > 0 && doc.kind === "guide") score += 0.5;
    if (score > 0 && boost?.topic && doc.topic === boost.topic) score += 1;
    if (boost?.id && doc.id === boost.id) score += 4;
    if (score > 0) hits.push({ doc, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}
