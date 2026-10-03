/**
 * Reads the words on a photographed receipt and suggests what to log.
 * It only ever suggests. The person checks every value and presses save themselves.
 */
export type ReceiptGuess = {
  total: number | null;
  /** YYYY-MM-DD, when a date was printed and could be read. */
  date: string | null;
  merchant: string | null;
  category: string | null;
  /** "good" when a line that says total was found. "low" when the amount is only the largest number seen. "none" when nothing usable was read. */
  confidence: "good" | "low" | "none";
};

const TOTAL_WORDS = /(grand\s*total|net\s*(amount|payable|total)|amount\s*(payable|due|paid)|total\s*(amount|payable|due)?|bill\s*amount|कुल|एकूण|योग)/i;
const NOT_TOTAL = /(sub\s*total|subtotal|total\s*(qty|items|savings|discount|tax|gst)|उप)/i;
const AMOUNT = /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

const CATEGORY_WORDS: [string, RegExp][] = [
  ["food", /(restaurant|cafe|hotel|kitchen|foods?|bakery|sweets|dairy|grocery|kirana|mart|supermarket|vegetable|swiggy|zomato|tea|chai|bhojan|भोजन|किराणा)/i],
  ["travel", /(petrol|diesel|fuel|metro|bus|rail|irctc|taxi|cab|auto|uber|ola|toll|parking|पेट्रोल)/i],
  ["phone", /(recharge|mobile|telecom|airtel|jio|vodafone|bsnl|broadband|data\s*pack)/i],
  ["fees", /(school|college|tuition|fees?\b|exam|stationery|books?\b|xerox|फी)/i],
  ["fun", /(cinema|movie|pvr|inox|game|netflix|hotstar|spotify)/i],
];

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

const DATE_IN_LINE = /\b\d{1,2}[\/.-]\d{1,2}[\/.-](\d{2}|\d{4})\b|\b\d{1,2}[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,-]*\d{4}\b|\b\d{1,2}:\d{2}(:\d{2})?\b/gi;

function amountsIn(raw: string): number[] {
  // A date or a time is never an amount: "01/10/2026" must not become ₹2,026.
  const line = raw.replace(DATE_IN_LINE, " ");
  const found: number[] = [];
  for (const match of line.matchAll(AMOUNT)) {
    const value = toNumber(match[1]);
    // Skip phone numbers, bill numbers and years: money on a small receipt is not eight digits long.
    if (!Number.isFinite(value) || value <= 0 || value >= 10_000_000) continue;
    if (/^\d{5,}$/.test(match[1])) continue;
    found.push(value);
  }
  return found;
}

function readDate(text: string): string | null {
  const numeric = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const named = text.match(/\b(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,-]*(\d{4})\b/i);
  if (named) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[2].toLowerCase()) + 1;
    return `${named[3]}-${String(month).padStart(2, "0")}-${String(Number(named[1])).padStart(2, "0")}`;
  }
  return null;
}

export function parseReceipt(text: string): ReceiptGuess {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (lines.length === 0 || letters < 6) return { total: null, date: null, merchant: null, category: null, confidence: "none" };

  let total: number | null = null;
  let confidence: ReceiptGuess["confidence"] = "none";
  const totalLines = lines.filter((line) => TOTAL_WORDS.test(line) && !NOT_TOTAL.test(line));
  const fromTotals = totalLines.flatMap(amountsIn);
  if (fromTotals.length) {
    total = Math.max(...fromTotals);
    confidence = "good";
  } else {
    const every = lines.flatMap(amountsIn);
    if (every.length) {
      total = Math.max(...every);
      confidence = "low";
    }
  }

  const merchant = lines.find((line) => (line.match(/\p{L}/gu) ?? []).length >= 3 && !TOTAL_WORDS.test(line) && !/^(tax|gst|invoice|bill|receipt|date|time)\b/i.test(line)) ?? null;
  const category = CATEGORY_WORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

  return { total, date: readDate(text), merchant: merchant ? merchant.slice(0, 40) : null, category, confidence };
}
