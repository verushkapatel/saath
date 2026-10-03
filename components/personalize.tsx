"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { TOPICS } from "@/lib/catalog";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
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

export function Personalize({ name }: { name: string }) {
  const { t } = useI18n();
  const app = useApp();
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <main className="page bare screen" id="content">
      <div className="stack-lg" style={{ paddingTop: "var(--s-6)" }}>
        <div className="stack-sm">
          <p className="masthead">{t("personal.kicker", { name })}</p>
          <h1>{t("personal.title")}</h1>
          <p className="lead">{t("personal.lead", { max: MAX })}</p>
        </div>
        <TopicPicker value={picked} onChange={setPicked} />
        <div className="stack-sm">
          <button type="button" className="btn btn-primary" disabled={picked.length === 0} onClick={() => { tap(); void app.saveFocus(picked); window.scrollTo({ top: 0 }); }}>
            {picked.length ? t("personal.done", { count: picked.length }) : t("personal.pick")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { tap(); void app.saveFocus([]); window.scrollTo({ top: 0 }); }}>{t("personal.skip")}</button>
          <p className="faint">{t("personal.note")}</p>
        </div>
      </div>
    </main>
  );
}
