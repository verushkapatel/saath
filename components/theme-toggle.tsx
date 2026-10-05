"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { resolveTheme } from "@/lib/prefs";
import { tap } from "@/lib/speech";
import { usePrefs } from "./prefs";
import { useI18n } from "./providers";

const ORDER = ["system", "light", "dark"] as const;
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** One button that switches between light and dark, starting from what is showing now. The choice is saved at once. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  // The device setting is read after the page loads, so the first paint matches the server copy.
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(query.matches);
    const change = () => setSystemDark(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const showing = resolveTheme(prefs.theme, systemDark);
  const next = showing === "dark" ? "light" : "dark";
  const Icon = showing === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={`${t("theme.label")}: ${t(`theme.${showing}`)}. ${t("theme.switchTo")} ${t(`theme.${next}`)}`}
      title={`${t("theme.switchTo")} ${t(`theme.${next}`)}`}
      onClick={() => { tap(); update({ theme: next }); }}
      data-testid="theme-toggle"
    >
      <Icon aria-hidden size={20} />
    </button>
  );
}

/** The same choice as three labelled buttons, for Settings. */
export function ThemePicker() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  return (
    <div className="seg" role="group" aria-label={t("theme.label")}>
      {ORDER.map((item) => {
        const Icon = ICON[item];
        return (
          <button key={item} type="button" aria-pressed={prefs.theme === item} onClick={() => { tap(); update({ theme: item }); }}>
            <Icon aria-hidden size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            {t(`theme.${item}`)}
          </button>
        );
      })}
    </div>
  );
}
