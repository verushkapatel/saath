import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS, normalizePrefs, readPrefs, resolveTheme, writePrefs } from "@/lib/prefs";
import { setScope } from "@/lib/scope";

let map: Map<string, string>;

beforeEach(() => {
  map = new Map();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    },
  };
});

afterEach(() => {
  setScope(null);
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("preferences", () => {
  it("fills in defaults and drops values it does not know", () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
    const odd = normalizePrefs({ theme: "navy", text: "huge", sound: "yes", aiLocal: 1, aiModel: "../../etc" });
    expect(odd.theme).toBe("dark");
    expect(odd.text).toBe("normal");
    expect(odd.sound).toBe(true);
    expect(odd.aiLocal).toBe(false);
    expect(odd.aiModel).toBe(DEFAULT_PREFS.aiModel);
  });

  it("starts with the local model off and online answers on", () => {
    expect(DEFAULT_PREFS.aiLocal).toBe(false);
    expect(DEFAULT_PREFS.aiOnline).toBe(true);
  });

  it("follows the device until a theme is chosen", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("keeps each account's choices apart, and the last choice for the page head", () => {
    setScope("a1");
    writePrefs({ ...DEFAULT_PREFS, theme: "dark", text: "xl" });
    setScope("b2");
    writePrefs({ ...DEFAULT_PREFS, theme: "light" });
    expect(readPrefs().theme).toBe("light");
    setScope("a1");
    expect(readPrefs()).toMatchObject({ theme: "dark", text: "xl" });
    expect(JSON.parse(map.get("saath-prefs") as string).theme).toBe("light");
  });
});
