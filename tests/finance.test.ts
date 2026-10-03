import { describe, expect, it } from "vitest";
import { figuresFor } from "@/lib/pipeline";
import { SAMPLES } from "@/lib/samples";
import { ruleExtract } from "@/lib/extract";
import { riskFlags } from "@/lib/flags";
import {
  buildSchedule,
  effectiveAnnualRate,
  emiFlat,
  emiReducing,
  loanFigures,
  totalInterest,
  totalRepayment,
} from "@/lib/finance";

const START = "2026-01-15";

describe("finance", () => {
  it("computes a known reducing EMI", () => {
    expect(emiReducing(100000, 12, 12)).toBe(8884.88);
    const figures = loanFigures({
      principal: 100000,
      annualPercent: 12,
      months: 12,
      method: "reducing",
      fee: 0,
      startDate: START,
    });
    expect(figures.schedule).toHaveLength(12);
    expect(figures.schedule.at(-1)?.balance).toBe(0);
    expect(figures.totalRepayment).toBeCloseTo(106618.55, 0);
    expect(figures.totalInterest).toBe(totalInterest(figures.totalRepayment, 100000));
    expect(figures.effectiveAnnualRate).toBeCloseTo(12.68, 1);
    expect(totalRepayment(8884.88, 12)).toBe(106618.56);
  });

  it("computes a known flat loan and a higher total than reducing", () => {
    expect(emiFlat(100000, 12, 12)).toBe(9333.33);
    const figures = loanFigures({
      principal: 100000,
      annualPercent: 12,
      months: 12,
      method: "flat",
      fee: 0,
      startDate: START,
    });
    expect(figures.totalInterest).toBe(12000);
    expect(figures.totalRepayment).toBe(112000);
    expect(figures.comparison.flat.totalRepayment).toBeGreaterThan(figures.comparison.reducing.totalRepayment);
    expect(figures.schedule.at(-1)?.balance).toBe(0);
  });

  it("raises the yearly cost when fees are kept back", () => {
    const payments = buildSchedule(100000, 12, 12, "reducing", START).map((row) => row.payment);
    expect(effectiveAnnualRate(100000, payments)).toBeCloseTo(12.68, 1);
    expect(effectiveAnnualRate(95000, payments)).toBeCloseTo(24.18, 1);
  });

  it("prices the personal-loan sample", () => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    const figures = figuresFor(extraction, START);
    expect(figures).not.toBeNull();
    expect(figures?.emi).toBe(8500);
    expect(figures?.totalRepayment).toBe(204000);
    expect(figures?.fee).toBe(6000);
    expect(figures?.received).toBe(144000);
    expect(figures?.effectiveAnnualRate).toBeCloseTo(42.52, 1);
    expect(figures?.comparison.reducing.emi).toBeCloseTo(7488.62, 2);
    expect(figures?.schedule.at(-1)?.balance).toBe(0);
  });

  it("prices the gold-loan sample", () => {
    const extraction = ruleExtract(SAMPLES[1].text.en);
    const figures = figuresFor(extraction, START);
    expect(figures?.method).toBe("reducing");
    expect(figures?.emi).toBe(8627.42);
    expect(figures?.totalRepayment).toBeCloseTo(51764.51, 1);
    expect(figures?.totalInterest).toBeCloseTo(1764.51, 1);
    expect(figures?.effectiveAnnualRate).toBeCloseTo(16.67, 1);
    expect(figures?.comparison.flat.totalRepayment).toBe(53000);
  });
});

describe("flags", () => {
  it("flags the personal loan for flat rate, fees, penalty, prepayment, and a high rate", () => {
    const ids = riskFlags(ruleExtract(SAMPLES[0].text.en)).map((flag) => flag.id);
    expect(ids).toEqual(["high-rate", "high-fees", "flat-rate", "high-penalty", "no-prepay"]);
  });

  it("flags only the gold-loan penalty", () => {
    const ids = riskFlags(ruleExtract(SAMPLES[1].text.en)).map((flag) => flag.id);
    expect(ids).toEqual(["high-penalty"]);
  });

  it("flags blank lines on the scheme form and does not invent a loan", () => {
    const extraction = ruleExtract(SAMPLES[2].text.en);
    expect(extraction.documentType).toBe("scheme_form");
    expect(figuresFor(extraction, START)).toBeNull();
    expect(riskFlags(extraction).map((flag) => flag.id)).toEqual(["blanks"]);
    expect(extraction.blanksToFill.length).toBeGreaterThan(0);
  });
});
