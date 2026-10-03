"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, MessageCircleQuestion, RotateCcw, ScanLine, ShieldCheck, Wallet, WifiOff, UserRound } from "lucide-react";
import { loadJson, type Path } from "@/lib/content-types";
import { ruleExtract } from "@/lib/extract";
import { loanFigures } from "@/lib/finance";
import { riskFlags, sortFlags } from "@/lib/flags";
import { inr } from "@/lib/format";
import { figuresFor } from "@/lib/pipeline";
import { SAMPLES } from "@/lib/samples";
import { tap } from "@/lib/speech";
import { Flame } from "./illustrations";
import { useI18n } from "./providers";
import { ContentIcon, CountUp, GlossarySheet, ListenButton, TermText, useGlossary } from "./ui";

/*
  Small working models of each feature, shown in the introduction.
  They use the same code and the same sample paper as the real app, so what a visitor sees here is what they get inside.
*/

function ScanDemo() {
  const { t, code } = useI18n();
  const [stage, setStage] = useState<"paper" | "reading" | "done">("paper");
  const lines = useMemo(() => (SAMPLES[0].text[code] || SAMPLES[0].text.en).split("\n"), [code]);
  const result = useMemo(() => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    const figures = figuresFor(extraction, "2026-01-15");
    return { figures, flag: sortFlags(riskFlags(extraction, figures?.effectiveAnnualRate))[0] };
  }, []);

  useEffect(() => {
    if (stage !== "reading") return;
    const timer = window.setTimeout(() => setStage("done"), 1400);
    return () => window.clearTimeout(timer);
  }, [stage]);

  if (stage === "done" && result.figures) {
    const { figures } = result;
    const borrowed = figures.totalRepayment - figures.totalInterest;
    return (
      <div className="demo">
        <div className="stack-xs">
          <p className="muted">{t("result.heroLabel")}</p>
          <p className="hero-num md"><CountUp value={figures.totalRepayment} format={(value) => inr(value, code)} /></p>
          <p className="muted">{t("result.borrowed", { amount: inr(borrowed, code) })}</p>
        </div>
        <div className="split-bar" aria-hidden>
          <span className="part-a" style={{ flexBasis: `${(borrowed / figures.totalRepayment) * 100}%` }} />
          <span className="part-b" style={{ flexBasis: `${(figures.totalInterest / figures.totalRepayment) * 100}%` }} />
        </div>
        {result.flag && (
          <div className={`flag ${result.flag.severity}`}>
            <strong>{t(`flags.${result.flag.id}.title`)}</strong>
            {result.flag.clause && <p className="clause">{result.flag.clause}</p>}
          </div>
        )}
        <button type="button" className="link" onClick={() => { tap(); setStage("paper"); }}>
          <RotateCcw aria-hidden size={16} />
          {t("demo.again")}
        </button>
      </div>
    );
  }

  return (
    <div className="demo">
      <div className={`paper${stage === "reading" ? " reading" : ""}`} aria-hidden>
        {lines.slice(0, 7).map((line, index) => <span key={index} className={index < 2 ? "head" : undefined}>{line}</span>)}
        <i className="scanline" />
      </div>
      <button type="button" className="btn btn-secondary" disabled={stage === "reading"} onClick={() => { tap(); setStage("reading"); }}>
        <ScanLine aria-hidden size={18} />
        {stage === "reading" ? t("demo.reading") : t("demo.tapScan")}
      </button>
    </div>
  );
}

function CostDemo() {
  const { t, code } = useI18n();
  const [method, setMethod] = useState<"flat" | "reducing">("flat");
  const figures = useMemo(
    () => loanFigures({ principal: 150000, annualPercent: 18, months: 24, method, fee: 6000, startDate: "2026-01-15" }),
    [method],
  );
  return (
    <div className="demo">
      <p className="muted">{t("demo.compare")}</p>
      <div className="seg" role="group" aria-label={t("result.compareTitle")} style={{ marginTop: 0 }}>
        {(["flat", "reducing"] as const).map((item) => (
          <button key={item} type="button" aria-pressed={method === item} onClick={() => { tap(); setMethod(item); }}>
            {t(`result.${item}`)}
          </button>
        ))}
      </div>
      <div className="stack-xs" aria-live="polite">
        <p className="hero-num md"><CountUp value={figures.totalRepayment} format={(value) => inr(value, code)} /></p>
        <p className="muted">{t("demo.extra", { amount: inr(figures.totalInterest, code) })}</p>
      </div>
    </div>
  );
}

function ListenDemo({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <div className="demo">
      <ListenButton text={text} label={t("demo.hear")} />
    </div>
  );
}

const TASKS = [
  { id: "question", icon: MessageCircleQuestion },
  { id: "log", icon: Wallet },
  { id: "lesson", icon: BookOpen },
] as const;

