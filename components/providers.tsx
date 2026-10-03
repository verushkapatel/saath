"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fill, lookup } from "@/lib/copy";
import { asset } from "@/lib/config";
import { LANGS, type Lang } from "@/lib/catalog";

type I18n = {
  lang: Lang | null;
  /** The language to use for content while one is being chosen. */
  code: Lang;
  ready: boolean;
  copyReady: boolean;
  setLang: (lang: Lang) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18n | null>(null);
const KEY = "saath-lang";

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [dict, setDict] = useState<unknown>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved && LANGS.includes(saved as Lang)) setLangState(saved as Lang);
    } catch {
      // Storage can be blocked. The language screen simply shows again.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!lang) return;
    document.documentElement.lang = lang;
    let cancel = false;
    fetch(asset(`/locales/${lang}.json`))
      .then((response) => response.json())
      .then((data) => {
        if (!cancel) setDict(data);
      })
      .catch(() => {
        if (!cancel) setDict((current: unknown) => current ?? {});
      });
    return () => {
      cancel = true;
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Still switch for this visit.
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => fill(lookup(dict, path), vars),
    [dict],
  );

  const value = useMemo<I18n>(() => ({
    lang,
    code: lang ?? "en",
    ready,
    copyReady: Boolean(dict && typeof dict === "object" && Object.keys(dict as object).length),
    setLang,
    t,
  }), [dict, lang, ready, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const value = useContext(Ctx);
  if (!value) throw new Error("i18n");
  return value;
}
