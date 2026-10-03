import { redact } from "./redact";
import {
  blankNumber,
  blankText,
  type Extraction,
  type NumberField,
  type TextField,
} from "./schema";

const DEV = "०१२३४५६७८९";
// Papers sometimes carry digits from a neighbouring script. Reading them costs nothing.
const KAN = "೦೧೨೩೪೫೬೭೮೯";

export function foldDigits(raw: string): string {
  return [...raw].map((ch) => {
    const d = DEV.indexOf(ch);
    if (d >= 0) return String(d);
    const k = KAN.indexOf(ch);
    if (k >= 0) return String(k);
    return ch;
  }).join("");
}

export function parseAmount(raw: string): number | null {
  const text = foldDigits(raw)
    .replace(/₹/g, " ")
    .replace(/rs\.?/gi, " ")
    .replace(/रु\.?/g, " ")
    .replace(/रुपये|रुपयां/gi, " ");
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*(lakh|लाख)/i);
  if (lakh) {
    const value = Number(lakh[1]) * 100_000;
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = text.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const indian = cleaned.match(/\d{1,2}(?:\s\d{2})+\s\d{3}(?:\.\d+)?/);
  if (indian) {
    const value = Number(indian[0].replace(/\s/g, ""));
    return Number.isFinite(value) ? value : null;
  }
  const thousands = cleaned.match(/\d{1,3}(?:\s\d{3})+(?:\.\d+)?/);
  if (thousands) {
    const value = Number(thousands[0].replace(/\s/g, ""));
    return Number.isFinite(value) ? value : null;
  }
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function fieldText(value: string | null, clause: string | null, unclear = value === null): TextField {
  return { value, unclear, clause };
}

function fieldNumber(value: number | null, clause: string | null): NumberField {
  return { value, unclear: value === null, clause };
}

function isBlank(value: string): boolean {
  return /_{2,}|^\s*$/.test(value.trim());
}

function norm(value: string): string {
  return foldDigits(value).toLowerCase();
}

function hasAny(hay: string, needles: string[]): boolean {
  return needles.some((needle) => hay.includes(needle));
}

const TYPE_GOLD = ["gold loan", "gold-loan", "सोने का कर्ज", "सोने का लोन", "सोन्याचे कर्ज", "gold slip"];
const TYPE_SCHEME = ["application form", "scheme:", "योजना", "अनुदान", "grant", "scholarship form", "ಯೋಜನೆ", "ಅರ್ಜಿ ನಮೂನೆ"];
const TYPE_PERSONAL = ["personal loan", "व्यक्तिगत ऋण", "पर्सनल लोन", "वैयक्तिक कर्ज", "ವೈಯಕ್ತಿಕ ಸಾಲ"];

const KEY_LENDER = ["lender", "ऋणदाता", "कर्ज देणारा", "कर्जदार संस्था", "bank", "बैंक", "scheme", "योजना", "ಸಾಲದಾತ", "ಯೋಜನೆ"];
const KEY_PRINCIPAL = ["principal", "मूलधन", "मुद्दल", "amount borrowed", "उधार", "ಮೂಲಧನ"];
const KEY_BENEFIT = ["benefit", "लाभ", "मदत", "grant amount", "अनुदान", "ಲಾಭ"];
const KEY_INTEREST = ["interest", "ब्याज", "व्याज", "rate", "दर", "ಬಡ್ಡಿ"];
const KEY_TENURE = ["tenure", "अवधि", "कालावधी", "duration", "period", "ಅವಧಿ"];
const KEY_FEE = ["processing fee", "processing", "प्रोसेसिंग", "प्रक्रिया शुल्क", "ಪ್ರಕ್ರಿಯೆ ಶುಲ್ಕ"];
const KEY_OTHER_FEE = ["other fee", "documentation", "अन्य शुल्क", "इतर शुल्क", "ಇತರ ಶುಲ್ಕ"];
const KEY_PENALTY = ["penalty", "late fee", "जुर्माना", "विलंब", "दंड", "ದಂಡ"];
const KEY_PREPAY = ["prepayment", "foreclosure", "पूर्वभुगतान", "पूर्वफेड", "ಮುಂಗಡ ಪಾವತಿ"];
const KEY_COLLATERAL = ["collateral", "security", "pledge", "गिरवी", "तारण", "ಅಡಮಾನ"];

const NOT_LOAN = ["not a loan", "कर्ज नहीं", "कर्ज नाही", "grant not loan", "ಸಾಲವಲ್ಲ"];
const FLAT = ["flat", "फ्लैट", "फ्लॅट", "ಫ್ಲಾಟ್"];
const REDUCING = ["reducing", "reducing balance", "घटता", "घटती", "कमी होणारी", "ಕಡಿಮೆಯಾಗುವ"];
const PREPAY_NO = ["not permitted", "not allowed", "cannot", "no prepayment", "अनुमति नहीं", "परवानगी नाही", "मनाही", "ಅನುಮತಿ ಇಲ್ಲ"];
const PREPAY_YES = ["allowed", "permitted", "without charge", "अनुमति", "परवानगी", "ಅನುಮತಿ"];
const YEAR = ["academic year", "one year", "शैक्षणिक वर्ष", "एक वर्ष", "ಶೈಕ್ಷಣಿಕ ವರ್ಷ"];

function findPair(
  pairs: { key: string; value: string; line: string }[],
  keys: string[],
) {
  return pairs.find((pair) => keys.some((key) => pair.key.includes(key) || norm(pair.key).includes(norm(key))));
}

function findLine(lines: string[], keys: string[]): string | undefined {
  return lines.find((line) => keys.some((key) => norm(line).includes(norm(key))));
}

export function ruleExtract(rawText: string): Extraction {
  const sourceText = redact(rawText);
  const folded = foldDigits(sourceText);
  const lines = folded.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pairs = lines.map((line) => {
    const index = line.search(/[:：]/);
    if (index === -1) return null;
    return { key: line.slice(0, index).trim().toLowerCase(), value: line.slice(index + 1).trim(), line };
  }).filter((pair): pair is { key: string; value: string; line: string } => Boolean(pair));

  const blob = norm(folded);
  let documentType: Extraction["documentType"] = "other";
  if (hasAny(blob, TYPE_GOLD.map(norm))) documentType = "gold_loan";
  else if (hasAny(blob, TYPE_SCHEME.map(norm))) documentType = "scheme_form";
  else if (hasAny(blob, TYPE_PERSONAL.map(norm))) documentType = "personal_loan";

  const lenderPair = findPair(pairs, KEY_LENDER);
  const principalPair = findPair(pairs, KEY_PRINCIPAL);
  const benefitPair = findPair(pairs, KEY_BENEFIT);
  const interestPair = findPair(pairs, KEY_INTEREST) ?? (findLine(lines, KEY_INTEREST) ? { key: "interest", value: findLine(lines, KEY_INTEREST) ?? "", line: findLine(lines, KEY_INTEREST) ?? "" } : undefined);
  const tenurePair = findPair(pairs, KEY_TENURE);
  const feePair = findPair(pairs, KEY_FEE);
  const prepayPair = findPair(pairs, KEY_PREPAY);
  const collateralPair = findPair(pairs, KEY_COLLATERAL);

  const interestText = interestPair?.value || interestPair?.line || "";
  const rateMatch = foldDigits(interestText).match(/(\d+(?:\.\d+)?)\s*%/);
  const rate = rateMatch ? Number(rateMatch[1]) : null;
  let rateType: "flat" | "reducing" | null = null;
  if (hasAny(norm(interestText), FLAT.map(norm))) rateType = "flat";
  else if (hasAny(norm(interestText), REDUCING.map(norm))) rateType = "reducing";

  let months: number | null = null;
  const tenureText = tenurePair?.value ?? "";
  const monthMatch = foldDigits(tenureText).match(/(\d+)\s*(month|महिने|महीने|माह|ತಿಂಗಳು)/i);
  if (monthMatch) months = Number(monthMatch[1]);
  else if (hasAny(norm(tenureText), YEAR.map(norm))) months = 12;
  else {
    const only = foldDigits(tenureText).match(/(\d+)/);
    if (only && /month|महि/i.test(tenureText + (tenurePair?.key ?? ""))) months = Number(only[1]);
  }

  const otherFees = pairs
    .filter((pair) => KEY_OTHER_FEE.some((key) => pair.key.includes(key) || norm(pair.key).includes(norm(key))))
    .map((pair) => {
      const amount = parseAmount(pair.value);
      return amount === null ? null : { name: pair.value.replace(/rs\.?\s*[\d,]+\s*/i, "").trim() || "Other fee", amount, clause: pair.line };
    })
    .filter((fee): fee is { name: string; amount: number; clause: string } => Boolean(fee));

  const penaltyTerms = pairs
    .filter((pair) => KEY_PENALTY.some((key) => pair.key.includes(key) || norm(pair.key).includes(norm(key))))
    .map((pair) => {
      const percent = foldDigits(pair.value).match(/(\d+(?:\.\d+)?)\s*%\s*(per month|प्रति माह|प्रति महिना|a month)?/i);
      return {
        text: pair.value,
        clause: pair.line,
        monthlyPercent: percent ? Number(percent[1]) : null,
      };
    });

  let prepaymentAllowed: boolean | null = null;
  if (prepayPair) {
    const value = norm(prepayPair.value);
    if (hasAny(value, PREPAY_NO.map(norm))) prepaymentAllowed = false;
    else if (hasAny(value, PREPAY_YES.map(norm))) prepaymentAllowed = true;
  }

  const blanksToFill = pairs.filter((pair) => isBlank(pair.value)).map((pair) => pair.line);

  const moneyPair = documentType === "scheme_form" ? (benefitPair ?? principalPair) : principalPair;
  const principal = moneyPair ? parseAmount(moneyPair.value) : null;
  const interestUnclear = rate === null || hasAny(norm(interestText), NOT_LOAN.map(norm));

  return {
    documentType,
    lender: lenderPair ? fieldText(lenderPair.value, lenderPair.line, false) : blankText(),
    principal: moneyPair ? fieldNumber(principal, moneyPair.line) : blankNumber(),
    interestRate: interestPair
      ? { value: interestUnclear ? null : rate, unclear: interestUnclear, clause: interestPair.line }
      : blankNumber(),
    rateType: interestPair
      ? { value: interestUnclear ? null : rateType, unclear: interestUnclear || rateType === null, clause: interestPair.line }
      : { value: null, unclear: true, clause: null },
    tenureMonths: tenurePair ? fieldNumber(months, tenurePair.line) : blankNumber(),
    processingFee: feePair ? fieldNumber(parseAmount(feePair.value), feePair.line) : { value: 0, unclear: false, clause: null },
    otherFees,
    penaltyTerms,
    prepaymentTerms: prepayPair ? fieldText(prepayPair.value, prepayPair.line, false) : blankText(),
    prepaymentAllowed,
    collateral: collateralPair ? fieldText(collateralPair.value, collateralPair.line, false) : blankText(),
    blanksToFill,
    sourceText,
  };
}

export function applyConfirmed(
  extraction: Extraction,
  edits: {
    principal: number | null;
    interestRate: number | null;
    tenureMonths: number | null;
    processingFee: number | null;
    rateType: "flat" | "reducing" | null;
    /** Other charges, edited apart from the processing fee. Leave out to fold everything into the fee. */
    otherFees?: number | null;
  },
): Extraction {
  const number = (current: NumberField, next: number | null): NumberField => ({
    value: next,
    unclear: next === null,
    clause: current.clause,
  });
  return {
    ...extraction,
    principal: number(extraction.principal, edits.principal),
    interestRate: number(extraction.interestRate, edits.interestRate),
    tenureMonths: number(extraction.tenureMonths, edits.tenureMonths),
    processingFee: number(extraction.processingFee, edits.processingFee),
    otherFees: edits.otherFees !== undefined
      ? (edits.otherFees && edits.otherFees > 0
        ? [{ name: extraction.otherFees[0]?.name ?? "Other charges", amount: edits.otherFees, clause: extraction.otherFees[0]?.clause ?? null }]
        : [])
      : edits.processingFee !== null ? [] : extraction.otherFees,
    rateType: {
      value: edits.rateType,
      unclear: edits.rateType === null,
      clause: extraction.rateType.clause,
    },
  };
}
