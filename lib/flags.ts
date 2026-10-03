import type { Extraction } from "./schema";

export type Severity = "high" | "medium" | "low";

export type Flag = {
  id: "high-rate" | "high-fees" | "flat-rate" | "high-penalty" | "no-prepay" | "blanks" | "unclear";
  severity: Severity;
  clause: string | null;
  vars?: Record<string, string>;
};

const HIGH_RATE: Record<Extraction["documentType"], { flat: number; reducing: number }> = {
  personal_loan: { flat: 12, reducing: 24 },
  gold_loan: { flat: 12, reducing: 18 },
  scheme_form: { flat: 100, reducing: 100 },
  other: { flat: 18, reducing: 24 },
};

export function totalFees(extraction: Extraction): number {
  const processing = extraction.processingFee.value ?? 0;
  const other = extraction.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
  return processing + other;
}

export function riskFlags(extraction: Extraction, yearly?: number | null): Flag[] {
  const flags: Flag[] = [];
  const isLoan = extraction.documentType === "personal_loan" || extraction.documentType === "gold_loan";

  const rate = extraction.interestRate.value;
  const rateType = extraction.rateType.value;
  if (isLoan && rate !== null && rateType) {
    const band = HIGH_RATE[extraction.documentType][rateType];
    if (rate > band) {
      flags.push({
        id: "high-rate",
        severity: "high",
        clause: extraction.interestRate.clause,
        vars: yearly != null ? { rate: String(yearly) } : undefined,
      });
    }
  }

  const principal = extraction.principal.value;
  const fees = totalFees(extraction);
  if (isLoan && principal && principal > 0 && fees / principal > 0.03) {
    flags.push({
      id: "high-fees",
      severity: "medium",
      clause: extraction.processingFee.clause ?? extraction.otherFees[0]?.clause ?? null,
    });
  }

  if (isLoan && extraction.rateType.value === "flat") {
    flags.push({ id: "flat-rate", severity: "medium", clause: extraction.rateType.clause });
  }

  const penalty = extraction.penaltyTerms.find((term) => (term.monthlyPercent ?? 0) >= 2);
  if (penalty) {
    flags.push({ id: "high-penalty", severity: "high", clause: penalty.clause });
  }

  if (isLoan && extraction.prepaymentAllowed === false) {
    flags.push({ id: "no-prepay", severity: "medium", clause: extraction.prepaymentTerms.clause });
  }

  if (extraction.blanksToFill.length > 0) {
    flags.push({ id: "blanks", severity: "medium", clause: extraction.blanksToFill[0] ?? null });
  }

  const missingCore = isLoan && (
    extraction.principal.unclear ||
    extraction.interestRate.unclear ||
    extraction.tenureMonths.unclear ||
    extraction.rateType.unclear
  );
  if (missingCore) {
    flags.push({ id: "unclear", severity: "low", clause: null });
  }

  return flags;
}

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/** Most serious first. Flags of the same weight keep the order they were found in. */
export function sortFlags(flags: Flag[]): Flag[] {
  return flags.map((flag, index) => ({ flag, index }))
    .sort((a, b) => RANK[a.flag.severity] - RANK[b.flag.severity] || a.index - b.index)
    .map((item) => item.flag);
}
