"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyPrefs, DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";

type PrefsState = {
  prefs: Prefs;
  update: (change: Partial<Prefs>) => void;
  /** Reads the saved choices again, after someone logs in or out. */
  reload: () => void;
};

const Ctx = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const reload = useCallback(() => {
    const saved = readPrefs();
    setPrefs(saved);
    applyPrefs(saved);
  }, []);

  useEffect(() => {
    reload();
    // Following the device: repaint the browser bar when the device switches between light and dark.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPrefs(readPrefs());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [reload]);

  const update = useCallback((change: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...change };
      writePrefs(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, update, reload }), [prefs, update, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsState {
  const value = useContext(Ctx);
  if (!value) throw new Error("prefs");
  return value;
}
