import { hapticsOn } from "./prefs";
import type { Lang } from "./catalog";

const SPEECH: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export function canListen(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canHear(): boolean {
  if (typeof window === "undefined") return false;
  const root = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
  return Boolean(root.SpeechRecognition || root.webkitSpeechRecognition);
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 600);
  });
}

function score(voice: SpeechSynthesisVoice, code: string): number {
  const lang = voice.lang.replace("_", "-").toLowerCase();
  const want = code.toLowerCase();
  let points = 0;
  if (lang === want) points += 100;
  else if (lang.startsWith(want.slice(0, 2)) && lang.endsWith("-in")) points += 80;
  else if (lang.startsWith(want.slice(0, 2))) points += 50;
  else return -1;
  if (/natural|neural|enhanced|premium|google/i.test(voice.name)) points += 10;
  if (voice.localService) points += 5;
  return points;
}

/**
 * The best voice this phone has for the language.
 * Marathi falls back to a Hindi voice, which reads the same script, before giving up.
 */
export async function pickVoice(lang: Lang): Promise<SpeechSynthesisVoice | null> {
  if (!canListen()) return null;
  const voices = await waitForVoices();
  const tries = lang === "mr" ? [SPEECH.mr, SPEECH.hi] : [SPEECH[lang]];
  for (const code of tries) {
    const best = voices
      .map((voice) => ({ voice, points: score(voice, code) }))
      .filter((item) => item.points >= 0)
      .sort((a, b) => b.points - a.points)[0];
    if (best) return best.voice;
  }
  return null;
}

export async function playText(text: string, lang: Lang, onEnd: () => void): Promise<() => void> {
  if (!canListen()) {
    onEnd();
    return () => undefined;
  }
  const voice = await pickVoice(lang);
  if (!voice) {
    onEnd();
    return () => undefined;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.96;
  utterance.onend = () => onEnd();
  window.speechSynthesis.speak(utterance);
  return () => {
    window.speechSynthesis.cancel();
    onEnd();
  };
}

export function hear(lang: Lang): Promise<string> {
  return new Promise((resolve, reject) => {
    const root = window as Window & {
      webkitSpeechRecognition?: new () => SpeechRecognition;
      SpeechRecognition?: new () => SpeechRecognition;
    };
    const Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Ctor) {
      reject(new Error("unsupported"));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = SPEECH[lang];
    recognition.onresult = (event) => resolve(event.results[0]?.[0]?.transcript ?? "");
    recognition.onerror = () => reject(new Error("hear"));
    recognition.start();
  });
}

type SpeechRecognition = {
  lang: string;
  interimResults?: boolean;
  continuous?: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
  onresult: (event: { resultIndex?: number; results: { length?: number; [index: number]: { isFinal?: boolean; [index: number]: { transcript: string } } } }) => void;
  onerror: (event?: { error?: string }) => void;
  onend?: () => void;
};

export type DictationHandlers = {
  /** Called as words arrive: the whole text heard so far. */
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError: (reason: string) => void;
};

/**
 * Dictation for the chat: the words appear in the box while the person speaks, in English (India), Hindi or Marathi.
 * The browser's own speech service does the listening. Browsers end a listening session on their own after a short
 * pause (and report "no-speech" or "aborted"), which made the mic switch itself off; so the session is quietly restarted
 * until the person stops it, or until they have spoken and then paused for `silenceMs`. Returns a function that stops it.
 */
export function dictate(lang: Lang, handlers: DictationHandlers, options: { silenceMs?: number; maxMs?: number } = {}): () => void {
  const root = window as Window & {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  };
  const Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onError("unsupported");
    return () => undefined;
  }
  const silenceMs = options.silenceMs ?? 2200;
  const maxMs = options.maxMs ?? 60000;
  const started = Date.now();
  let finalText = "";
  let latest = "";
  let done = false;
  let quietTimer = 0;
  let current: SpeechRecognition | null = null;

  const finish = (error?: string) => {
    if (done) return;
    done = true;
    window.clearTimeout(quietTimer);
    try { current?.stop?.(); } catch { /* Already stopped. */ }
    if (error) handlers.onError(error);
    else handlers.onEnd();
  };

  const begin = () => {
    if (done) return;
    const recognition = new Ctor();
    current = recognition;
    recognition.lang = SPEECH[lang];
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    let sessionFinal = "";
    recognition.onresult = (event) => {
      let interim = "";
      const count = event.results.length ?? 0;
      sessionFinal = "";
      for (let index = 0; index < count; index += 1) {
        const result = event.results[index];
        const words = result?.[0]?.transcript ?? "";
        if (result?.isFinal) sessionFinal += words;
        else interim += words;
      }
      latest = `${finalText}${sessionFinal}${interim}`.trim();
      handlers.onText(latest, interim.length === 0);
      window.clearTimeout(quietTimer);
      if (latest) quietTimer = window.setTimeout(() => finish(), silenceMs);
    };
    recognition.onerror = (event) => {
      const reason = event?.error ?? "hear";
      // Permission problems are real; silence and the browser's own time-outs are not.
      if (reason === "not-allowed" || reason === "service-not-allowed" || reason === "audio-capture") finish(reason);
    };
    recognition.onend = () => {
      finalText = `${finalText}${sessionFinal}`;
      if (finalText && !finalText.endsWith(" ")) finalText += " ";
      if (done) return;
      if (Date.now() - started > maxMs) finish(latest ? undefined : "no-speech");
      else window.setTimeout(begin, 120);
    };
    try {
      recognition.start();
    } catch {
      window.setTimeout(begin, 300);
    }
  };
  begin();
  return () => finish();
}

/** The language a typed or spoken question is written in, so Saath AI can answer in it. Devanagari alone cannot tell Hindi from Marathi, so the current choice is kept for those. */
export function scriptLang(text: string, current: Lang): Lang {
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (devanagari > latin) return current === "en" ? "hi" : current;
  if (latin > devanagari * 2 && latin > 3) return "en";
  return current;
}

export function tap(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate || !hapticsOn()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(12);
}

/** A slightly longer buzz for a finished task or a milestone. */
export function buzz(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate || !hapticsOn()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate([14, 40, 22]);
}

export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "none"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch {
    // Fall through to copy.
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "none";
  }
}
