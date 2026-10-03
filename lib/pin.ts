import { fromBase64, hasCrypto, toBase64 } from "./crypto";

const KEY = "saath-pin";
type Stored = { salt: string; hash: string };

async function digest(pin: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 120_000, hash: "SHA-256" },
    material,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    return parsed?.salt && parsed.hash ? parsed : null;
  } catch {
    return null;
  }
}

export function hasPin(): boolean {
  return typeof window !== "undefined" && read() !== null;
}

export async function setPin(pin: string): Promise<boolean> {
  if (!hasCrypto() || !/^\d{4}$/.test(pin)) return false;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  window.localStorage.setItem(KEY, JSON.stringify({ salt: toBase64(salt), hash: await digest(pin, salt) }));
  return true;
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = read();
  if (!stored) return true;
  return (await digest(pin, fromBase64(stored.salt))) === stored.hash;
}

export function clearPin(): void {
  window.localStorage.removeItem(KEY);
}
