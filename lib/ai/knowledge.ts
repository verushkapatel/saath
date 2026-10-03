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
  // Words that describe the asker, not the question. "student" otherwise pulls in the guide titled "Tax, for a student".
  "student", "students", "college", "school", "kid", "teen", "rs", "rupees", "rupee", "pay", "paid", "want", "make",
  "पैसे", "पैसा", "पैशांचे", "छात्र", "विद्यार्थी", "विद्यार्थ्यासाठी",
  "is", "on", "in", "of", "to", "an", "do", "it", "my", "me", "at", "be", "by", "or", "if", "so", "as", "we", "us", "am", "no", "up", "get", "got", "did", "its",
  "the", "and", "for", "are", "but", "not", "you", "your", "what", "how", "why", "when", "who", "does", "can", "should", "with", "this", "that", "from", "have", "has",
  "was", "were", "will", "would", "about", "into", "than", "then", "them", "they", "any", "all", "much", "many", "need", "tell", "explain", "mean", "means", "please",
  "क्या", "कैसे", "क्यों", "है", "हैं", "और", "का", "की", "के", "को", "में", "से", "पर", "यह", "वह", "मुझे", "मेरा", "मेरी", "कब", "कौन", "होता", "होती", "करें", "बताएँ", "बताओ", "समझाएँ",
  "काय", "कसे", "कसा", "कशी", "का", "आहे", "आहेत", "आणि", "ची", "चा", "चे", "ला", "मध्ये", "हे", "ते", "मला", "माझा", "माझी", "कधी", "कोण", "सांगा", "म्हणजे",
]);

/** A few everyday words mapped to the words the guides use, so a plain question still finds its answer. */
const ALIASES: Record<string, string[]> = {
  loan: ["borrow", "emi", "interest"], emi: ["loan", "instalment"], fraud: ["scam", "otp"], scam: ["fraud", "otp", "fake"], cheated: ["scam", "fraud"],
  pension: ["retirement"], retire: ["retirement", "pension"], salary: ["income", "payslip"], payslip: ["salary"], sip: ["invest", "mutual"],
  shares: ["invest", "stock"], stocks: ["invest"], fd: ["deposit", "fixed"], policy: ["insurance"], claim: ["insurance"], tax: ["pan", "tds"],
  kyc: ["aadhaar", "identity"], nominee: ["nomination"], upi: ["pin", "payment"], budget: ["plan", "spending"], save: ["saving", "savings"], kids: ["children", "child"],
  कर्ज: ["लोन", "ऋण", "ब्याज"], लोन: ["कर्ज", "ऋण"], ठगी: ["धोखा", "ओटीपी"], धोखा: ["ठगी"], बीमा: ["पॉलिसी"], बचत: ["जमा"], पेंशन: ["सेवानिवृत्ति"],
  फसवणूक: ["ओटीपी"], विमा: ["पॉलिसी"], निवृत्ती: ["पेन्शन"],
  // Borrowed words people type in Devanagari, mapped to the words the guides use.
  // Verbs for "save" in Hindi and Marathi point at the saving guides.
  बचाएँ: ["बचत"], बचाना: ["बचत"], बचाऊँ: ["बचत"], बचाएं: ["बचत"], वाचवायचे: ["बचत"], वाचवू: ["बचत"], वाचवा: ["बचत"], वाचवावे: ["बचत"],
  बजेट: ["अंदाजपत्रक", "बजट"], बजट: ["योजना", "budget"], सेव्हिंग: ["बचत"], सेविंग: ["बचत"], टॅक्स: ["कर"], टैक्स: ["कर"],
  इन्शुरन्स: ["विमा"], इंश्योरेंस: ["बीमा"], ईएमआय: ["emi", "हप्ता"], ईएमआई: ["emi", "किस्त"],
  nps: ["pension", "retirement"], epf: ["provident", "pension"], ppf: ["provident", "savings"], mutual: ["sip", "invest"],
  saving: ["save", "savings"], savings: ["save", "saving"], money: ["budget"],
};

/** The asked words (weight 1) and the words they stand for (weight 0.5), so an alias never outranks what was typed. */
export function weightedTokens(text: string): Map<string, number> {
  const base = text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word.length > 1 && !STOP.has(word));
  const out = new Map<string, number>();
  const put = (word: string, weight: number) => {
    if (word && (out.get(word) ?? 0) < weight) out.set(word, weight);
  };
  for (const word of base) {
    put(word, 1);
    // A light stem so "loans" finds "loan" and "saving" finds "save".
    if (/^[a-z]+$/.test(word) && word.length > 4) put(word.replace(/(ing|ies|es|s)$/, ""), 1);
    for (const alias of ALIASES[word] ?? []) put(alias, 0.5);
  }
  return out;
}

export function tokens(text: string): string[] {
  return [...weightedTokens(text).keys()];
}

export type Hit = { doc: Doc; score: number };

/** The words of a passage, split the same way as a question. Worked out once per passage. */
const wordsCache = new WeakMap<Doc, { title: Set<string>; id: Set<string>; body: Set<string> }>();
function wordsOf(doc: Doc) {
  let hit = wordsCache.get(doc);
  if (!hit) {
    const split = (text: string) => new Set(text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word.length > 1));
    hit = { title: split(doc.title), id: split(doc.id), body: split(`${doc.lead} ${doc.points.join(" ")}`) };
    wordsCache.set(doc, hit);
  }
  return hit;
}

/** Two asked words side by side ("mutual fund", "credit score"), for matching as a phrase. */
function pairsOf(text: string): string[] {
  const words = text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word.length > 1 && !STOP.has(word));
  return words.slice(1).map((word, index) => `${words[index]} ${word}`);
}

/** A whole-word match, or a shared beginning of five letters or more ("saving" and "savings"). Never a fragment inside a word. */
function has(words: Set<string>, word: string): boolean {
  if (words.has(word)) return true;
  if (word.length < 5) return false;
  for (const candidate of words) {
    if (candidate.length >= 5 && (candidate.startsWith(word) || word.startsWith(candidate))) return true;
  }
  return false;
}

/** Ranks passages by how many of the asked words they contain. Title matches count most. */
export function search(question: string, docs: Doc[], boost?: { id?: string; topic?: string }): Hit[] {
  const asked = weightedTokens(question);
  if (asked.size === 0 && !boost?.id) return [];
  const pairs = pairsOf(question);
  const hits: Hit[] = [];
  for (const doc of docs) {
    const words = wordsOf(doc);
    let score = 0;
    for (const [word, weight] of asked) {
      if (has(words.title, word)) score += 3 * weight;
      else if (has(words.id, word)) score += 2.5 * weight;
      else if (has(words.body, word)) score += weight;
    }
    // A question that names a guide's topic ("tax", "saving", "insurance") leans toward that topic's guides.
    if (doc.topic) {
      for (const [word, weight] of asked) if (has(new Set([doc.topic]), word)) score += 1.5 * weight;
    }
    // A phrase found whole counts far more than its two words found apart: "mutual fund" is not "emergency fund".
    if (pairs.length) {
      const title = doc.title.toLowerCase();
      const body = `${doc.lead} ${doc.points.join(" ")}`.toLowerCase();
      for (const pair of pairs) {
        if (title.includes(pair)) score += 4;
        else if (body.includes(pair)) score += 2.5;
      }
    }
    if (score > 0 && doc.kind === "guide") score += 0.5;
    if (score > 0 && boost?.topic && doc.topic === boost.topic) score += 1;
    if (boost?.id && doc.id === boost.id) score += 4;
    if (score > 0) hits.push({ doc, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}
