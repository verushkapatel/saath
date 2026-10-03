"use client";

import { Languages } from "lucide-react";
import { tap } from "@/lib/speech";
import { useI18n } from "./providers";

const SHORT = { en: "EN", hi: "हि", mr: "म" } as const;

/** Goes back to the language screen, from the introduction or the login screen. */
export function LangSwitch() {
  const { t, code, chooseLanguage } = useI18n();
  return (
    <button type="button" className="lang-switch" aria-label={t("land.changeHint")} title={t("land.changeHint")} onClick={() => { tap(); chooseLanguage(); window.scrollTo({ top: 0 }); }}>
      <Languages aria-hidden size={16} />
      <span aria-hidden>{SHORT[code]}</span>
    </button>
  );
}
