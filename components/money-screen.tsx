"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Sparkles, Target } from "lucide-react";
import { isoWeek, todayISO } from "@/lib/dates";
import { loadJson, type CaseStudy } from "@/lib/content-types";
import { dayLabel, groupAmount, inr, monthLabel, parseAmountInput } from "@/lib/format";
import { insightFor, loggedDays, weekSummary } from "@/lib/insights";
import { tap } from "@/lib/speech";
import { entriesToCsv, exportBackup, type Backup, type Entry, type Loan } from "@/lib/storage";
import { useApp } from "./app-state";
import { ArtJar } from "./illustrations";
import { NumPad } from "./numpad";
import { useI18n } from "./providers";
import { CountUp, ListenButton, PageSkeleton, Ring, Sheet } from "./ui";

const GROUPS: Record<Entry["kind"], string[]> = {
  out: ["food", "travel", "phone", "fun", "fees", "family", "otherOut"],
  in: ["pocket", "scholarship", "work", "gift", "otherIn"],
  save: ["jar"],
};
const KINDS: Entry["kind"][] = ["out", "in", "save"];

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

function pushDigit(current: string, digit: string): string {
  if (current.includes(".") && current.split(".")[1].length >= 2) return current;
  if (current.replace(".", "").length >= 8) return current;
  return current === "0" ? digit : current + digit;
}

function AmountPad({ value, onChange }: { value: string; onChange: (update: (current: string) => string) => void }) {
  const { t } = useI18n();
  return (
    <>
      <p className={`amount-display${value ? "" : " empty"}`} aria-live="polite">
        <span aria-hidden>₹</span>
        <span>{value ? groupAmount(value) : "0"}</span>
      </p>
      <NumPad
        onDigit={(digit) => onChange((current) => pushDigit(current, digit))}
        onDelete={() => onChange((current) => current.slice(0, -1))}
        onDot={() => onChange((current) => (current.includes(".") ? current : `${current || "0"}.`))}
        deleteLabel={t("money.padDelete")}
        dotLabel={t("money.padDot")}
      />
    </>
  );
}

