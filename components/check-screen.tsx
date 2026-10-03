"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { UNITS, type Unit } from "@/lib/catalog";
import { loadJson } from "@/lib/content-types";
import { todayISO } from "@/lib/dates";
import {
  change, checkDue, readFinLit, recommendedPath, scoreFinLit, unitRatio, unitRatios, weakestUnit, writeFinLit,
  type FinLitQuestion, type FinLitStore,
} from "@/lib/finlit";
import { share } from "@/lib/impact";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { ArtCheck } from "./illustrations";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { UnitBadge } from "./unit-badge";
import { ListenButton, PageSkeleton } from "./ui";

/** Four slim bars, one per unit. Never a grade, never a rank. */
export function UnitBars({ store, highlight }: { store: FinLitStore; highlight?: Unit }) {
  const { t } = useI18n();
  const latest = store.after ?? store.before;
  const delta = change(store);
  if (!latest) return null;
  return (
    <ul className="unit-bars">
      {UNITS.map((unit) => {
        const now = unitRatio(latest, unit);
        const was = store.after && store.before ? unitRatio(store.before, unit) : null;
        const row = latest.byUnit[unit];
        const moved = delta ? delta[unit] : null;
        return (
          <li key={unit} className={unit === highlight ? "is-start" : undefined}>
            <div className="row-between">
              <span className="unit-name">{t(`unit.${unit}`)}</span>
              <span className="faint num">{t("check.right", { correct: row.correct, total: row.total })}</span>
            </div>
            {was !== null && (
              <div className="bar thin ghost" role="img" aria-label={`${t("check.before")}: ${Math.round(was * 100)}%`}>
                <span style={{ width: `${Math.max(3, was * 100)}%` }} />
              </div>
            )}
            <div className="bar" role="img" aria-label={`${was !== null ? t("check.after") : t(`unit.${unit}`)}: ${Math.round(now * 100)}%`}>
              <span style={{ width: `${Math.max(3, now * 100)}%` }} />
            </div>
            {moved !== null && (
              <p className="faint">{moved > 0 ? t("check.up", { n: moved }) : moved === 0 ? t("check.same") : t("check.down")}</p>
            )}
            {unit === highlight && <p className="kicker accent-text">{t("check.startHere")}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function CheckScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const { profile } = useSession();
  const [questions, setQuestions] = useState<FinLitQuestion[] | null>(null);
  const [store, setStore] = useState<FinLitStore | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadJson<{ questions: FinLitQuestion[] }>("/content/finlit-check.json").then((data) => setQuestions(data.questions)).catch(() => setQuestions([]));
    setStore(readFinLit());
  }, []);

  const step = answers.length;
  const current = questions?.[step] ?? null;
  const spoken = useMemo(
    () => (current ? `${current.prompt[code]} ${current.options.map((option) => option[code]).join(". ")}` : ""),
    [current, code],
  );

  if (!questions || !store || !app.ready) return <PageSkeleton />;

  const due = checkDue(store, Object.keys(app.progress.milestones).length);

  function pick(option: number) {
    tap();
    if (!questions || !store) return;
    const next = [...answers, option];
    if (next.length < questions.length) {
      setAnswers(next);
      window.scrollTo({ top: 0 });
      return;
    }
    const result = scoreFinLit(questions, next, todayISO());
    const phase = store.before ? "after" : "before";
    const updated: FinLitStore = phase === "before" ? { ...store, before: result } : { ...store, after: result };
    writeFinLit(updated);
    setStore(updated);
    setRunning(false);
    setAnswers([]);
    window.scrollTo({ top: 0 });
    void app.finishTask("check");
    share(profile, phase === "before" ? "check-before" : "check-after", { units: unitRatios(result) });
  }

  if (running && current) {
    return (
      <div className="stack-lg">
        <div className="stack-sm">
          <div className="row-between">
            <p className="masthead">{t("check.name")} · {t("check.progress", { current: step + 1, total: questions.length })}</p>
            <ListenButton compact text={spoken} />
          </div>
          <div className="bar thin" aria-hidden><span style={{ width: `${(step / questions.length) * 100}%` }} /></div>
        </div>
        <div className="stack-sm">
          <UnitBadge unit={current.unit} />
          <h1 className="check-prompt">{current.prompt[code]}</h1>
        </div>
        <div className="stack-sm" role="group" aria-label={current.prompt[code]}>
          {current.options.map((option, index) => (
            <button key={index} type="button" className="option" onClick={() => pick(index)}>
              <span className="option-mark" aria-hidden />
              <span>{option[code]}</span>
            </button>
          ))}
        </div>
        <p className="faint">{t("check.private")}</p>
      </div>
    );
  }

  const latest = store.after ?? store.before;
  if (latest) {
    const weak = weakestUnit(latest);
    const path = app.paths.find((item) => item.id === recommendedPath(latest));
    return (
      <div className="stack-lg rise">
        <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
        <div className="stack-sm">
          <p className="masthead">{t("check.name")}</p>
          <h1>{t("check.resultTitle")}</h1>
          <p className="lead">{t("check.resultLead")}</p>
        </div>
        <hr className="rule-double" />
        <UnitBars store={store} highlight={weak} />
        <section className="card hero stack-sm">
          <p className="kicker">{t("check.startHere")}</p>
          <h2>{t(`unit.${weak}`)}</h2>
          <p className="muted">{t("check.weak")}</p>
          {path && (
            <Link className="btn btn-primary" href={`/paths/${path.id}`} onClick={tap}>
              {t("check.openPath", { path: path.title[code] })}
              <ChevronRight aria-hidden size={18} />
            </Link>
          )}
        </section>
        {due === "after" ? (
          <section className="stack-sm">
            <p className="muted">{t("check.afterLead")}</p>
            <button type="button" className="btn btn-secondary" onClick={() => { tap(); setRunning(true); }}>{t("check.again")}</button>
          </section>
        ) : !store.after ? (
          <p className="faint">{t("check.later")}</p>
        ) : null}
        <details className="fold card tight">
          <summary>
            {t("check.answers")}
            <ChevronDown aria-hidden size={20} />
          </summary>
          <ol className="stack" style={{ paddingTop: 12 }}>
            {questions.map((question) => (
              <li key={question.id} className="stack-xs">
                <UnitBadge unit={question.unit} />
                <p><strong>{question.prompt[code]}</strong></p>
                <p className="accent-text">{question.options[question.answer][code]}</p>
                <p className="muted">{question.why[code]}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>
    );
  }

  return (
    <div className="stack-lg rise">
      <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
      <ArtCheck label={t("art.check")} small />
      <div className="stack-sm">
        <p className="masthead">{t("check.name")}</p>
        <h1>{t("check.beforeTitle")}</h1>
        <p className="lead">{t("check.beforeLead")}</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => { tap(); setRunning(true); }}>{t("check.start")}</button>
      <p className="faint">{t("check.private")}</p>
    </div>
  );
}