function TasksDemo() {
  const { t } = useI18n();
  const [done, setDone] = useState<string[]>([]);
  const lit = done.length > 0;
  return (
    <div className="demo">
      <div className="row-between">
        <p className="muted" aria-live="polite">{lit ? t("demo.streakOn") : t("demo.tapTasks")}</p>
        <span className="streak-chip" aria-hidden><Flame lit={lit} /><span>{lit ? 1 : 0}</span></span>
      </div>
      <ul className="list">
        {TASKS.map(({ id, icon: Icon }) => {
          const finished = done.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                className={`item${finished ? " is-done" : ""}`}
                aria-pressed={finished}
                onClick={() => { tap(); setDone(finished ? done.filter((item) => item !== id) : [...done, id]); }}
              >
                <span className={`item-icon round${finished ? " done" : ""}`}>
                  {finished ? <Check className="draw" aria-hidden size={20} strokeWidth={3} /> : <Icon aria-hidden size={20} />}
                </span>
                <span className="item-body"><span className="item-title">{t(`task.${id}`)}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PathsDemo() {
  const { t, code } = useI18n();
  const [paths, setPaths] = useState<Path[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    loadJson<Path[]>("/content/paths.json").then(setPaths).catch(() => undefined);
  }, []);
  const chosen = paths.find((path) => path.id === open);
  return (
    <div className="demo">
      <div className="hscroll" role="group" aria-label={t("paths.title")}>
        {paths.map((path) => (
          <button key={path.id} type="button" className="path-tile" aria-pressed={open === path.id} onClick={() => { tap(); setOpen(path.id); }}>
            <ContentIcon name={path.icon} size={22} />
            <span>{path.title[code]}</span>
            <span className="faint">{t("path.steps", { done: 0, total: path.steps.length })}</span>
          </button>
        ))}
      </div>
      <p className={chosen ? undefined : "muted"} aria-live="polite">{chosen ? chosen.milestone[code] : t("demo.tapPath")}</p>
    </div>
  );
}

const SPENDS = [
  { id: "food", amount: 60 },
  { id: "travel", amount: 20 },
  { id: "phone", amount: 50 },
] as const;

function MoneyDemo() {
  const { t, code } = useI18n();
  const [spent, setSpent] = useState<Record<string, number>>({});
  const total = Object.values(spent).reduce((sum, value) => sum + value, 0);
  const max = Math.max(1, ...Object.values(spent));
  return (
    <div className="demo">
      <div className="row-between">
        <div className="stack-xs">
          <p className="muted">{t("demo.left")}</p>
          <p className="hero-num md"><CountUp value={500 - total} format={(value) => inr(value, code)} /></p>
        </div>
        {total > 0 && (
          <button type="button" className="icon-btn" aria-label={t("demo.again")} onClick={() => { tap(); setSpent({}); }}>
            <RotateCcw aria-hidden size={18} />
          </button>
        )}
      </div>
      <p className="muted">{t("demo.pocket", { amount: inr(500, code) })}</p>
      <div className="cluster">
        {SPENDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            disabled={500 - total < item.amount}
            onClick={() => { tap(); setSpent({ ...spent, [item.id]: (spent[item.id] ?? 0) + item.amount }); }}
          >
            {t(`categories.${item.id}`)} {inr(item.amount, code)}
          </button>
        ))}
      </div>
      {total > 0 && (
        <ul className="spend">
          {Object.entries(spent).sort((a, b) => b[1] - a[1]).map(([id, value]) => (
            <li key={id} className="spend-row">
              <div className="row-between"><span>{t(`categories.${id}`)}</span><strong className="num">{inr(value, code)}</strong></div>
              <div className="bar" aria-hidden><span style={{ width: `${(value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuideDemo() {
  const { t } = useI18n();
  const glossary = useGlossary();
  return (
    <div className="demo">
      <p className="quote"><TermText text={t("demo.word")} terms={glossary.terms} onTerm={glossary.show} /></p>
      <p className="muted">{t("demo.tapWord")}</p>
      <GlossarySheet term={glossary.term} onClose={glossary.close} />
    </div>
  );
}

function PrivacyDemo() {
  const { t } = useI18n();
  const rows = [
    { icon: UserRound, key: "intro.s8a" },
    { icon: WifiOff, key: "intro.s8b" },
    { icon: ShieldCheck, key: "intro.s8c" },
  ];
  return (
    <ul className="demo list">
      {rows.map(({ icon: Icon, key }) => (
        <li key={key} className="item" style={{ alignItems: "flex-start" }}>
          <span className="item-icon"><Icon aria-hidden size={20} /></span>
          <span className="item-body">{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

export function FeatureDemo({ index, text }: { index: number; text: string }) {
  switch (index) {
    case 1: return <ScanDemo />;
    case 2: return <CostDemo />;
    case 3: return <ListenDemo text={text} />;
    case 4: return <TasksDemo />;
    case 5: return <PathsDemo />;
    case 6: return <MoneyDemo />;
    case 7: return <GuideDemo />;
    default: return <PrivacyDemo />;
  }
}