export function MoneyScreen({ openLog }: { openLog?: boolean }) {
  const { t, code } = useI18n();
  const app = useApp();
  const { entries, loans, goal, paths, progress } = app;
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [sheet, setSheet] = useState<"log" | "goal" | null>(openLog ? "log" : null);
  const [kind, setKind] = useState<Entry["kind"]>("out");
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadJson<CaseStudy[]>("/content/cases.json").then(setCases).catch(() => setCases([]));
  }, []);

  const view = useMemo(() => {
    const inMonth = entries.filter((entry) => entry.date.startsWith(month));
    const totals = { in: 0, out: 0, save: 0 };
    const byCategory = new Map<string, number>();
    for (const entry of inMonth) {
      totals[entry.kind] += entry.amount;
      if (entry.kind === "out") byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
    }
    return {
      totals,
      left: totals.in - totals.out - totals.save,
      spend: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [entries, month]);

  if (!app.ready) return <PageSkeleton />;
  if (app.failed) {
    return (
      <div className="state">
        <ArtJar label={t("art.empty")} small />
        <p className="lead">{t("errors.storage")}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{t("common.retry")}</button>
      </div>
    );
  }

  const money = (value: number) => inr(value, code);
  const savedTotal = entries.filter((entry) => entry.kind === "save").reduce((sum, entry) => sum + entry.amount, 0);
  const goalRatio = goal > 0 ? Math.min(1, savedTotal / goal) : 0;
  const week = weekSummary(entries, app.today);
  const insight = insightFor(entries);
  const days = loggedDays(entries);
  const atCurrent = month >= monthKey();
  const weekCase = cases.length ? cases[(isoWeek() - 1) % cases.length] : null;
  const casePath = weekCase ? paths.find((path) => path.caseIds.includes(weekCase.id)) : null;
  const maxSpend = Math.max(1, ...view.spend.map(([, value]) => value));
  const value = parseAmountInput(amount);
  const nextDue = (loan: Loan) => loan.schedule.find((row) => row.due >= app.today)?.due ?? loan.schedule.at(-1)?.due ?? "";

  const spoken = t("money.summary", {
    month: monthLabel(month, code),
    inn: money(view.totals.in),
    out: money(view.totals.out),
    save: money(view.totals.save),
  });

  function openLogSheet() {
    tap();
    setAmount("");
    setCategory(null);
    setKind("out");
    setSaved(false);
    setSheet("log");
  }

  async function saveEntry() {
    if (!category || !value || value <= 0) return;
    await app.logEntry({
      id: crypto.randomUUID(),
      kind,
      category,
      amount: value,
      date: month === monthKey() ? todayISO() : `${month}-01`,
    });
    setSaved(true);
    setSheet(null);
  }

  async function saveGoal() {
    const target = parseAmountInput(goalDraft);
    if (!target || target <= 0) return;
    tap();
    await app.setGoal(target);
    setSheet(null);
  }

  return (
    <div className="stack rise">
      <header className="stack-sm">
        <div className="row-between">
          <h1>{t("money.title")}</h1>
          <ListenButton compact text={spoken} />
        </div>
        <div className="row-between">
          <button type="button" className="icon-btn" aria-label={t("money.prevMonth")} onClick={() => { tap(); setMonth(shiftMonth(month, -1)); }}>
            <ChevronLeft aria-hidden size={20} />
          </button>
          <p aria-live="polite"><strong>{monthLabel(month, code)}</strong></p>
          <button type="button" className="icon-btn" aria-label={t("money.nextMonth")} disabled={atCurrent} onClick={() => { tap(); setMonth(shiftMonth(month, 1)); }}>
            <ChevronRight aria-hidden size={20} />
          </button>
        </div>
      </header>

      <section className="card hero">
        <div className="stack">
          <div className="stack-xs">
            <p className="muted">{t("money.left")}</p>
            <p className="hero-num"><CountUp value={view.left} format={money} /></p>
          </div>
          <dl className="stats">
            {(["in", "out", "save"] as const).map((key) => (
              <div key={key}>
                <dt>{t(`money.${key}`)}</dt>
                <dd>{money(view.totals[key])}</dd>
              </div>
            ))}
          </dl>
          <p className="muted">
            {week.days > 0 ? t("money.week", { out: money(week.out), save: money(week.save) }) : t("money.weekEmpty")}
          </p>
          {saved && <p role="status" className="note ok">{t("money.logged")}</p>}
        </div>
      </section>

      <button type="button" className="btn btn-primary" onClick={openLogSheet}>
        <Plus aria-hidden size={20} />
        {t("money.add")}
      </button>

      {days > 0 && (
        <section className="card flat tight">
          <div className="block">
            <span className="item-icon" style={{ background: "var(--surface-1)" }}><Sparkles aria-hidden size={20} /></span>
            <div className="block-body">
              <h2 className="block-title">{t("insight.title")}</h2>
              <p>
                {insight === null && t("insight.soon", { left: Math.max(1, 3 - days) })}
                {insight?.key === "insight.topCategory" && t(insight.key, { share: insight.share, category: t(`categories.${insight.category}`) })}
                {insight?.key === "insight.dailyAverage" && t(insight.key, { amount: money(insight.amount) })}
                {insight?.key === "insight.savedShare" && t(insight.key, { share: insight.share })}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="spend-h">
        <div className="stack">
          <h2 id="spend-h">{t("money.chart")}</h2>
          {view.spend.length === 0 ? (
            <div className="stack-sm center">
              <ArtJar label={t("art.empty")} small />
              <p className="muted">{t("money.noEntries")}</p>
            </div>
          ) : (
            <ul className="spend">
              {view.spend.map(([id, amountSpent]) => (
                <li key={id} className="spend-row">
                  <div className="row-between">
                    <span>{t(`categories.${id}`)}</span>
                    <span className="num">
                      <strong>{money(amountSpent)}</strong>{" "}
                      <span className="faint">{Math.round((amountSpent / Math.max(1, view.totals.out)) * 100)}%</span>
                    </span>
                  </div>
                  <div className="bar" aria-hidden><span style={{ width: `${(amountSpent / maxSpend) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="goal-h">
        <div className="stack-sm">
          <div className="row-between">
            <div className="stack-xs">
              <h2 id="goal-h">{t("money.goal")}</h2>
              <p className="muted">
                {goal > 0
                  ? savedTotal >= goal ? t("money.goalReached") : t("money.savedToward", { saved: money(savedTotal), goal: money(goal) })
                  : t("money.goalNone")}
              </p>
            </div>
            <Ring value={goalRatio} size={72} stroke={6} label={`${Math.round(goalRatio * 100)}%`}>
              {goal > 0 ? `${Math.round(goalRatio * 100)}%` : <Target size={22} />}
            </Ring>
          </div>
          <button type="button" className="link" onClick={() => { tap(); setGoalDraft(goal ? String(goal) : ""); setSheet("goal"); }}>
            {goal > 0 ? t("money.goalChange") : t("money.goalSet")}
            <ChevronRight aria-hidden size={18} />
          </button>
        </div>
      </section>

      {loans.length > 0 && <section className="card" aria-labelledby="loans-h">
        <div className="stack-sm">
          <h2 id="loans-h">{t("money.loans")}</h2>
          {loans.map((loan) => (
            <details key={loan.id} className="fold">
              <summary>
                <span className="stack-xs">
                  <span>{loan.lender}</span>
                  <span className="item-sub">{t("money.nextDue")} {dayLabel(nextDue(loan), code)} · {money(loan.emi)}</span>
                </span>
                <ChevronDown aria-hidden size={20} />
              </summary>
              <p className="kicker">{t("money.schedule")}</p>
              <ol className="list">
                {loan.schedule.map((row) => (
                  <li key={row.month} className="row-between num" style={{ padding: "8px 0" }}>
                    <span>{dayLabel(row.due, code)}</span>
                    <span>{money(row.payment)}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>}

      <details className="quiet-more">
        <summary>
          <MoreHorizontal aria-hidden size={18} />
          {t("money.more")}
        </summary>
        <div className="stack-sm" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              tap();
              const blob = new Blob([entriesToCsv(entries)], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "saath-money.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t("money.export")}
          </button>
          <label className="btn btn-ghost">
            {t("money.import")}
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  const backup = JSON.parse(await file.text()) as Backup;
                  if (backup.v !== 1 || !Array.isArray(backup.entries)) throw new Error("format");
                  await app.restore(backup);
                } catch {
                  window.alert(t("money.importFail"));
                }
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              tap();
              const backup = await exportBackup();
              const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "saath-backup.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t("profile.exportBackup")}
          </button>
        </div>
      </details>

      {weekCase && (
        <Link className="card" href={`/money-lab/case/${weekCase.id}`} onClick={tap}>
          <span className="stack-xs">
            <span className="kicker">{t("money.caseTitle")}</span>
            <h2>{weekCase.title[code]}</h2>
            {casePath && <span className="muted">{t("money.onPath", { title: casePath.title[code] })}</span>}
            <span className="link" style={{ minHeight: 32 }}>
              {weekCase.id in progress.cases ? t("task.done") : t("money.caseOpen")}
              <ChevronRight aria-hidden size={18} />
            </span>
          </span>
        </Link>
      )}

      {sheet === "log" && (
        <Sheet title={t("money.add")} onClose={() => setSheet(null)}>
          <div className="stack-sm">
            <div className="seg" role="group" aria-label={t("money.pick")} style={{ marginTop: 0 }}>
              {KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={kind === item}
                  onClick={() => {
                    tap();
                    setKind(item);
                    setCategory(GROUPS[item].length === 1 ? GROUPS[item][0] : null);
                  }}
                >
                  {t(`money.kind.${item}`)}
                </button>
              ))}
            </div>
            <div className="chips" role="group" aria-label={t("money.pick")}>
              {GROUPS[kind].map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={category === id} onClick={() => { tap(); setCategory(id); }}>
                  {t(`categories.${id}`)}
                </button>
              ))}
            </div>
            <AmountPad value={amount} onChange={setAmount} />
            <button type="button" className="btn btn-primary" disabled={!category || !value} onClick={saveEntry}>
              {value ? t("money.saveAmount", { amount: money(value) }) : t("common.save")}
            </button>
          </div>
        </Sheet>
      )}

      {sheet === "goal" && (
        <Sheet title={t("money.goal")} onClose={() => setSheet(null)}>
          <div className="stack-sm">
            <AmountPad value={goalDraft} onChange={setGoalDraft} />
            <button type="button" className="btn btn-primary" disabled={!parseAmountInput(goalDraft)} onClick={saveGoal}>
              {t("money.goalSave")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
