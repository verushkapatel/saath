const LOCALES: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  kn: "kn-IN",
};

export function inr(amount: number, _lang?: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function inrExact(amount: number, _lang?: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function percent(amount: number, lang: string): string {
  return new Intl.NumberFormat(LOCALES[lang] ?? "en-IN", {
    maximumFractionDigits: 2,
  }).format(amount) + "%";
}

export function monthLabel(isoMonth: string, lang: string): string {
  const [year, month] = isoMonth.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function dayLabel(iso: string, lang: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** Keeps only digits and one decimal point, so a typed amount can be read back as a number. */
export function cleanAmount(raw: string): string {
  const folded = raw
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(/[೦-೯]/g, (digit) => String("೦೧೨೩೪೫೬೭೮೯".indexOf(digit)));
  const stripped = folded.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = stripped.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

/** 150000 becomes 1,50,000 while the user types. */
export function groupAmount(raw: string): string {
  const clean = cleanAmount(raw);
  if (!clean) return "";
  const [whole, fraction] = clean.split(".");
  const grouped = whole ? new Intl.NumberFormat("en-IN").format(Number(whole)) : "0";
  return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
}

export function parseAmountInput(raw: string): number | null {
  const clean = cleanAmount(raw);
  if (!clean || clean === ".") return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

export function weekdayLetter(iso: string, lang: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-IN", { weekday: "narrow" }).format(new Date(year, month - 1, day));
}
