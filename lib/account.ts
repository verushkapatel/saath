import { fromBase64, hasCrypto, toBase64 } from "./crypto";

/**
 * The account every user must have. It is a name and a password kept in this browser.
 * The password is stored only as a salted PBKDF2 hash. Each account has its own database,
 * so two people sharing a phone never see each other's tracker or progress.
 * It does not travel between phones. That is what the optional Supabase backup is for.
 */
export type Account = { id: string; name: string; db: string };

type Stored = Account & { salt: string; hash: string };

export type AccountError = "nameShort" | "nameTaken" | "passShort" | "passMatch" | "noUser" | "passBad" | "noCrypto";
export type AccountResult = { ok: true; account: Account } | { ok: false; error: AccountError };

const ACCOUNTS = "saath-accounts-v2";
const CURRENT = "saath-account";

const keyOf = (name: string) => name.trim().toLowerCase();

async function digest(password: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    material,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function readAll(): Stored[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCOUNTS) ?? "[]") as Stored[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item.name && item.salt && item.hash && item.db) : [];
  } catch {
    return [];
  }
}

const strip = ({ id, name, db }: Stored): Account => ({ id, name, db });

export function listAccounts(): Account[] {
  return readAll().map(strip);
}

export function currentAccount(): Account | null {
  try {
    const id = window.localStorage.getItem(CURRENT);
    const found = readAll().find((item) => item.id === id);
    return found ? strip(found) : null;
  } catch {
    return null;
  }
}

export async function createAccount(name: string, password: string, again: string): Promise<AccountResult> {
  const clean = name.trim();
  if (clean.length < 2) return { ok: false, error: "nameShort" };
  if (password.length < 6) return { ok: false, error: "passShort" };
  if (password !== again) return { ok: false, error: "passMatch" };
  if (!hasCrypto()) return { ok: false, error: "noCrypto" };
  const all = readAll();
  if (all.some((item) => keyOf(item.name) === keyOf(clean))) return { ok: false, error: "nameTaken" };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const id = crypto.randomUUID();
  // The first account on a phone keeps whatever was already saved there.
  const stored: Stored = {
    id,
    name: clean,
    db: all.length === 0 ? "saath" : `saath-${id}`,
    salt: toBase64(salt),
    hash: await digest(password, salt),
  };
  window.localStorage.setItem(ACCOUNTS, JSON.stringify([...all, stored]));
  window.localStorage.setItem(CURRENT, id);
  return { ok: true, account: strip(stored) };
}

export async function logIn(name: string, password: string): Promise<AccountResult> {
  if (!hasCrypto()) return { ok: false, error: "noCrypto" };
  const found = readAll().find((item) => keyOf(item.name) === keyOf(name));
  if (!found) return { ok: false, error: "noUser" };
  if ((await digest(password, fromBase64(found.salt))) !== found.hash) return { ok: false, error: "passBad" };
  window.localStorage.setItem(CURRENT, found.id);
  return { ok: true, account: strip(found) };
}

export function logOut(): void {
  window.localStorage.removeItem(CURRENT);
}
