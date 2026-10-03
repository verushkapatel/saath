import { scoped } from "./scope";

/** How the app looks, sounds and behaves for one person. Saved with their account and applied before first paint. */
export type Prefs = {
  theme: "system" | "light" | "dark";
  text: "normal" | "large" | "xl";
  motion: "system" | "reduce";
  contrast: boolean;
  sound: boolean;
  haptics: boolean;
  /** Saath AI on or off. */
  ai: boolean;
  /** Allow questions to go to the online model, when one is set up. Off means answers come only from this device. */
  aiOnline: boolean;
  /** Keep the conversation between visits. */
  aiMemory: boolean;
  /** Answer with the model that runs in this browser, once it is downloaded. Nothing leaves the device. */
  aiLocal: boolean;
  /** Which local model was chosen. */
  aiModel: string;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  text: "normal",
  motion: "system",
  contrast: false,
  sound: true,
  haptics: true,
  ai: true,
  aiOnline: false,
  aiMemory: true,
  aiLocal: false,
  aiModel: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
};

/** The device-wide copy, read by the tiny script in the page head so the right theme shows before the app loads. */
export const PREFS_KEY = "saath-prefs";

const live = { sound: true, haptics: true };

export function soundOn(): boolean {
  return live.sound;
}

export function hapticsOn(): boolean {
  return live.haptics;
}

export function normalizePrefs(raw: unknown): Prefs {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Prefs>;
  const pick = <T extends string>(input: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(input as T) ? (input as T) : fallback;
  const flag = (input: unknown, fallback: boolean) => (typeof input === "boolean" ? input : fallback);
  return {
    theme: pick(value.theme, ["system", "light", "dark"] as const, DEFAULT_PREFS.theme),
    text: pick(value.text, ["normal", "large", "xl"] as const, DEFAULT_PREFS.text),
    motion: pick(value.motion, ["system", "reduce"] as const, DEFAULT_PREFS.motion),
    contrast: flag(value.contrast, DEFAULT_PREFS.contrast),
    sound: flag(value.sound, DEFAULT_PREFS.sound),
    haptics: flag(value.haptics, DEFAULT_PREFS.haptics),
    ai: flag(value.ai, DEFAULT_PREFS.ai),
    aiOnline: flag(value.aiOnline, DEFAULT_PREFS.aiOnline),
    aiMemory: flag(value.aiMemory, DEFAULT_PREFS.aiMemory),
    aiLocal: flag(value.aiLocal, DEFAULT_PREFS.aiLocal),
    aiModel: typeof value.aiModel === "string" && /^[\w.-]{3,80}$/.test(value.aiModel) ? value.aiModel : DEFAULT_PREFS.aiModel,
  };
}

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const own = window.localStorage.getItem(scoped(PREFS_KEY));
    const shared = window.localStorage.getItem(PREFS_KEY);
    return normalizePrefs(JSON.parse(own ?? shared ?? "{}"));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    const text = JSON.stringify(prefs);
    window.localStorage.setItem(scoped(PREFS_KEY), text);
    window.localStorage.setItem(PREFS_KEY, text);
  } catch {
    // Still applied for this visit.
  }
}

export function resolveTheme(theme: Prefs["theme"], systemDark: boolean): "light" | "dark" {
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

/** Puts the choices on the page. CSS reads them from attributes on <html>. */
export function applyPrefs(prefs: Prefs): void {
  live.sound = prefs.sound;
  live.haptics = prefs.haptics;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (prefs.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-text", prefs.text);
  if (prefs.motion === "reduce") root.setAttribute("data-motion", "reduce");
  else root.removeAttribute("data-motion");
  if (prefs.contrast) root.setAttribute("data-contrast", "more");
  else root.removeAttribute("data-contrast");
  const dark = resolveTheme(prefs.theme, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", dark ? "#000000" : "#ffffff"));
}

/** Runs in the page head, before React. Kept as a string so it can be inlined. */
export const PREFS_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");var r=document.documentElement;if(p.theme==="light"||p.theme==="dark")r.setAttribute("data-theme",p.theme);if(p.text)r.setAttribute("data-text",p.text);if(p.motion==="reduce")r.setAttribute("data-motion","reduce");if(p.contrast)r.setAttribute("data-contrast","more");}catch(e){}})();`;
