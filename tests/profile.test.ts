import { beforeEach, describe, expect, it } from "vitest";
import { checkPin, clearPin, hasPin, setPin } from "@/lib/pin";
import { cleanCode, currentProfile, ensureProfile, resetLocalData, saveJoin, setSharing, validateJoin } from "@/lib/profile";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    key: (index: number) => [...store.keys()][index] ?? null,
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage, sessionStorage: { clear: () => undefined } };
});

describe("guest profile", () => {
  it("starts as a guest with no name, no school and sharing off", () => {
    const profile = ensureProfile();
    expect(profile).toMatchObject({ nickname: "", schoolCode: null, grade: null, shareAggregates: false, db: "saath" });
    expect(ensureProfile().id).toBe(profile.id);
  });

  it("stores nothing that looks like a name, phone or email by default", () => {
    ensureProfile();
    const saved = [...store.values()].join(" ");
    expect(saved).not.toMatch(/@|\+91|\d{10}/);
  });
});

describe("joining a school", () => {
  it("accepts a nickname alone", () => {
    expect(validateJoin({ nickname: " Asha ", schoolCode: "", grade: "" })).toEqual({ ok: true, nickname: "Asha", schoolCode: null, grade: null });
  });

  it("cleans the code and needs a grade with it", () => {
    expect(cleanCode(" pune-01! ")).toBe("PUNE-01");
    expect(validateJoin({ nickname: "", schoolCode: "pune01", grade: "" })).toEqual({ ok: false, error: "gradeBad" });
    expect(validateJoin({ nickname: "", schoolCode: "p1", grade: "9" })).toEqual({ ok: false, error: "codeBad" });
    expect(validateJoin({ nickname: "", schoolCode: "pune01", grade: "10" })).toEqual({ ok: true, nickname: "", schoolCode: "PUNE01", grade: "10" });
  });

  it("keeps sharing off until the student turns it on, and off again after leaving", () => {
    const joined = saveJoin({ nickname: "Asha", schoolCode: "PUNE01", grade: "9" });
    expect(joined.ok && joined.profile.shareAggregates).toBe(false);
    expect(setSharing(true).shareAggregates).toBe(true);
    const left = saveJoin({ nickname: "Asha", schoolCode: "", grade: "" });
    expect(left.ok && left.profile.shareAggregates).toBe(false);
    expect(setSharing(true).shareAggregates).toBe(false);
  });
});

describe("PIN and reset", () => {
  it("accepts only four digits and never stores the PIN itself", async () => {
    expect(await setPin("12ab")).toBe(false);
    expect(await setPin("123")).toBe(false);
    expect(hasPin()).toBe(false);
    expect(await setPin("4821")).toBe(true);
    expect(hasPin()).toBe(true);
    expect([...store.values()].join(" ")).not.toContain("4821");
  });

  it("opens with the right PIN and not with a wrong one", async () => {
    await setPin("4821");
    expect(await checkPin("4821")).toBe(true);
    expect(await checkPin("0000")).toBe(false);
    clearPin();
    expect(hasPin()).toBe(false);
  });

  it("a forgotten PIN is reset by clearing everything on the phone, and keeps the language", async () => {
    store.set("saath-lang", "mr");
    store.set("saath-finlit-v2", "{}");
    saveJoin({ nickname: "Asha", schoolCode: "PUNE01", grade: "9" });
    await setPin("4821");
    await resetLocalData();
    expect(hasPin()).toBe(false);
    expect(currentProfile()).toBeNull();
    expect([...store.keys()]).toEqual(["saath-lang"]);
  });
});
