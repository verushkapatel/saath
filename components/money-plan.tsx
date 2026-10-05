"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Check, ClipboardPaste, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { inr, parseAmountInput } from "@/lib/format";
import { emptyPlan, monthlyFor, monthView, parseBankSms, PLAN_KEY, suggestBudgets, type Bill, type MoneyPlan, type Pot } from "@/lib/money-plan";
import { tap } from "@/lib/speech";
import { getMeta, setMeta } from "@/lib/storage";
import { useApp } from "./app-state";
import { CategoryIcon } from "./category-icon";
import { useI18n } from "./providers";
import { Ring, Sheet } from "./ui";

export function usePlan() {
  const app = useApp();
  const [plan, setPlan] = useState<MoneyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    getMeta<MoneyPlan>(PLAN_KEY).then((value) => setPlan(value ?? null)).catch(() => undefined).finally(() => setLoaded(true));
  }, []);
  const save = useCallback((next: MoneyPlan) => {
    setPlan(next);
    void setMeta(PLAN_KEY, next).catch(() => undefined);
  }, []);
  return { plan, loaded, save, today: app.today };
}

const BILL_PRESETS: { name: string; category: string; day: number }[] = [
  { name: "rent", category: "rent", day: 5 },
  { name: "phone", category: "phone", day: 10 },
  { name: "electricity", category: "bills", day: 15 },
  { name: "internet", category: "bills", day: 12 },
  { name: "emi", category: "fees", day: 5 },
  { name: "subscriptions", category: "fun", day: 20 },
];

/** Two minutes, three screens: income and payday, the bills that repeat, then budgets Saath suggests. */
export function PlanSetup({ initial, onDone, onClose }: { initial: MoneyPlan | null; onDone: (plan: MoneyPlan) => void; onClose: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<MoneyPlan>(initial ?? emptyPlan(app.today));
  const [income, setIncome] = useState(initial?.income ? String(initial.income) : "");
  const money = (value: number) => inr(value, code);
  const incomeValue = parseAmountInput(income) ?? 0;

  function next() {
    tap();
    if (step === 0) setPlan({ ...plan, income: incomeValue });
    if (step === 1 && Object.keys(plan.budgets).length === 0) setPlan((current) => ({ ...current, budgets: suggestBudgets(incomeValue, current.bills) }));
    if (step === 2) {
      onDone({ ...plan, income: incomeValue, setAt: app.today });
      return;
    }
    setStep(step + 1);
  }

  const toggleBill = (preset: (typeof BILL_PRESETS)[number]) => {
    const exists = plan.bills.find((bill) => bill.id === preset.name);
    setPlan({ ...plan, bills: exists ? plan.bills.filter((bill) => bill.id !== preset.name) : [...plan.bills, { id: preset.name, name: t(`plan.bill.${preset.name}`), amount: 0, day: preset.day, category: preset.category, paid: [] }] });
  };
  const patchBill = (id: string, patch: Partial<Bill>) => setPlan({ ...plan, bills: plan.bills.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)) });
  const fixed = plan.bills.reduce((sum, bill) => sum + bill.amount, 0);
  const budgeted = Object.values(plan.budgets).reduce((sum, value) => sum + value, 0);

  return (
    <Sheet title={t("plan.setupTitle")} onClose={onClose}>
      <div className="stack-sm plan-setup" data-testid="plan-setup">
        <div className="resume-progress" aria-hidden>{[0, 1, 2].map((index) => <span key={index} className={index <= step ? "on" : ""} />)}</div>
        {step === 0 && (
          <>
            <h3>{t("plan.s1")}</h3>
            <p className="muted">{t("plan.s1Lead")}</p>
            <label className="resume-field"><span>{t("plan.income")}</span><input inputMode="decimal" value={income} placeholder="28000" onChange={(event) => setIncome(event.target.value.replace(/[^\d.]/g, ""))} data-testid="plan-income" /></label>
            <label className="resume-field"><span>{t("plan.payday")}</span><input inputMode="numeric" value={plan.payday} onChange={(event) => setPlan({ ...plan, payday: Math.min(31, Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1)) })} /></label>
          </>
        )}
        {step === 1 && (
          <>
            <h3>{t("plan.s2")}</h3>
            <p className="muted">{t("plan.s2Lead")}</p>
            <div className="chips">
              {BILL_PRESETS.map((preset) => (
                <button key={preset.name} type="button" className="chip" aria-pressed={plan.bills.some((bill) => bill.id === preset.name)} onClick={() => { tap(); toggleBill(preset); }}>{t(`plan.bill.${preset.name}`)}</button>
              ))}
            </div>
            {plan.bills.map((bill) => (
              <div key={bill.id} className="plan-bill-row">
                <span className="cat-dot"><CategoryIcon id={bill.category} size={16} /></span>
                <strong>{bill.name}</strong>
                <label><span className="visually-hidden">{t("plan.amount")}</span><input inputMode="decimal" placeholder="₹" value={bill.amount || ""} onChange={(event) => patchBill(bill.id, { amount: parseAmountInput(event.target.value) ?? 0 })} /></label>
                <label><span className="visually-hidden">{t("plan.dueDay")}</span><input inputMode="numeric" value={bill.day} onChange={(event) => patchBill(bill.id, { day: Math.min(31, Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1)) })} aria-label={t("plan.dueDay")} /></label>
              </div>
            ))}
            {plan.bills.length > 0 && <p className="faint">{t("plan.fixedTotal", { amount: money(fixed) })}</p>}
          </>
        )}
        {step === 2 && (
          <>
            <h3>{t("plan.s3")}</h3>
            <p className="muted">{t("plan.s3Lead", { save: money(Math.round(plan.income * 0.1)) })}</p>
            <ul className="plan-budget-edit">
              {Object.entries(plan.budgets).map(([id, value]) => (
                <li key={id}>
                  <span className="cat-dot"><CategoryIcon id={id} size={16} /></span>
                  <span>{t(`categories.${id}`)}</span>
                  <input inputMode="decimal" value={value || ""} onChange={(event) => setPlan({ ...plan, budgets: { ...plan.budgets, [id]: parseAmountInput(event.target.value) ?? 0 } })} aria-label={t(`categories.${id}`)} />
                </li>
              ))}
            </ul>
            <p className={`faint${fixed + budgeted > plan.income ? " signal-danger" : ""}`}>{t("plan.balanceLine", { bills: money(fixed), budgets: money(budgeted), left: money(plan.income - fixed - budgeted) })}</p>
          </>
        )}
        <button type="button" className="btn btn-primary" disabled={step === 0 && incomeValue <= 0} onClick={next} data-testid="plan-next">
          {step === 2 ? t("plan.finish") : t("walk.next")}<ArrowRight aria-hidden size={18} />
        </button>
        {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => { tap(); setStep(step - 1); }}>{t("common.back")}</button>}
      </div>
    </Sheet>
  );
}

