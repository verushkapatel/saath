import { todayISO } from "./dates";
import { loanFigures, type Figures } from "./finance";
import { totalFees } from "./flags";
import type { Extraction } from "./schema";

export function figuresFor(extraction: Extraction, startDate = todayISO()): Figures | null {
  const isLoan = extraction.documentType === "personal_loan" || extraction.documentType === "gold_loan";
  if (!isLoan) return null;
  const principal = extraction.principal.value;
  const rate = extraction.interestRate.value;
  const months = extraction.tenureMonths.value;
  const method = extraction.rateType.value;
  if (
    extraction.principal.unclear ||
    extraction.interestRate.unclear ||
    extraction.tenureMonths.unclear ||
    extraction.rateType.unclear ||
    principal === null ||
    rate === null ||
    months === null ||
    method === null
  ) {
    return null;
  }
  return loanFigures({
    principal,
    annualPercent: rate,
    months,
    method,
    fee: totalFees(extraction),
    startDate,
  });
}
