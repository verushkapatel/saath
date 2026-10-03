import { beforeEach, describe, expect, it } from "vitest";
import { createAccount, currentAccount, listAccounts, logIn, logOut } from "@/lib/account";

beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
});

describe("accounts", () => {
  it("refuses a short name, a short password and two passwords that differ", async () => {
    expect(await createAccount("A", "secret1", "secret1")).toEqual({ ok: false, error: "nameShort" });
    expect(await createAccount("Asha", "abc", "abc")).toEqual({ ok: false, error: "passShort" });
    expect(await createAccount("Asha", "secret1", "secret2")).toEqual({ ok: false, error: "passMatch" });
    expect(listAccounts()).toEqual([]);
  });

  it("creates an account, logs it in, and never stores the password itself", async () => {
    const made = await createAccount(" Asha ", "chai-samosa", "chai-samosa");
    expect(made.ok).toBe(true);
    expect(currentAccount()?.name).toBe("Asha");
    const raw = window.localStorage.getItem("saath-accounts-v2") ?? "";
    expect(raw).not.toContain("chai-samosa");
  });

  it("gives the first account the existing data and later accounts their own", async () => {
    await createAccount("Asha", "chai-samosa", "chai-samosa");
    await createAccount("Ravi", "vada-pav-12", "vada-pav-12");
    const [first, second] = listAccounts();
    expect(first.db).toBe("saath");
    expect(second.db).toBe(`saath-${second.id}`);
  });

  it("will not create the same name twice, in any letter case", async () => {
    await createAccount("Asha", "chai-samosa", "chai-samosa");
    expect(await createAccount("asha", "another-1", "another-1")).toEqual({ ok: false, error: "nameTaken" });
  });

  it("logs out, then lets only the right password back in", async () => {
    await createAccount("Asha", "chai-samosa", "chai-samosa");
    logOut();
    expect(currentAccount()).toBeNull();
    expect(await logIn("Nobody", "chai-samosa")).toEqual({ ok: false, error: "noUser" });
    expect(await logIn("asha", "wrong-one")).toEqual({ ok: false, error: "passBad" });
    expect(currentAccount()).toBeNull();
    expect((await logIn("asha", "chai-samosa")).ok).toBe(true);
    expect(currentAccount()?.name).toBe("Asha");
  });
});
