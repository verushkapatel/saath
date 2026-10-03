import { deriveKey, newSalt, open, seal } from "../crypto";
import { mergeProgress, normalizeProgress, type Progress } from "../progress";
import type { SyncProvider } from "./provider";

type EntryLike = { id: string; kind: "in" | "out" | "save"; category: string; amount: number; date: string };

/** The only things that sync. No documents, no photos, no words read from a paper, no loans. */
export type VaultData = { v: 1; entries: EntryLike[]; goal: number; progress: Progress };

export type Keyring = { key: CryptoKey; salt: string };

export function mergeVault(local: VaultData, remote: VaultData, today: string): VaultData {
  const entries = new Map<string, EntryLike>();
  for (const entry of remote.entries) entries.set(entry.id, entry);
  for (const entry of local.entries) entries.set(entry.id, entry);
  return {
    v: 1,
    entries: [...entries.values()].sort((a, b) => b.date.localeCompare(a.date)),
    goal: local.goal > 0 ? local.goal : remote.goal,
    progress: mergeProgress(local.progress, normalizeProgress(remote.progress), today),
  };
}

export type UnlockResult =
  | { ok: true; keyring: Keyring; first: boolean }
  | { ok: false; reason: "wrong" | "offline" };

/** Turns the secret word into a key. On a second phone it must open what the first phone saved. */
export async function unlock(provider: SyncProvider, secret: string): Promise<UnlockResult> {
  try {
    const row = await provider.pull();
    if (!row) {
      const salt = newSalt();
      return { ok: true, keyring: { key: await deriveKey(secret, salt), salt }, first: true };
    }
    const key = await deriveKey(secret, row.salt);
    const data = await open<VaultData>({ iv: row.iv, data: row.data }, key);
    if (!data) return { ok: false, reason: "wrong" };
    return { ok: true, keyring: { key, salt: row.salt }, first: false };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

/** Pull, join with what is on the phone, lock, and upload. Returns what the phone should now hold. */
export async function syncOnce(
  provider: SyncProvider,
  keyring: Keyring,
  local: VaultData,
  today: string,
): Promise<VaultData | null> {
  try {
    const row = await provider.pull();
    let merged = local;
    if (row) {
      const remote = await open<VaultData>({ iv: row.iv, data: row.data }, keyring.key);
      if (!remote) return null;
      merged = mergeVault(local, remote, today);
    }
    const sealed = await seal(merged, keyring.key);
    const saved = await provider.push({ salt: keyring.salt, iv: sealed.iv, data: sealed.data });
    return saved ? merged : null;
  } catch {
    return null;
  }
}
