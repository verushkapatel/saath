import type { Entry } from "./storage";

/**
 * The monthly plan behind Money Lab, kept on this device only: income and payday, a budget for each category,
 * the bills that repeat every month, and savings goals. It is modelled on how popular money-manager apps work:
 * a "safe to spend" number, budgets with bars, bill reminders and goal pots.
 */
export type Bill = { id: string; name: string; amount: number; day: number; category: string; paid: string[] };
export type Pot = { id: string; name: string; target: number; saved: number; by?: string };
export type MoneyPlan = {
  income: number;
  payday: number;
  budgets: Record<string, number>;
  bills: Bill[];
  pots: Pot[];
  setAt: string;
};

export const PLAN_KEY = "money-plan";

/** Spending categories and the share of take-home pay each usually needs, used to suggest starting budgets. */
export const SUGGESTED_SHARE: Record<string, number> = {
  food: 0.16, travel: 0.07, shopping: 0.06, fun: 0.05, health: 0.03, phone: 0.02, family: 0.04, fees: 0.03, otherOut: 0.03,
};

/** Starting budgets: what is left after bills and saving, spread the way most people's months actually go. */
export function suggestBudgets(income: number, bills: Bill[], savingShare = 0.1): Record<string, number> {
  const fixed = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const flexible = Math.max(0, income - fixed - income * savingShare);
  const weights = Object.entries(SUGGESTED_SHARE);
  const total = weights.reduce((sum, [, share]) => sum + share, 0);
  return Object.fromEntries(weights.map(([id, share]) => [id, Math.round(((flexible * share) / total) / 50) * 50]));
}

export type MonthView = {
  spent: Record<string, number>;
  totalOut: number;
  totalIn: number;
  saved: number;
  billsDue: (Bill & { due: string; daysLeft: number; isPaid: boolean })[];
  /** What can be spent per day for the rest of the month without breaking the plan. */
  safePerDay: number;
  safeLeft: number;
  daysLeft: number;
};

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function monthView(plan: MoneyPlan, entries: Entry[], today: string): MonthView {
  const month = today.slice(0, 7);
  const [year, mon, day] = today.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const inMonth = entries.filter((entry) => entry.date.startsWith(month));
  const spent: Record<string, number> = {};
  let totalOut = 0;
  let totalIn = 0;
  let saved = 0;
  for (const entry of inMonth) {
    if (entry.kind === "out") {
      spent[entry.category] = (spent[entry.category] ?? 0) + entry.amount;
      totalOut += entry.amount;
    } else if (entry.kind === "in") totalIn += entry.amount;
    else saved += entry.amount;
  }
  const billsDue = plan.bills
    .map((bill) => {
      const dueDay = Math.min(bill.day, lastDay);
      const due = iso(new Date(year, mon - 1, dueDay));
      const isPaid = bill.paid.includes(month);
      return { ...bill, due, daysLeft: dueDay - day, isPaid };
    })
    .sort((a, b) => Number(a.isPaid) - Number(b.isPaid) || a.daysLeft - b.daysLeft);
  const unpaid = billsDue.filter((bill) => !bill.isPaid).reduce((sum, bill) => sum + bill.amount, 0);
  const potsMonthly = plan.pots.reduce((sum, pot) => sum + monthlyFor(pot, today), 0);
  const income = Math.max(plan.income, totalIn);
  const safeLeft = income - totalOut - saved - unpaid - Math.max(0, potsMonthly - saved);
  const daysLeft = Math.max(1, lastDay - day + 1);
  return { spent, totalOut, totalIn, saved, billsDue, safeLeft, daysLeft, safePerDay: Math.max(0, Math.floor(safeLeft / daysLeft)) };
}

/** How much a goal needs each month to reach its target by its date (or within a year if no date is set). */
export function monthlyFor(pot: Pot, today: string): number {
  const left = Math.max(0, pot.target - pot.saved);
  if (!left) return 0;
  const [year, month] = today.split("-").map(Number);
  let months = 12;
  if (pot.by) {
    const [byYear, byMonth] = pot.by.split("-").map(Number);
    months = Math.max(1, (byYear - year) * 12 + (byMonth - month));
  }
  return Math.ceil(left / months / 10) * 10;
}

/** What a bank SMS says, read on this device. Nothing is sent anywhere. */
export type SmsGuess = { kind: Entry["kind"]; amount: number; merchant: string; category: string } | null;

const MERCHANTS: [RegExp, string][] = [
  [/swiggy|zomato|restaurant|cafe|food|dominos|mcdonald|kfc|bakery|hotel/i, "food"],
  [/uber|ola|rapido|irctc|metro|railway|bus|fuel|petrol|hpcl|bpcl|iocl|indigo|airline|fastag/i, "travel"],
  [/jio|airtel|vodafone|\bvi\b|bsnl|recharge|broadband/i, "phone"],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|mall|store|mart/i, "shopping"],
  [/netflix|spotify|hotstar|prime|youtube|bookmyshow|game|movie/i, "fun"],
  [/rent|landlord|society|maintenance/i, "rent"],
  [/electric|msedcl|bescom|tata power|adani|water|gas|bill/i, "bills"],
  [/pharma|apollo|medplus|hospital|clinic|lab|doctor/i, "health"],
  [/school|college|fees|tuition|university/i, "fees"],
  [/grocer|bigbasket|blinkit|zepto|dmart|kirana|instamart/i, "food"],
];

export function parseBankSms(text: string): SmsGuess {
  const clean = text.replace(/\s+/g, " ");
  const amountMatch = clean.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!amount || amount > 10_000_000) return null;
  const credit = /\b(credited|received|deposited|refund)\b/i.test(clean) && !/\bdebited\b/i.test(clean);
  const merchantMatch =
    clean.match(/(?:\bat|\bto|\bVPA|\bInfo:?|towards|for)\s+([A-Za-z0-9@._&' -]{3,40}?)(?:\s+(?:on|ref|upi|avl|bal|via|from|\.)|[.,]|$)/i) ??
    clean.match(/\bby\s+([A-Za-z0-9@._&' -]{3,30})/i);
  const merchant = (merchantMatch?.[1] ?? "").replace(/@.*/, "").trim();
  if (credit) return { kind: "in", amount, merchant, category: /salary|sal\b/i.test(clean) ? "salary" : "otherIn" };
  const category = MERCHANTS.find(([pattern]) => pattern.test(`${merchant} ${clean}`))?.[1] ?? "otherOut";
  return { kind: "out", amount, merchant, category };
}

export function emptyPlan(today: string): MoneyPlan {
  return { income: 0, payday: 1, budgets: {}, bills: [], pots: [], setAt: today };
}
