"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { tap } from "@/lib/speech";
import { usePrefs } from "./prefs";
import { useI18n } from "./providers";

const ORDER = ["system", "light", "dark"] as const;
const ICON = { system: Monitor, light: Sun, dark: Moon };

/** One button that steps through device, light and dark. The choice is saved at once. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  const Icon = ICON[prefs.theme];
  const next = ORDER[(ORDER.indexOf(prefs.theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={`${t("theme.label")}: ${t(`theme.${prefs.theme}`)}. ${t("theme.switchTo")} ${t(`theme.${next}`)}`}
      title={t(`theme.${prefs.theme}`)}
      onClick={() => { tap(); update({ theme: next }); }}
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
