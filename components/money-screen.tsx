"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Plus, Repeat, ShieldCheck, Sparkles, Target, Trash2 } from "lucide-react";
import { todayISO } from "@/lib/dates";
import { dayLabel, groupAmount, inr, monthLabel, parseAmountInput } from "@/lib/format";
import { photoQuality, preprocessImage } from "@/lib/image";
import { insightFor, loggedDays, weekSummary } from "@/lib/insights";
import { readPhoto, type OcrProgress } from "@/lib/ocr";
import { recurringSpends, weekendShare } from "@/lib/patterns";
import { parseReceipt, type ReceiptGuess } from "@/lib/receipt";
import { tap } from "@/lib/speech";
import type { Entry, Loan } from "@/lib/storage";
import { useAiContext } from "./ai-context";
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

/** The first visit: a short walk through that the person does, not reads. */
function MoneyIntro() {
  const { t, code } = useI18n();
  const app = useApp();
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const sample = [
    { id: "food", amount: 40 },
    { id: "travel", amount: 25 },
    { id: "phone", amount: 199 },
  ];
  const total = sample.filter((item) => tried.includes(item.id)).reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="stack rise">
      <div className="stack-xs">
        <p className="masthead">{t("money.introKicker", { step: step + 1, total: 3 })}</p>
        <h1>{t(`money.intro${step}Title`)}</h1>
        <p className="lead">{t(`money.intro${step}Lead`)}</p>
      </div>
      {step === 0 && (
        <div className="demo">
          <div className="cluster" role="group" aria-label={t("money.introTry")}>
            {sample.map((item) => (
              <button key={item.id} type="button" className="chip" aria-pressed={tried.includes(item.id)} onClick={() => { tap(); setTried((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])); }}>
                {t(`categories.${item.id}`)} {inr(item.amount, code)}
              </button>
            ))}
          </div>
          <div className="row-between" aria-live="polite">
            <span className="muted">{t("money.introSpent")}</span>
            <strong className="hero-num md">{inr(total, code)}</strong>
          </div>
          <p className="faint">{tried.length ? t("money.introSeen") : t("money.introTry")}</p>
        </div>
      )}
      {step === 1 && (
        <ol className="receipt-steps">
          {["photo", "read", "check", "confirm", "save"].map((item) => <li key={item}><strong>{t(`money.receipt.step.${item}`)}</strong> <span className="faint">{t(`money.receipt.stepHint.${item}`)}</span></li>)}
        </ol>
      )}
      {step === 2 && (
        <ul className="checks">
          <li><ShieldCheck aria-hidden size={16} /><span>{t("money.intro2a")}</span></li>
          <li><ShieldCheck aria-hidden size={16} /><span>{t("money.intro2b")}</span></li>
          <li><ShieldCheck aria-hidden size={16} /><span>{t("money.intro2c")}</span></li>
        </ul>
      )}
      <div className="stack-sm">
        {step < 2 ? (
          <button type="button" className="btn btn-primary" disabled={step === 0 && tried.length === 0} onClick={() => { tap(); setStep(step + 1); }}>
            {t("common.next")}<ArrowRight aria-hidden size={18} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => { tap(); void app.finishMoneyIntro(); }}>{t("money.introStart")}</button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => { tap(); void app.finishMoneyIntro(); }}>{t("money.introSkip")}</button>
      </div>
    </div>
  );
}

type ReceiptStep = "photo" | "read" | "check" | "confirm";

/**
 * Photograph a receipt, read it on the phone, check what was read, confirm, then save.
 * Nothing is saved until the person presses Save, and the photo itself is never kept.
 */
function ReceiptSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [step, setStep] = useState<ReceiptStep>("photo");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [guess, setGuess] = useState<ReceiptGuess | null>(null);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [blurry, setBlurry] = useState(false);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const pickRef = useRef<HTMLInputElement | null>(null);
  const value = parseAmountInput(amount);

  async function read(fileIn: File | undefined) {
    if (!fileIn) return;
    tap();
    setFailed(false);
    setStep("read");
    setProgress(null);
    let file: Blob | null = fileIn;
    try {
      const quality = await photoQuality(file);
      setBlurry(quality.blurry || quality.dark);
      const text = await readPhoto(await preprocessImage(file), code, setProgress);
      const found = parseReceipt(text);
      setGuess(found);
      setAmount(found.total ? String(found.total) : "");
      setDate(found.date && found.date <= todayISO() ? found.date : todayISO());
      setNote(found.merchant ?? "");
      setCategory(found.category);
      setStep("check");
    } catch {
      setFailed(true);
      setStep("photo");
    } finally {
      // The picture is dropped here. It was never written to storage.
      file = null;
      if (cameraRef.current) cameraRef.current.value = "";
      if (pickRef.current) pickRef.current.value = "";
    }
  }

  async function save() {
    if (!value || !category) return;
    tap();
    await app.logEntry({ id: crypto.randomUUID(), kind: "out", category, amount: value, date, note: note.trim().slice(0, 40) || undefined });
    onSaved();
  }

  const ratio = progress ? (progress.phase === "download" ? progress.progress * 0.3 : 0.3 + progress.progress * 0.7) : 0;
  const order: ReceiptStep[] = ["photo", "read", "check", "confirm"];

  return (
    <Sheet title={t("money.receipt.title")} onClose={onClose}>
      <div className="stack">
        <ol className="loop-dots" aria-label={t("money.receipt.title")}>
          {order.map((item, at) => <li key={item} className={at < order.indexOf(step) ? "was" : item === step ? "on" : ""}><span className="visually-hidden">{t(`money.receipt.step.${item}`)}</span></li>)}
        </ol>
        <p className="kicker">{t(`money.receipt.step.${step}`)}</p>

        {step === "photo" && (
          <>
            <p className="muted">{t("money.receipt.photoLead")}</p>
            <div className="pair">
              <button type="button" className="btn btn-primary" onClick={() => cameraRef.current?.click()}><Camera aria-hidden size={18} />{t("forms.takePhoto")}</button>
              <button type="button" className="btn btn-secondary" onClick={() => pickRef.current?.click()}><ImagePlus aria-hidden size={18} />{t("forms.pickPhoto")}</button>
            </div>
            {failed && <p className="note err" role="alert">{t("forms.failed")}</p>}
            <p className="faint"><ShieldCheck aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("money.receipt.private")}</p>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => void read(event.target.files?.[0])} />
            <input ref={pickRef} type="file" accept="image/*" hidden onChange={(event) => void read(event.target.files?.[0])} />
          </>
        )}

        {step === "read" && (
          <div className="work stack-sm center" role="status" aria-live="polite">
            <Ring value={ratio} size={72} label={t("forms.reading")} spin={!progress} />
            <p>{progress?.phase === "download" ? t("forms.downloading") : t("forms.reading")}</p>
          </div>
        )}

        {step === "check" && guess && (
          <>
            {guess.confidence === "none" && <p className="note err" role="alert">{t("money.receipt.none")}</p>}
            {guess.confidence === "low" && <p className="note" role="alert">{t("money.receipt.low")}</p>}
            {guess.confidence === "good" && <p className="note">{t("money.receipt.good")}</p>}
            {blurry && <p className="faint">{t("forms.tipBlur")}</p>}
            <label>
              <span className="label">{t("money.receipt.amount")}</span>
              <input className="field text num" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} />
            </label>
            <label>
              <span className="label">{t("money.receipt.date")}</span>
              <input className="field text" type="date" value={date} max={todayISO()} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span className="label">{t("money.note")}</span>
              <input className="field text" value={note} maxLength={40} onChange={(event) => setNote(event.target.value)} />
            </label>
            <div className="stack-xs">
              <p className="label">{t("money.pick")}</p>
              <div className="chips" role="group" aria-label={t("money.pick")}>
                {GROUPS.out.map((id) => (
                  <button key={id} type="button" className="chip" aria-pressed={category === id} onClick={() => { tap(); setCategory(id); }}>{t(`categories.${id}`)}</button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-primary" disabled={!value || !category} onClick={() => { tap(); setStep("confirm"); }}>{t("money.receipt.toConfirm")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { tap(); setStep("photo"); }}>{t("money.receipt.again")}</button>
          </>
        )}

        {step === "confirm" && value && category && (
          <>
            <div className="card flat stack-xs">
              <p className="lead">{t("money.receipt.confirmLine", { amount: inr(value, code), category: t(`categories.${category}`), date: dayLabel(date, code) })}</p>
              {note.trim() && <p className="muted">{note.trim()}</p>}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void save()}><Check aria-hidden size={18} />{t("money.receipt.save")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { tap(); setStep("check"); }}>{t("money.receipt.edit")}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function MoneyScreen({ openLog }: { openLog?: boolean }) {
  const { t, code } = useI18n();
  const app = useApp();
  const { entries, loans, goal, progress } = app;
  const [month, setMonth] = useState(monthKey());
  const [sheet, setSheet] = useState<"log" | "goal" | "receipt" | null>(openLog ? "log" : null);
  const [kind, setKind] = useState<Entry["kind"]>("out");
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [saved, setSaved] = useState(false);

  // Saath AI sees that this is Money Lab, and nothing of what is in it.
  useAiContext({ screen: t("nav.money"), kind: "money", title: t("money.title"), suggestions: [t("money.askBudget"), t("money.askSave")] });

  const view = useMemo(() => {
    const inMonth = entries.filter((entry) => entry.date.startsWith(month));
    const totals = { in: 0, out: 0, save: 0 };
    const byCategory = new Map<string, number>();
    for (const entry of inMonth) {
      totals[entry.kind] += entry.amount;
      if (entry.kind === "out") byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
    }
    return { inMonth, totals, left: totals.in - totals.out - totals.save, spend: [...byCategory.entries()].sort((a, b) => b[1] - a[1]) };
  }, [entries, month]);
  const recurring = useMemo(() => recurringSpends(entries).slice(0, 4), [entries]);
  const weekend = useMemo(() => weekendShare(entries), [entries]);

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
  if (!progress.moneyIntro) return <MoneyIntro />;

  const money = (value: number) => inr(value, code);
  const savedTotal = entries.filter((entry) => entry.kind === "save").reduce((sum, entry) => sum + entry.amount, 0);
  const goalRatio = goal > 0 ? Math.min(1, savedTotal / goal) : 0;
  const week = weekSummary(entries, app.today);
  const insight = insightFor(entries);
  const days = loggedDays(entries);
  const atCurrent = month >= monthKey();
  const maxSpend = Math.max(1, ...view.spend.map(([, value]) => value));
  const value = parseAmountInput(amount);
  const nextDue = (loan: Loan) => loan.schedule.find((row) => row.due >= app.today)?.due ?? loan.schedule.at(-1)?.due ?? "";
  const spoken = t("money.summary", { month: monthLabel(month, code), inn: money(view.totals.in), out: money(view.totals.out), save: money(view.totals.save) });

  function openLogSheet() {
    tap();
    setAmount("");
    setNote("");
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
      note: note.trim().slice(0, 40) || undefined,
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
          <button type="button" className="icon-btn" aria-label={t("money.prevMonth")} onClick={() => { tap(); setMonth(shiftMonth(month, -1)); }}><ChevronLeft aria-hidden size={20} /></button>
          <p aria-live="polite"><strong>{monthLabel(month, code)}</strong></p>
          <button type="button" className="icon-btn" aria-label={t("money.nextMonth")} disabled={atCurrent} onClick={() => { tap(); setMonth(shiftMonth(month, 1)); }}><ChevronRight aria-hidden size={20} /></button>
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
              <div key={key}><dt>{t(`money.${key}`)}</dt><dd>{money(view.totals[key])}</dd></div>
            ))}
          </dl>
          <p className="muted">{week.days > 0 ? t("money.week", { out: money(week.out), save: money(week.save) }) : t("money.weekEmpty")}</p>
          {saved && <p role="status" className="note ok">{t("money.logged")}</p>}
        </div>
      </section>

      <div className="pair">
        <button type="button" className="btn btn-primary" onClick={openLogSheet}><Plus aria-hidden size={20} />{t("money.add")}</button>
        <button type="button" className="btn btn-secondary" onClick={() => { tap(); setSaved(false); setSheet("receipt"); }}><Camera aria-hidden size={18} />{t("money.receipt.open")}</button>
      </div>

      <section className="card" aria-labelledby="entries-h">
        <div className="stack-sm">
          <h2 id="entries-h">{t("money.entries")}</h2>
          {view.inMonth.length === 0 ? (
            <div className="stack-sm center">
              <ArtJar label={t("art.empty")} small />
              <p className="muted">{t("money.noEntries")}</p>
            </div>
          ) : (
            <ul className="list entry-list">
              {view.inMonth.slice(0, 50).map((entry) => (
                <li key={entry.id} className="entry">
                  <span className="stack-xs">
                    <span className="item-title">{t(`categories.${entry.category}`)}{entry.note ? <span className="faint"> · {entry.note}</span> : null}</span>
                    <span className="item-sub">{dayLabel(entry.date, code)} · {t(`money.kind.${entry.kind}`)}</span>
                  </span>
                  <span className="cluster">
                    <strong className="num">{entry.kind === "out" ? "−" : "+"}{money(entry.amount)}</strong>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t("money.deleteEntry", { amount: money(entry.amount) })}
                      onClick={() => {
                        if (!window.confirm(t("money.deleteConfirm", { amount: money(entry.amount), category: t(`categories.${entry.category}`) }))) return;
                        void app.deleteEntry(entry.id);
                      }}
                    >
                      <Trash2 aria-hidden size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {view.spend.length > 0 && (
        <section className="card" aria-labelledby="spend-h">
          <div className="stack">
            <h2 id="spend-h">{t("money.chart")}</h2>
            <ul className="spend">
              {view.spend.map(([id, amountSpent]) => (
                <li key={id} className="spend-row">
                  <div className="row-between">
                    <span>{t(`categories.${id}`)}</span>
                    <span className="num"><strong>{money(amountSpent)}</strong> <span className="faint">{Math.round((amountSpent / Math.max(1, view.totals.out)) * 100)}%</span></span>
                  </div>
                  <div className="bar" aria-hidden><span style={{ width: `${(amountSpent / maxSpend) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {days > 0 && (
        <section className="card flat stack-sm" aria-labelledby="patterns-h">
          <h2 id="patterns-h" className="block-title"><Sparkles aria-hidden size={18} style={{ verticalAlign: "-3px" }} /> {t("money.patterns")}</h2>
          <p>
            {insight === null && t("insight.soon", { left: Math.max(1, 3 - days) })}
            {insight?.key === "insight.topCategory" && t(insight.key, { share: insight.share, category: t(`categories.${insight.category}`) })}
            {insight?.key === "insight.dailyAverage" && t(insight.key, { amount: money(insight.amount) })}
            {insight?.key === "insight.savedShare" && t(insight.key, { share: insight.share })}
          </p>
          {weekend !== null && <p className="muted">{t("money.weekend", { share: weekend })}</p>}
          {recurring.length > 0 && (
            <div className="stack-xs">
              <p className="label"><Repeat aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("money.recurring")}</p>
              <ul className="stack-xs">
                {recurring.map((item) => (
                  <li key={`${item.label}-${item.amount}`} className="row-between">
                    <span>{item.label === item.category ? t(`categories.${item.category}`) : item.label}</span>
                    <span className="num faint">{t("money.recurringLine", { amount: money(item.amount), months: item.months })}</span>
                  </li>
                ))}
              </ul>
              <p className="faint">{t("money.recurringHint")}</p>
            </div>
          )}
        </section>
      )}

      <section className="card" aria-labelledby="goal-h">
        <div className="stack-sm">
          <div className="row-between">
            <div className="stack-xs">
              <h2 id="goal-h">{t("money.goal")}</h2>
              <p className="muted">
                {goal > 0 ? (savedTotal >= goal ? t("money.goalReached") : t("money.savedToward", { saved: money(savedTotal), goal: money(goal) })) : t("money.goalNone")}
              </p>
            </div>
            <Ring value={goalRatio} size={72} stroke={6} label={`${Math.round(goalRatio * 100)}%`}>
              {goal > 0 ? `${Math.round(goalRatio * 100)}%` : <Target size={22} />}
            </Ring>
          </div>
          <button type="button" className="link" onClick={() => { tap(); setGoalDraft(goal ? String(goal) : ""); setSheet("goal"); }}>
            {goal > 0 ? t("money.goalChange") : t("money.goalSet")}<ChevronRight aria-hidden size={18} />
          </button>
        </div>
      </section>

      {loans.length > 0 && (
        <section className="card" aria-labelledby="loans-h">
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
        </section>
      )}

      <p className="faint"><ShieldCheck aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("money.private")} <Link href="/settings">{t("money.backupLink")}</Link></p>

      {sheet === "log" && (
        <Sheet title={t("money.add")} onClose={() => setSheet(null)}>
          <div className="stack-sm">
            <div className="seg" role="group" aria-label={t("money.pick")} style={{ marginTop: 0 }}>
              {KINDS.map((item) => (
                <button key={item} type="button" aria-pressed={kind === item} onClick={() => { tap(); setKind(item); setCategory(GROUPS[item].length === 1 ? GROUPS[item][0] : null); }}>
                  {t(`money.kind.${item}`)}
                </button>
              ))}
            </div>
            <div className="chips" role="group" aria-label={t("money.pick")}>
              {GROUPS[kind].map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={category === id} onClick={() => { tap(); setCategory(id); }}>{t(`categories.${id}`)}</button>
              ))}
            </div>
            <AmountPad value={amount} onChange={setAmount} />
            <label>
              <span className="label">{t("money.note")}</span>
              <input className="field text" value={note} maxLength={40} placeholder={t("money.notePlaceholder")} onChange={(event) => setNote(event.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={!category || !value} onClick={saveEntry}>
              {value ? t("money.saveAmount", { amount: money(value) }) : t("common.save")}
            </button>
          </div>
        </Sheet>
      )}

      {sheet === "receipt" && <ReceiptSheet onClose={() => setSheet(null)} onSaved={() => { setSaved(true); setSheet(null); }} />}

      {sheet === "goal" && (
        <Sheet title={t("money.goal")} onClose={() => setSheet(null)}>
          <div className="stack-sm">
            <AmountPad value={goalDraft} onChange={setGoalDraft} />
            <button type="button" className="btn btn-primary" disabled={!parseAmountInput(goalDraft)} onClick={saveGoal}>{t("money.goalSave")}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
