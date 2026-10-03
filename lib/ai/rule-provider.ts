import type { Lang } from "../catalog";
import { fill } from "../copy";
import { search, type Hit } from "./knowledge";
import { PHRASES } from "./phrases";
import type { AiAnswer, AiRequest, AiSource, Doc, MistakeInput, SaathAIProvider } from "./types";

/**
 * The provider that always works: no network, no key, no cost.
 * It finds the closest passages in Saath's checked content and answers by quoting them.
 * It cannot invent a rate, a rule or a scheme, because it has no way to write a sentence that is not already in the content.
 */

export const RATE_ASK = /(current|today|latest|right now|best)\s.*(rate|return|price|nav)|(rate|return|price)\s.*(today|now|current|latest)|which\s+(bank|fd|fund|stock|share|policy|scheme|app|loan)\s.*(best|highest|cheapest|lowest)|आज\s.*(दर|भाव|रेट)|सबसे\s+(अच्छा|ज़्यादा|सस्ता)\s.*(बैंक|फंड|शेयर|पॉलिसी)|आजचा\s.*(दर|भाव)|सर्वात\s+(चांगला|जास्त|स्वस्त)\s.*(बँक|फंड|शेअर|पॉलिसी)/i;
export const ADVICE_ASK = /should i (buy|sell|invest|put|take|get)|is it (good|safe|worth) to (buy|invest)|which (stock|share|fund|crypto|coin|policy) should|where should i invest|what should i (buy|invest)|tip for|guaranteed return|क्या मुझे\s.*(खरीद|निवेश|लेना)|कहाँ निवेश|कौन सा\s.*(शेयर|फंड|खरीद)|मी\s.*(घ्यावे|गुंतवावे|खरेदी) का|कुठे गुंतव|कोणता\s.*(शेअर|फंड)/i;
export const EMERGENCY = /(lost|stolen|stole|debited|gone|deducted|hacked|scammed|cheated|shared).{0,40}(money|otp|pin|account|upi|card)|(otp|pin).{0,20}(shared|told|gave)|money.{0,20}(gone|missing|debited|stolen)|पैसा.{0,20}(कट|गया|चोरी)|ओटीपी.{0,20}(बता|दे)|पैसे.{0,20}(गेले|कापले|चोरी)|ओटीपी.{0,20}(सांगितला|दिला)/i;
/** A payment that failed or is pending is not fraud: it needs the app's complaint button or the bank, not the police. */
export const FAILED_PAYMENT = /(not (received|credited|reached)|failed|pending|नहीं (मिला|पहुँचा|आया)|फेल|मिळाले नाही|पोहोचले नाही)/i;
export const VAGUE = /^(explain|explain this|what does this mean|what is this|tell me more|more|why|why\?|help|i don't understand|समझाएँ|यह क्या है|और बताएँ|क्यों|मदद|समजावा|हे काय आहे|अजून सांगा|का|मदत)[\s.?!]*$/i;

export const MIN_SCORE = 2;
export const GREETING = /^(hi+|hello+|hey+|namaste|namaskar|good (morning|afternoon|evening)|नमस्ते|नमस्कार|हाय|हेलो)[\s.!?,]*$/i;
export const THANKS = /^(thanks?|thank you|thx|ok(ay)?|got it|धन्यवाद|शुक्रिया|ठीक है|समझ गया|समझ गई|थँक्यू|समजले|बरं)[\s.!?,]*$/i;

function sourcesOf(hits: Hit[], limit = 3): AiSource[] {
  const seen = new Set<string>();
  const out: AiSource[] = [];
  // Only passages close to the best one are named as sources, so a weak match never appears as a "source".
  const floor = (hits[0]?.score ?? 0) * 0.55;
  for (const hit of hits) {
    if (hit.score < floor) break;
    if (hit.doc.kind === "term" || seen.has(hit.doc.href + hit.doc.title)) continue;
    seen.add(hit.doc.href + hit.doc.title);
    out.push({ title: hit.doc.title, href: hit.doc.href });
    if (out.length >= limit) break;
  }
  return out;
}

function passage(doc: Doc, phrases: Record<string, string>, maxPoints = 3): string {
  const lines = [`${doc.title}. ${doc.lead}`];
  const points = doc.points.slice(0, maxPoints);
  if (points.length) lines.push("", phrases.points, ...points.map((point) => `• ${point}`));
  return lines.join("\n");
}

export function createRuleProvider(docsFor: (lang: Lang) => Doc[]): SaathAIProvider {
  const answer = (text: string, sources: AiSource[], grounded: boolean): AiAnswer => ({ text, sources, via: "device", grounded });

  function suggestions(docs: Doc[], request: AiRequest): string {
    const focus = new Set(request.progress?.focus ?? []);
    const guides = docs.filter((doc) => doc.kind === "guide");
    const picked = [...guides.filter((doc) => focus.has(doc.topic)), ...guides].slice(0, 4);
    return picked.map((doc) => `• ${doc.title}`).join("\n");
  }

  async function answerQuestion(question: string, request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const docs = docsFor(request.lang);
    const context = request.context;
    const asked = question.trim();

    if (THANKS.test(asked)) return answer(phrases.thanks, [], true);
    if (GREETING.test(asked)) {
      return answer(`${phrases.greet}\n${suggestions(docs, request)}`, [], true);
    }

    if (EMERGENCY.test(asked) && !FAILED_PAYMENT.test(asked)) {
      const hits = search("money missing fraud otp report bank", docs);
      return answer(phrases.emergency, sourcesOf(hits, 2), true);
    }

    // "Explain this" means the thing on screen. Answer from what the screen published.
    if (VAGUE.test(asked) && context?.text) {
      const hits = search(`${context.title ?? ""} ${context.text}`, docs, { id: context.id });
      return answer(`${phrases.here}: ${context.title ?? context.screen}\n\n${context.text}`, sourcesOf(hits, 2), true);
    }

    const contextual = context?.id && ["lesson", "episode", "form", "story"].includes(context.kind) ? { id: context.id } : undefined;
    // A short follow-up ("and the fees?") leans on what was asked just before.
    const previous = [...request.history].reverse().find((turn) => turn.role === "user")?.text ?? "";
    const query = asked.split(/\s+/).length <= 3 && previous ? `${previous} ${asked}` : asked;
    let hits = search(query, docs, contextual);
    if (contextual && hits[0]?.doc.id === contextual.id && hits[0].score < MIN_SCORE + 4) {
      // Only the page boost matched: the question is not really about this page.
      hits = search(query, docs);
    }
    const best = hits[0];

    if (RATE_ASK.test(asked)) {
      const body = best && best.score >= MIN_SCORE ? `\n\n${passage(best.doc, phrases)}` : "";
      return answer(`${phrases.noRates}${body}`, sourcesOf(hits), Boolean(body));
    }
    if (ADVICE_ASK.test(asked)) {
      const body = best && best.score >= MIN_SCORE ? `\n\n${passage(best.doc, phrases)}` : "";
      return answer(`${phrases.noAdvice}${body}`, sourcesOf(hits), Boolean(body));
    }

    if (!best || best.score < MIN_SCORE) {
      return answer(`${phrases.unknown}\n${suggestions(docs, request)}`, [], false);
    }

    const parts = [passage(best.doc, phrases)];
    const second = hits[1];
    if (second && second.doc.kind !== "term" && second.score >= best.score * 0.6 && second.doc.id !== best.doc.id) {
      parts.push(`${second.doc.title}. ${second.doc.lead}`);
    }
    return answer(parts.join("\n\n"), sourcesOf(hits), true);
  }

  async function explainLesson(lessonId: string, request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const doc = docsFor(request.lang).find((item) => item.kind === "guide" && item.id === lessonId);
    if (!doc) return answer(`${phrases.unknown}\n${suggestions(docsFor(request.lang), request)}`, [], false);
    return answer(passage(doc, phrases, 6), [{ title: doc.title, href: doc.href }], true);
  }

  async function explainForm(formIdOrText: string, request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const docs = docsFor(request.lang).filter((item) => item.kind === "form");
    const doc = docs.find((item) => item.id === formIdOrText) ?? search(formIdOrText, docs)[0]?.doc;
    if (!doc) return answer(phrases.formUnknown, [], false);
    return answer(`${fill(phrases.formLead, { title: doc.title })} ${doc.lead}\n\n${doc.points.slice(0, 5).map((point) => `• ${point}`).join("\n")}`, [{ title: doc.title, href: doc.href }], true);
  }

  async function explainMistake(mistake: MistakeInput, request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const hits = search(`${mistake.question} ${mistake.correct}`, docsFor(request.lang).filter((doc) => doc.kind === "guide"), { topic: mistake.topic });
    const lines = [fill(phrases.mistakeLead, { picked: mistake.picked, correct: mistake.correct }), `${phrases.mistakeWhy} ${mistake.why}`];
    if (hits[0]) lines.push(`${phrases.mistakeNext} ${hits[0].doc.title}`);
    return answer(lines.join("\n\n"), sourcesOf(hits, 1), true);
  }

  async function recommendRevision(request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const progress = request.progress;
    if (!progress || progress.nextUp.length === 0) return answer(phrases.reviseNone, [], true);
    const lines = [phrases.reviseLead, ...progress.nextUp.map((title) => `• ${title}`)];
    if (progress.focus.length) lines.push("", fill(phrases.reviseFocus, { topics: progress.focus.join(", ") }));
    if (progress.weak.length) lines.push(fill(phrases.reviseWeak, { topics: progress.weak.join(", ") }));
    const docs = docsFor(request.lang);
    const sources = progress.nextUp.map((title) => docs.find((doc) => doc.title === title)).filter((doc): doc is Doc => Boolean(doc)).map((doc) => ({ title: doc.title, href: doc.href }));
    return answer(lines.join("\n"), sources, true);
  }

  async function summarizeProgress(request: AiRequest): Promise<AiAnswer> {
    const phrases = PHRASES[request.lang];
    const progress = request.progress;
    if (!progress) return answer(phrases.reviseNone, [], true);
    const { level, xp, streak, lessonsDone, lessonsTotal, episodesDone, episodesTotal } = progress;
    const lines = [fill(phrases.summary, { level, xp, streak, lessonsDone, lessonsTotal, episodesDone, episodesTotal })];
    if (progress.stage) lines.push(fill(phrases.summaryStage, { stage: progress.stage }));
    if (progress.weak.length) lines.push(fill(phrases.reviseWeak, { topics: progress.weak.join(", ") }));
    if (progress.nextUp.length) lines.push("", phrases.summaryNext, ...progress.nextUp.slice(0, 3).map((title) => `• ${title}`));
    return answer(lines.join("\n"), [], true);
  }

  return { id: "device", answerQuestion, explainLesson, explainForm, explainMistake, recommendRevision, summarizeProgress };
}
