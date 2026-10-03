/**
 * Accounts: a username and a password.
 *
 * Where they live: in this browser. Saath has no server, so an account made on one phone does not exist on another.
 * The password is never stored. A salted PBKDF2 hash is, so the app can check a password without knowing it.
 * Moving to another device is done with a backup file (Settings, Your data).
 */
export type Account = {
  id: string;
  /** Lower-cased, used to find the account. */
  username: string;
  /** As the person typed it, used for greeting. */
  display: string;
  salt: string;
  hash: string;
  iterations: number;
  /** The IndexedDB database that holds this account's tracker and progress. */
  db: string;
  createdAt: string;
  fails: number;
  /** Epoch milliseconds until which logging in is paused after too many wrong passwords. */
  lockUntil: number;
};

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SignUpError = "nameShort" | "nameLong" | "nameBad" | "passShort" | "passWeak" | "taken" | "noCrypto";
export type LogInError = "noUser" | "wrongPass" | "locked" | "noCrypto";

const KEY = "saath-accounts-v3";
const SESSION = "saath-session-v3";
export const PASSWORD_MIN = 8;
export const ITERATIONS = 210_000;
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function cleanUsername(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

/** Letters of any script, digits, dot, dash and underscore. No spaces, so it is easy to type again. */
export function checkUsername(raw: string): "nameShort" | "nameLong" | "nameBad" | null {
  const name = cleanUsername(raw);
  const length = [...name].length;
  if (length < 3) return "nameShort";
  if (length > 20) return "nameLong";
  if (!/^[\p{L}\p{M}\p{N}._-]+$/u.test(name)) return "nameBad";
  return null;
}

export function checkPassword(password: string, username = ""): "passShort" | "passWeak" | null {
  if ([...password].length < PASSWORD_MIN) return "passShort";
  const lower = password.toLowerCase();
  // Digits alone look like a PIN, and the help text asks people not to reuse their UPI or ATM PIN.
  if (new Set(lower).size < 4 || /^\d+$/.test(password) || (username && lower === cleanUsername(username))) return "passWeak";
  return null;
}

export async function hashPassword(password: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromBase64(salt) as BufferSource, iterations, hash: "SHA-256" },
    material,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Compares two strings without stopping at the first difference. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readAll(store: Store | null): Account[] {
  if (!store) return [];
  try {
    const raw = JSON.parse(store.getItem(KEY) || "[]") as Partial<Account>[];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && typeof item.id === "string" && typeof item.username === "string" && typeof item.hash === "string" && typeof item.salt === "string")
      .map((item) => ({
        id: item.id as string,
        username: item.username as string,
        display: typeof item.display === "string" ? item.display : (item.username as string),
        salt: item.salt as string,
        hash: item.hash as string,
        iterations: typeof item.iterations === "number" ? item.iterations : ITERATIONS,
        db: typeof item.db === "string" && item.db ? item.db : `saath-u-${item.id}`,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
        fails: typeof item.fails === "number" ? item.fails : 0,
        lockUntil: typeof item.lockUntil === "number" ? item.lockUntil : 0,
      }));
  } catch {
    return [];
  }
}

