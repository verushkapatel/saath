import type { Figures } from "./finance";
import { totalFees } from "./flags";
import type { Extraction } from "./schema";

export type Line = { key: string; vars?: Record<string, string> };

export type ExplanationPlan = {
  heroLabel: string;
  heroAmount: number | null;
  heroNote: string | null;
  lines: Line[];
  comparison: { flat: string; reducing: string } | null;
};

export function planExplanation(
  extraction: Extraction,
  figures: Figures | null,
  text: (amount: number) => string,
): ExplanationPlan {
  const lender = extraction.lender.value ?? "";
  const isLoan = extraction.documentType === "personal_loan" || extraction.documentType === "gold_loan";

  if (!isLoan) {
    return {
      heroLabel: "result.supportLabel",
      heroAmount: extraction.principal.value,
      heroNote: "result.notALoan",
      lines: [
        { key: "result.schemeBody", vars: { name: lender, amount: extraction.principal.value ? text(extraction.principal.value) : "" } },
        ...(extraction.blanksToFill.length ? [{ key: "result.blanksBody", vars: { count: String(extraction.blanksToFill.length) } }] : []),
      ],
      comparison: null,
    };
  }

  if (!figures) {
    return {
      heroLabel: "result.unclearHero",
      heroAmount: null,
      heroNote: "result.missingNumbers",
      lines: [{ key: "result.missingNumbers" }],
      comparison: null,
    };
  }

  const fees = totalFees(extraction);
  const lines: Line[] = [
    {
      key: "result.borrow",
      vars: { principal: text(extraction.principal.value ?? 0), lender },
    },
    {
      key: "result.repay",
      vars: { total: text(figures.totalRepayment), months: String(extraction.tenureMonths.value ?? figures.schedule.length) },
    },
  ];

  if (fees > 0) {
    lines.push({
      key: "result.fees",
      vars: { fees: text(fees), received: text(figures.received) },
    });
  }

  if (figures.effectiveAnnualRate !== null) {
    lines.push({ key: "result.yearly", vars: { rate: String(figures.effectiveAnnualRate) } });
  } else {
    lines.push({ key: "result.yearlyUnclear" });
  }

  const penalty = extraction.penaltyTerms[0];
  if (penalty) lines.push({ key: "result.lateKnown", vars: { penalty: penalty.text } });
  else lines.push({ key: "result.lateUnclear" });

  return {
    heroLabel: "result.heroLabel",
    heroAmount: figures.totalRepayment,
    heroNote: null,
    lines,
    comparison: {
      flat: text(figures.comparison.flat.totalRepayment),
      reducing: text(figures.comparison.reducing.totalRepayment),
    },
  };
}

export function checklistIds(extraction: Extraction): string[] {
  const isLoan = extraction.documentType === "personal_loan" || extraction.documentType === "gold_loan";
  if (!isLoan) return ["eligibility", "notALoan", "blanks", "documents"];
  const ids = ["fees", "rate", "prepay", "late", "lender"];
  if (extraction.collateral.value && !/none/i.test(extraction.collateral.value)) ids.push("collateral");
  if (extraction.blanksToFill.length) ids.push("blanks");
  return ids;
}

export type Block = {
  id: "get" | "payBack" | "yearly" | "late";
  lines: Line[];
};

/** The four short blocks on a loan result: what you get, what you pay back, the yearly cost, and paying late. */
export function explainBlocks(
  extraction: Extraction,
  figures: Figures,
  text: (amount: number) => string,
): Block[] {
  const fees = totalFees(extraction);
  const months = String(extraction.tenureMonths.value ?? figures.schedule.length);
  const penalty = extraction.penaltyTerms[0];
  return [
    {
      id: "get",
      lines: fees > 0
        ? [{ key: "result.getFees", vars: { received: text(figures.received), fees: text(fees) } }]
        : [{ key: "result.getPlain", vars: { received: text(figures.received) } }],
    },
    {
      id: "payBack",
      lines: [{ key: "result.payBackLine", vars: { emi: text(figures.emi), months, extra: text(Math.max(0, figures.totalRepayment - (extraction.principal.value ?? 0))) } }],
    },
    {
      id: "yearly",
      lines: figures.effectiveAnnualRate !== null
        ? [{ key: "result.yearlyLine", vars: { rate: String(figures.effectiveAnnualRate), printed: String(extraction.interestRate.value ?? "") } }]
        : [{ key: "result.yearlyUnclear" }],
    },
    {
      id: "late",
      lines: penalty ? [{ key: "result.lateLine", vars: { penalty: penalty.text } }] : [{ key: "result.lateUnclear" }],
    },
  ];
}
