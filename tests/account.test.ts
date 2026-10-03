import { beforeEach, describe, expect, it } from "vitest";
import { changePassword, checkPassword, checkUsername, currentAccount, hasAccounts, logIn, logOut, removeAccount, signUp, usernameTaken, type Store } from "@/lib/account";

let store: Store & { dump: () => string };

beforeEach(() => {
  const map = new Map<string, string>();
  store = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => [...map.values()].join(" "),
  };
});

const TODAY = "2026-10-05";

describe("usernames and passwords", () => {
  it("accepts letters of any script and rejects spaces and very short names", () => {
    expect(checkUsername("asha_09")).toBeNull();
    expect(checkUsername("आशा")).toBeNull();
    expect(checkUsername("ab")).toBe("nameShort");
    expect(checkUsername("a".repeat(21))).toBe("nameLong");
    expect(checkUsername("asha patel")).toBe("nameBad");
  });

  it("rejects short and guessable passwords", () => {
    expect(checkPassword("short")).toBe("passShort");
    expect(checkPassword("aaaaaaaa")).toBe("passWeak");
    expect(checkPassword("ashapatel", "ashapatel")).toBe("passWeak");
    expect(checkPassword("river-mango-41")).toBeNull();
  });
});

describe("accounts on this device", () => {
  it("signs up, stays logged in, and never stores the password", async () => {
    const result = await signUp({ username: "Asha", password: "river-mango-41", today: TODAY }, store);
    expect(result.ok).toBe(true);
    expect(hasAccounts(store)).toBe(true);
    expect(currentAccount(store)?.display).toBe("Asha");
    expect(store.dump()).not.toContain("river-mango-41");
    expect(usernameTaken("ASHA", store)).toBe(true);
  });

  it("refuses a second account with the same name in any case", async () => {
    await signUp({ username: "Asha", password: "river-mango-41", today: TODAY }, store);
    const again = await signUp({ username: "asha", password: "another-pass-9", today: TODAY }, store);
    expect(again).toEqual({ ok: false, error: "taken" });
  });

  it("logs in with the right password only, and locks after five wrong tries", async () => {
    await signUp({ username: "Asha", password: "river-mango-41", today: TODAY }, store);
    logOut(store);
    expect(currentAccount(store)).toBeNull();
    expect(await logIn({ username: "nobody", password: "x" }, store)).toEqual({ ok: false, error: "noUser" });
    const now = 1_000_000;
    for (let i = 0; i < 4; i += 1) expect((await logIn({ username: "asha", password: "wrong-pass", now }, store)).ok).toBe(false);
    const fifth = await logIn({ username: "asha", password: "wrong-pass", now }, store);
    expect(fifth).toMatchObject({ ok: false, error: "locked" });
    // Even the right password waits until the pause is over.
    expect(await logIn({ username: "asha", password: "river-mango-41", now: now + 1000 }, store)).toMatchObject({ ok: false, error: "locked" });
    const later = await logIn({ username: "asha", password: "river-mango-41", now: now + 61_000 }, store);
    expect(later.ok).toBe(true);
    expect(currentAccount(store)?.username).toBe("asha");
  });

  it("keeps two accounts apart, each with its own database", async () => {
    const a = await signUp({ username: "Asha", password: "river-mango-41", today: TODAY }, store);
    const b = await signUp({ username: "Ravi", password: "blue-kite-2026", today: TODAY }, store);
    if (!a.ok || !b.ok) throw new Error("sign up");
    expect(a.account.db).not.toBe(b.account.db);
    expect(a.account.id).not.toBe(b.account.id);
    expect(currentAccount(store)?.username).toBe("ravi");
    removeAccount(b.account.id, store);
    expect(currentAccount(store)).toBeNull();
    expect(usernameTaken("ravi", store)).toBe(false);
    expect(usernameTaken("asha", store)).toBe(true);
  });

  it("changes the password only when the current one is right", async () => {
    const made = await signUp({ username: "Asha", password: "river-mango-41", today: TODAY }, store);
    if (!made.ok) throw new Error("sign up");
    expect(await changePassword({ id: made.account.id, current: "nope-nope-1", next: "new-pass-2026" }, store)).toEqual({ ok: false, error: "wrongPass" });
    expect(await changePassword({ id: made.account.id, current: "river-mango-41", next: "new-pass-2026" }, store)).toEqual({ ok: true });
    logOut(store);
    expect((await logIn({ username: "asha", password: "river-mango-41" }, store)).ok).toBe(false);
    expect((await logIn({ username: "asha", password: "new-pass-2026" }, store)).ok).toBe(true);
  });
});