function writeAll(store: Store, accounts: Account[]): void {
  store.setItem(KEY, JSON.stringify(accounts));
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

export function hasAccounts(store: Store | null = browserStore()): boolean {
  return readAll(store).length > 0;
}

export function usernameTaken(username: string, store: Store | null = browserStore()): boolean {
  const name = cleanUsername(username);
  return readAll(store).some((account) => account.username === name);
}

export async function signUp(
  input: { username: string; password: string; today: string },
  store: Store | null = browserStore(),
): Promise<{ ok: true; account: Account } | { ok: false; error: SignUpError }> {
  if (!store || typeof crypto === "undefined" || !crypto.subtle) return { ok: false, error: "noCrypto" };
  const nameError = checkUsername(input.username);
  if (nameError) return { ok: false, error: nameError };
  const passError = checkPassword(input.password, input.username);
  if (passError) return { ok: false, error: passError };
  const accounts = readAll(store);
  const username = cleanUsername(input.username);
  if (accounts.some((account) => account.username === username)) return { ok: false, error: "taken" };
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const id = newId();
  const account: Account = {
    id,
    username,
    display: input.username.normalize("NFKC").trim(),
    salt,
    hash: await hashPassword(input.password, salt),
    iterations: ITERATIONS,
    db: `saath-u-${id}`,
    createdAt: input.today,
    fails: 0,
    lockUntil: 0,
  };
  writeAll(store, [...accounts, account]);
  store.setItem(SESSION, id);
  return { ok: true, account };
}

export async function logIn(
  input: { username: string; password: string; now?: number },
  store: Store | null = browserStore(),
): Promise<{ ok: true; account: Account } | { ok: false; error: LogInError; waitSeconds?: number }> {
  if (!store || typeof crypto === "undefined" || !crypto.subtle) return { ok: false, error: "noCrypto" };
  const now = input.now ?? Date.now();
  const accounts = readAll(store);
  const username = cleanUsername(input.username);
  const account = accounts.find((item) => item.username === username);
  if (!account) return { ok: false, error: "noUser" };
  if (account.lockUntil > now) return { ok: false, error: "locked", waitSeconds: Math.ceil((account.lockUntil - now) / 1000) };
  const hash = await hashPassword(input.password, account.salt, account.iterations);
  if (!same(hash, account.hash)) {
    const fails = account.fails + 1;
    const locked = fails >= MAX_FAILS;
    writeAll(store, accounts.map((item) => (item.id === account.id ? { ...item, fails: locked ? 0 : fails, lockUntil: locked ? now + LOCK_MS : 0 } : item)));
    return locked ? { ok: false, error: "locked", waitSeconds: LOCK_MS / 1000 } : { ok: false, error: "wrongPass" };
  }
  const fresh = { ...account, fails: 0, lockUntil: 0 };
  writeAll(store, accounts.map((item) => (item.id === account.id ? fresh : item)));
  store.setItem(SESSION, account.id);
  return { ok: true, account: fresh };
}

/** The account that stayed logged in on this device, if any. */
export function currentAccount(store: Store | null = browserStore()): Account | null {
  if (!store) return null;
  const id = store.getItem(SESSION);
  if (!id) return null;
  return readAll(store).find((account) => account.id === id) ?? null;
}

export function logOut(store: Store | null = browserStore()): void {
  store?.removeItem(SESSION);
}

export async function changePassword(
  input: { id: string; current: string; next: string },
  store: Store | null = browserStore(),
): Promise<{ ok: true } | { ok: false; error: "wrongPass" | "passShort" | "passWeak" | "noCrypto" }> {
  if (!store || typeof crypto === "undefined" || !crypto.subtle) return { ok: false, error: "noCrypto" };
  const accounts = readAll(store);
  const account = accounts.find((item) => item.id === input.id);
  if (!account) return { ok: false, error: "wrongPass" };
  if (!same(await hashPassword(input.current, account.salt, account.iterations), account.hash)) return { ok: false, error: "wrongPass" };
  const passError = checkPassword(input.next, account.username);
  if (passError) return { ok: false, error: passError };
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(input.next, salt);
  writeAll(store, accounts.map((item) => (item.id === account.id ? { ...item, salt, hash, iterations: ITERATIONS } : item)));
  return { ok: true };
}

/** Removes the account record. The caller also deletes its database and its scoped values. */
export function removeAccount(id: string, store: Store | null = browserStore()): void {
  if (!store) return;
  writeAll(store, readAll(store).filter((account) => account.id !== id));
  if (store.getItem(SESSION) === id) store.removeItem(SESSION);
}

/** Deletes one account and everything it saved in this browser. Other accounts are untouched. */
export async function deleteAccountData(account: Account): Promise<void> {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.endsWith(`:${account.id}`)) keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
  removeAccount(account.id);
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(account.db);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