/** The plan side of Money Lab: safe to spend, budgets, bills and goals. */
export function PlanPanel({ plan, save, onEdit }: { plan: MoneyPlan; save: (plan: MoneyPlan) => void; onEdit: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const money = (value: number) => inr(value, code);
  const view = useMemo(() => monthView(plan, app.entries, app.today), [plan, app.entries, app.today]);
  const [potSheet, setPotSheet] = useState<Pot | "new" | null>(null);
  const [potName, setPotName] = useState("");
  const [potTarget, setPotTarget] = useState("");
  const [potAdd, setPotAdd] = useState("");
  const [allBudgets, setAllBudgets] = useState(false);
  const month = app.today.slice(0, 7);

  async function payBill(bill: Bill) {
    tap();
    await app.logEntry({ id: crypto.randomUUID(), kind: "out", category: bill.category, amount: bill.amount, date: app.today, note: bill.name.slice(0, 40) });
    save({ ...plan, bills: plan.bills.map((item) => (item.id === bill.id ? { ...item, paid: [...item.paid.filter((m) => m !== month), month].slice(-12) } : item)) });
  }

  async function addToPot(pot: Pot) {
    const amount = parseAmountInput(potAdd);
    if (!amount) return;
    tap();
    await app.logEntry({ id: crypto.randomUUID(), kind: "save", category: "jar", amount, date: app.today, note: pot.name.slice(0, 40) });
    save({ ...plan, pots: plan.pots.map((item) => (item.id === pot.id ? { ...item, saved: item.saved + amount } : item)) });
    setPotAdd("");
    setPotSheet(null);
  }

  function createPot() {
    const target = parseAmountInput(potTarget);
    if (!potName.trim() || !target) return;
    tap();
    save({ ...plan, pots: [...plan.pots, { id: crypto.randomUUID(), name: potName.trim().slice(0, 30), target, saved: 0 }] });
    setPotName("");
    setPotTarget("");
    setPotSheet(null);
  }

  // Categories with spending come first, then the rest; only five show until asked, so the screen stays calm.
  const budgetIds = Object.keys(plan.budgets).filter((id) => plan.budgets[id] > 0 || view.spent[id]);
  const extraSpent = Object.keys(view.spent).filter((id) => !budgetIds.includes(id));
  const ordered = [...budgetIds, ...extraSpent].sort((a, b) => (view.spent[b] ?? 0) / Math.max(1, plan.budgets[b] ?? 1) - (view.spent[a] ?? 0) / Math.max(1, plan.budgets[a] ?? 1));
  const shownBudgets = allBudgets ? ordered : ordered.slice(0, 5);

  return (
    <div className="stack plan-panel" data-testid="plan-panel">
      <section className="safe-card navy-scene">
        <p className="wallet-label">{t("plan.safeToday")}</p>
        <p className="hero-num wallet-num">{money(view.safePerDay)}</p>
        <p className="wallet-week">{view.safeLeft >= 0 ? t("plan.safeLeft", { amount: money(view.safeLeft), days: view.daysLeft }) : t("plan.overPlan", { amount: money(Math.abs(view.safeLeft)) })}</p>
        <button type="button" className="safe-edit" onClick={() => { tap(); onEdit(); }}><Pencil aria-hidden size={14} />{t("plan.edit")}</button>
      </section>

      <section className="stack-sm" aria-labelledby="bills-h">
        <h2 id="bills-h"><Bell aria-hidden size={18} style={{ verticalAlign: "-3px" }} /> {t("plan.bills")}</h2>
        {view.billsDue.length === 0 ? <p className="faint">{t("plan.noBills")}</p> : (
          <ul className="card tight list">
            {view.billsDue.map((bill) => (
              <li key={bill.id} className={`entry bill-row${bill.isPaid ? " paid" : bill.daysLeft < 0 ? " late" : ""}`}>
                <span className="cat-dot"><CategoryIcon id={bill.category} size={18} /></span>
                <span className="item-body">
                  <span className="item-title">{bill.name}</span>
                  <span className="item-sub">{bill.isPaid ? t("plan.paid") : bill.daysLeft < 0 ? t("plan.overdue", { days: Math.abs(bill.daysLeft) }) : bill.daysLeft === 0 ? t("plan.dueToday") : t("plan.dueIn", { days: bill.daysLeft })}</span>
                </span>
                <strong className="num">{money(bill.amount)}</strong>
                {!bill.isPaid && bill.amount > 0 && <button type="button" className="chip" onClick={() => void payBill(bill)} data-testid="bill-pay"><Check aria-hidden size={14} /> {t("plan.markPaid")}</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-sm" aria-labelledby="budgets-h">
        <h2 id="budgets-h"><Wallet aria-hidden size={18} style={{ verticalAlign: "-3px" }} /> {t("plan.budgets")}</h2>
        <ul className="card budget-list">
          {shownBudgets.map((id) => {
            const limit = plan.budgets[id] ?? 0;
            const spent = view.spent[id] ?? 0;
            const ratio = limit ? spent / limit : spent ? 1.2 : 0;
            const state = ratio > 1 ? "over" : ratio > 0.8 ? "near" : "ok";
            return (
              <li key={id} className={`budget-row ${state}`}>
                <div className="row-between">
                  <span className="budget-name"><span className="cat-dot"><CategoryIcon id={id} size={16} /></span>{t(`categories.${id}`)}</span>
                  <span className="num"><strong>{money(spent)}</strong> <span className="faint">/ {limit ? money(limit) : "—"}</span></span>
                </div>
                <div className="bar" aria-hidden><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
                <span className="faint budget-left">{limit ? (spent <= limit ? t("plan.leftIn", { amount: money(limit - spent) }) : t("plan.overBy", { amount: money(spent - limit) })) : t("plan.noBudget")}</span>
              </li>
            );
          })}
        </ul>
        {ordered.length > 5 && <button type="button" className="link" onClick={() => { tap(); setAllBudgets((value) => !value); }}>{allBudgets ? t("plan.fewer") : t("plan.allBudgets", { count: ordered.length })}</button>}
      </section>

      <section className="stack-sm" aria-labelledby="pots-h">
        <div className="row-between">
          <h2 id="pots-h"><PiggyBank aria-hidden size={18} style={{ verticalAlign: "-3px" }} /> {t("plan.pots")}</h2>
          <button type="button" className="link" onClick={() => { tap(); setPotSheet("new"); }}><Plus aria-hidden size={16} />{t("plan.newPot")}</button>
        </div>
        {plan.pots.length === 0 ? <p className="faint">{t("plan.noPots")}</p> : (
          <div className="pot-grid">
            {plan.pots.map((pot) => {
              const ratio = Math.min(1, pot.saved / Math.max(1, pot.target));
              return (
                <button key={pot.id} type="button" className="pot" onClick={() => { tap(); setPotSheet(pot); }}>
                  <Ring value={ratio} size={64} stroke={6} label={`${Math.round(ratio * 100)}%`}>{`${Math.round(ratio * 100)}%`}</Ring>
                  <strong>{pot.name}</strong>
                  <span className="faint num">{money(pot.saved)} / {money(pot.target)}</span>
                  <span className="faint">{ratio >= 1 ? t("plan.potDone") : t("plan.potMonthly", { amount: money(monthlyFor(pot, app.today)) })}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {potSheet === "new" && (
        <Sheet title={t("plan.newPot")} onClose={() => setPotSheet(null)}>
          <div className="stack-sm">
            <label className="resume-field"><span>{t("plan.potName")}</span><input value={potName} maxLength={30} placeholder={t("plan.potNameHint")} onChange={(event) => setPotName(event.target.value)} /></label>
            <label className="resume-field"><span>{t("plan.potTarget")}</span><input inputMode="decimal" value={potTarget} onChange={(event) => setPotTarget(event.target.value)} /></label>
            <button type="button" className="btn btn-primary" onClick={createPot}>{t("common.save")}</button>
          </div>
        </Sheet>
      )}
      {potSheet && potSheet !== "new" && (
        <Sheet title={potSheet.name} onClose={() => setPotSheet(null)}>
          <div className="stack-sm">
            <p className="muted">{t("plan.potStatus", { saved: money(potSheet.saved), target: money(potSheet.target) })}</p>
            <label className="resume-field"><span>{t("plan.potAdd")}</span><input inputMode="decimal" value={potAdd} onChange={(event) => setPotAdd(event.target.value)} autoFocus /></label>
            <button type="button" className="btn btn-primary" onClick={() => void addToPot(potSheet)}>{t("plan.potAddBtn")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { tap(); save({ ...plan, pots: plan.pots.filter((pot) => pot.id !== potSheet.id) }); setPotSheet(null); }}><Trash2 aria-hidden size={16} />{t("plan.potRemove")}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Paste a bank SMS: Money Lab reads the amount, the shop and the category on this device and fills the entry. */
export function SmsPaste({ onClose }: { onClose: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [text, setText] = useState("");
  const guess = text.trim().length > 10 ? parseBankSms(text) : null;
  const [category, setCategory] = useState<string | null>(null);
  const chosen = category ?? guess?.category ?? null;

  async function paste() {
    tap();
    try { setText(await navigator.clipboard.readText()); } catch { /* typing still works */ }
  }

  async function save() {
    if (!guess || !chosen) return;
    tap();
    await app.logEntry({ id: crypto.randomUUID(), kind: guess.kind, category: chosen, amount: guess.amount, date: app.today, note: guess.merchant.slice(0, 40) || undefined });
    onClose();
  }

  return (
    <Sheet title={t("plan.smsTitle")} onClose={onClose}>
      <div className="stack-sm" data-testid="sms-paste">
        <p className="muted">{t("plan.smsLead")}</p>
        <button type="button" className="btn btn-secondary" onClick={() => void paste()}><ClipboardPaste aria-hidden size={18} />{t("plan.smsPasteBtn")}</button>
        <textarea className="field text" rows={4} value={text} placeholder={t("plan.smsPlaceholder")} onChange={(event) => setText(event.target.value)} data-testid="sms-input" />
        {text.trim().length > 10 && !guess && <p className="note">{t("plan.smsNone")}</p>}
        {guess && (
          <div className="card tight stack-sm">
            <p><strong>{guess.kind === "in" ? "+" : "−"}{inr(guess.amount, code)}</strong> {guess.merchant && <span className="faint">· {guess.merchant}</span>}</p>
            <div className="chips">
              {(guess.kind === "in" ? ["salary", "work", "gift", "otherIn"] : ["food", "travel", "shopping", "bills", "phone", "rent", "health", "fun", "fees", "otherOut"]).map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={chosen === id} onClick={() => { tap(); setCategory(id); }}>{t(`categories.${id}`)}</button>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void save()} data-testid="sms-save">{t("plan.smsSave")}</button>
          </div>
        )}
        <p className="faint">{t("plan.smsPrivate")}</p>
      </div>
    </Sheet>
  );
}
