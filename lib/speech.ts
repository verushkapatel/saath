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
  start: () => void;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onerror: () => void;
};

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
