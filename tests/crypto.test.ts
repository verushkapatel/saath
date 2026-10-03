import { describe, expect, it } from "vitest";
import { deriveKey, newSalt, open, seal } from "@/lib/crypto";
import { emptyProgress, markTask } from "@/lib/progress";
import type { SyncProvider, VaultRow } from "@/lib/sync/provider";
import { mergeVault, syncOnce, unlock, type VaultData } from "@/lib/sync/vault";

// Few rounds keep the tests quick. The app uses 210,000.
const ROUNDS = 1_000;
const TODAY = "2026-10-05";

function memoryProvider(): SyncProvider & { row: VaultRow | null } {
  const store: { row: VaultRow | null } = { row: null };
  return {
    get row() { return store.row; },
    set row(value) { store.row = value; },
    available: true,
    getUser: async () => ({ id: "u1", email: "a@b.in", name: null }),
    onUser: () => () => undefined,
    signInWithEmail: async () => true,
    signInWithGoogle: async () => true,
    signOut: async () => undefined,
    pull: async () => store.row,
    push: async (row) => {
      store.row = { ...row, updatedAt: new Date().toISOString() };
      return true;
    },
    deleteAccount: async () => {
      store.row = null;
      return true;
    },
  };
}

const vault = (id: string, amount: number): VaultData => ({
  v: 1,
  entries: [{ id, kind: "out", category: "food", amount, date: TODAY }],
  goal: 1000,
  progress: markTask(emptyProgress(), "log", TODAY),
});

describe("encryption", () => {
  it("gives back exactly what was sealed", async () => {
    const key = await deriveKey("chai and samosa", newSalt(), ROUNDS);
    const data = vault("e1", 40);
    const sealed = await seal(data, key);
    expect(await open(sealed, key)).toEqual(data);
  });

  it("stores nothing readable", async () => {
    const key = await deriveKey("chai and samosa", newSalt(), ROUNDS);
    const sealed = await seal({ note: "bus pass 600 rupees" }, key);
    expect(atob(sealed.data)).not.toContain("bus pass");
    expect(sealed.data).not.toContain("600");
  });

  it("uses a new nonce every time", async () => {
    const key = await deriveKey("chai and samosa", newSalt(), ROUNDS);
    const a = await seal({ n: 1 }, key);
    const b = await seal({ n: 1 }, key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("refuses the wrong secret word and changed data", async () => {
    const salt = newSalt();
    const key = await deriveKey("chai and samosa", salt, ROUNDS);
    const wrong = await deriveKey("chai and pakora", salt, ROUNDS);
    const sealed = await seal({ n: 1 }, key);
    expect(await open(sealed, wrong)).toBeNull();
    const flipped = sealed.data.slice(0, -4) + (sealed.data.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await open({ iv: sealed.iv, data: flipped }, key)).toBeNull();
  });

  it("derives the same key from the same word and salt in any language", async () => {
    const salt = newSalt();
    const sealed = await seal({ ok: true }, await deriveKey("मेरा गुप्त शब्द", salt, ROUNDS));
    expect(await open(sealed, await deriveKey("मेरा गुप्त शब्द", salt, ROUNDS))).toEqual({ ok: true });
  });
});

describe("sync", () => {
  it("joins entries from two phones by id", () => {
    const merged = mergeVault(vault("e1", 40), { ...vault("e2", 15), goal: 500 }, TODAY);
    expect(merged.entries.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
    expect(merged.goal).toBe(1000);
  });

  it("round-trips through a server that only ever sees locked text", async () => {
    const server = memoryProvider();
    const first = await unlock(server, "chai and samosa");
    expect(first.ok && first.first).toBe(true);
    if (!first.ok) return;
    await syncOnce(server, first.keyring, vault("e1", 40), TODAY);
    expect(server.row).not.toBeNull();
    expect(JSON.stringify(server.row)).not.toContain("food");

    const second = await unlock(server, "chai and samosa");
    expect(second.ok && !second.first).toBe(true);
    if (!second.ok) return;
    const merged = await syncOnce(server, second.keyring, vault("e2", 15), TODAY);
    expect(merged?.entries.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
  });

  it("does not open another phone's data with the wrong secret word", async () => {
    const server = memoryProvider();
    const first = await unlock(server, "chai and samosa");
    if (!first.ok) throw new Error("setup");
    await syncOnce(server, first.keyring, vault("e1", 40), TODAY);
    const second = await unlock(server, "something else");
    expect(second).toEqual({ ok: false, reason: "wrong" });
  });
});
