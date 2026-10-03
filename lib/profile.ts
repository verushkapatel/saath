import type { Grade } from "./catalog";
import { scoped } from "./scope";

/**
 * Who is using this phone. There is no account.
 * A student may add a nickname, and may join a school with a code and a grade. All of it stays on the phone.
 * Saath never asks for a real name, phone number or email.
 */
export type Profile = {
  id: string;
  /** Empty for a guest. Shown only on this phone. */
  nickname: string;
  /** The database that holds this profile's tracker and progress. */
  db: string;
  schoolCode: string | null;
  grade: Grade | null;
  /** Off by default. When on, only anonymous cohort numbers may leave the phone. */
  shareAggregates: boolean;
  createdAt: string;
};

const KEY = "saath-profile-v1";
const GRADE_SET = ["9", "10", "11", "12"];

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

export type JoinInput = { nickname: string; schoolCode: string; grade: string };
export type JoinError = "codeBad" | "gradeBad";

/** Checks what the student typed. A school code needs a grade with it. A nickname alone is fine. */
export function validateJoin(input: JoinInput):
  | { ok: true; nickname: string; schoolCode: string | null; grade: Grade | null }
  | { ok: false; error: JoinError } {
  const nickname = input.nickname.trim().slice(0, 20);
  const code = cleanCode(input.schoolCode);
  if (!code) return { ok: true, nickname, schoolCode: null, grade: null };
  if (code.length < 3) return { ok: false, error: "codeBad" };
  if (!GRADE_SET.includes(input.grade)) return { ok: false, error: "gradeBad" };
  return { ok: true, nickname, schoolCode: code, grade: input.grade as Grade };
}

function read(): Profile | null {
  try {
    const raw = window.localStorage.getItem(scoped(KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (!parsed?.id) return null;
    return {
      id: parsed.id,
      nickname: typeof parsed.nickname === "string" ? parsed.nickname.slice(0, 20) : "",
      db: typeof parsed.db === "string" && parsed.db ? parsed.db : "saath",
      schoolCode: typeof parsed.schoolCode === "string" && parsed.schoolCode ? cleanCode(parsed.schoolCode) : null,
      grade: GRADE_SET.includes(String(parsed.grade)) ? (String(parsed.grade) as Grade) : null,
      shareAggregates: parsed.shareAggregates === true,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : today(),
    };
  } catch {
    return null;
  }
}

function write(profile: Profile): void {
  window.localStorage.setItem(scoped(KEY), JSON.stringify(profile));
}

export function currentProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  return read();
}

/**
 * Makes the profile the first time. When an account is logged in, its name and its own database are used.
 * The school code, grade and sharing switch stay optional and are set later in Settings.
 */
export function ensureProfile(seed?: { nickname: string; db: string }): Profile {
  const existing = read();
  if (existing) {
    if (seed && (existing.db !== seed.db || !existing.nickname)) {
      const fixed = { ...existing, db: seed.db, nickname: existing.nickname || seed.nickname.slice(0, 20) };
      write(fixed);
      return fixed;
    }
    return existing;
  }
  const profile: Profile = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`,
    nickname: seed?.nickname.slice(0, 20) ?? "",
    db: seed?.db ?? "saath",
    schoolCode: null,
    grade: null,
    shareAggregates: false,
    createdAt: today(),
  };
  write(profile);
  return profile;
}

export function saveJoin(input: JoinInput): { ok: true; profile: Profile } | { ok: false; error: JoinError } {
  const checked = validateJoin(input);
  if (!checked.ok) return checked;
  const current = ensureProfile();
  const leftSchool = !checked.schoolCode;
  const next: Profile = {
    ...current,
    nickname: checked.nickname,
    schoolCode: checked.schoolCode,
    grade: checked.grade,
    // Leaving a school, or moving to another one, switches sharing off again.
    shareAggregates: leftSchool || checked.schoolCode !== current.schoolCode ? false : current.shareAggregates,
  };
  write(next);
  return { ok: true, profile: next };
}

export function setSharing(on: boolean): Profile {
  const current = ensureProfile();
  const next = { ...current, shareAggregates: Boolean(on && current.schoolCode && current.grade) };
  write(next);
  return next;
}

/**
 * Removes everything Saath saved in this browser, for every account: profiles, results, tracker and progress.
 * Used by "Forgot password" on the login screen. Nothing is kept anywhere else.
 */
export async function resetLocalData(): Promise<void> {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith("saath") && key !== "saath-lang") keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
  try {
    window.sessionStorage.clear();
  } catch {
    // Not all browsers allow it. Nothing personal is kept there.
  }
  if (typeof indexedDB === "undefined") return;
  const names = new Set<string>(["saath"]);
  if (indexedDB.databases) {
    try {
      for (const db of await indexedDB.databases()) if (db.name?.startsWith("saath")) names.add(db.name);
    } catch {
      // Fall back to the default name.
    }
  }
  await Promise.all([...names].map((name) => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  })));
}
