"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { LANGS, TOPICS } from "@/lib/catalog";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { usePrefs } from "./prefs";
import { ThemePicker } from "./theme-toggle";
import { useI18n } from "./providers";

const MAX = 5;

/** The short step after sign-up: which money areas feel hardest. It can be skipped and changed later in Settings. */
export function TopicPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div className="topic-grid" role="group" aria-label={t("personal.title")}>
      {TOPICS.map((topic) => {
        const on = value.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            className="topic"
            aria-pressed={on}
            disabled={!on && value.length >= MAX}
            onClick={() => { tap(); onChange(on ? value.filter((id) => id !== topic) : [...value, topic]); }}
            data-testid={`onboarding-topic-${topic}`}
          >
            <span>
              <strong>{t(`topics.${topic}`)}</strong>
              <span className="item-sub">{t(`topicHint.${topic}`)}</span>
            </span>
            <span className={`dot${on ? " done" : ""}`} aria-hidden>{on ? <Check size={14} strokeWidth={3} /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

const LANG_NAMES = { en: "English", hi: "हिन्दी", mr: "मराठी" } as const;

/** Steps 3 and 4 of setting up: what feels hardest, then how Saath should look. */
export function Personalize({ name }: { name: string }) {
  const { t, lang, setLang } = useI18n();
  const { prefs, update } = usePrefs();
  const app = useApp();
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<3 | 4>(3);
  const go = (next: 3 | 4) => { tap(); setStep(next); window.scrollTo({ top: 0 }); };

  return (
    <main className="page bare screen setup" id="content">
      <div className="stack-lg setup-body">
        <div className="stack-sm">
          <ol className="setup-steps" aria-hidden>
            {[1, 2, 3, 4].map((n) => <li key={n} className={n < step ? "was" : n === step ? "on" : undefined} />)}
          </ol>
          <p className="kicker">{t("setup.progress", { step, total: 4 })}</p>
          <h1>{step === 3 ? t("personal.title") : t("setup.lookTitle")}</h1>
          <p className="lead">{step === 3 ? t("personal.lead", { max: MAX }) : t("setup.lookLead", { name })}</p>
        </div>
        {step === 3 ? (
          <>
            <TopicPicker value={picked} onChange={setPicked} />
            <div className="stack-sm setup-actions">
              <button type="button" className="btn btn-primary" disabled={picked.length === 0} onClick={() => go(4)} data-testid="onboarding-topics-continue-button">
                {picked.length ? t("personal.done", { count: picked.length }) : t("personal.pick")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setPicked([]); go(4); }}>{t("personal.skip")}</button>
              <p className="faint">{t("personal.note")}</p>
            </div>
          </>
        ) : (
          <>
            <div className="card"><div className="stack">
              <div className="stack-xs">
                <p className="label">{t("theme.label")}</p>
                <ThemePicker />
              </div>
              <div className="stack-xs">
                <p className="label">{t("profile.language")}</p>
                <div className="seg" role="group" aria-label={t("profile.language")}>
                  {LANGS.map((item) => (
                    <button key={item} type="button" lang={item} aria-pressed={item === lang} onClick={() => { tap(); setLang(item); }}>{LANG_NAMES[item]}</button>
                  ))}
                </div>
              </div>
              <div className="stack-xs">
                <p className="label">{t("settings.text")}</p>
                <div className="seg" role="group" aria-label={t("settings.text")}>
                  {(["normal", "large", "xl"] as const).map((item) => (
                    <button key={item} type="button" aria-pressed={prefs.text === item} onClick={() => { tap(); update({ text: item }); }}>{t(`settings.textSize.${item}`)}</button>
                  ))}
                </div>
              </div>
            </div></div>
            <div className="stack-sm setup-actions">
              <button type="button" className="btn btn-primary" onClick={() => { tap(); void app.saveFocus(picked); window.scrollTo({ top: 0 }); }} data-testid="onboarding-finish-button">{t("setup.finish")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => go(3)}>{t("auth.back")}</button>
              <p className="faint">{t("setup.lookNote")}</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
