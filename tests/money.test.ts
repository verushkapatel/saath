import { describe, expect, it } from "vitest";
import { applyConfirmed, ruleExtract } from "@/lib/extract";
import { explainBlocks } from "@/lib/explain";
import { riskFlags, sortFlags, totalFees } from "@/lib/flags";
import { cleanAmount, groupAmount, parseAmountInput } from "@/lib/format";
import { insightFor, loggedDays, weekSummary } from "@/lib/insights";
import { figuresFor } from "@/lib/pipeline";
import { redact } from "@/lib/redact";
import { SAMPLES } from "@/lib/samples";

const entry = (date: string, kind: "in" | "out" | "save", category: string, amount: number) => ({ date, kind, category, amount });

describe("confirm screen figures", () => {
  it("shows the processing fee that the clause states, apart from other charges", () => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    expect(extraction.processingFee.value).toBe(5250);
    expect(extraction.processingFee.clause).toContain("5,250");
    expect(extraction.otherFees.reduce((sum, fee) => sum + fee.amount, 0)).toBe(750);
    expect(totalFees(extraction)).toBe(6000);
  });

  it("keeps both figures when they are confirmed separately", () => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    const next = applyConfirmed(extraction, {
      principal: 150000, interestRate: 18, tenureMonths: 24, processingFee: 5250, otherFees: 750, rateType: "flat",
    });
    expect(next.processingFee.value).toBe(5250);
    expect(totalFees(next)).toBe(6000);
    expect(figuresFor(next, "2026-01-15")?.received).toBe(144000);
    const none = applyConfirmed(extraction, {
      principal: 150000, interestRate: 18, tenureMonths: 24, processingFee: 5250, otherFees: 0, rateType: "flat",
    });
    expect(totalFees(none)).toBe(5250);
  });

  it("builds the four result blocks from the same numbers", () => {
    const extraction = ruleExtract(SAMPLES[0].text.en);
    const figures = figuresFor(extraction, "2026-01-15")!;
    const blocks = explainBlocks(extraction, figures, (amount) => `Rs ${amount}`);
    expect(blocks.map((block) => block.id)).toEqual(["get", "payBack", "yearly", "late"]);
    expect(blocks[0].lines[0].vars).toEqual({ received: "Rs 144000", fees: "Rs 6000" });
    expect(blocks[1].lines[0].vars).toMatchObject({ emi: "Rs 8500", months: "24", extra: "Rs 54000" });
    expect(figures.totalRepayment - 150000).toBe(54000);
  });

  it("puts the most serious flags first", () => {
    const flags = sortFlags(riskFlags(ruleExtract(SAMPLES[0].text.en)));
    expect(flags.map((flag) => flag.severity)).toEqual(["high", "high", "medium", "medium", "medium"]);
    expect(flags.slice(0, 2).map((flag) => flag.id)).toEqual(["high-rate", "high-penalty"]);
  });
});

describe("rupee input", () => {
  it("groups the Indian way while typing", () => {
    expect(groupAmount("150000")).toBe("1,50,000");
    expect(groupAmount("5250.5")).toBe("5,250.5");
    expect(groupAmount("")).toBe("");
  });

  it("reads back what was typed, including Devanagari digits", () => {
    expect(parseAmountInput("1,50,000")).toBe(150000);
    expect(parseAmountInput("₹ १,५००")).toBe(1500);
    expect(parseAmountInput("")).toBeNull();
    expect(cleanAmount("12.3.45")).toBe("12.34");
  });
});

describe("tracker insights", () => {
  it("waits for three logged days", () => {
    const two = [entry("2026-10-01", "out", "food", 50), entry("2026-10-02", "out", "food", 60)];
    expect(loggedDays(two)).toBe(2);
    expect(insightFor(two)).toBeNull();
  });

  it("names the largest category from the user's own entries", () => {
    const entries = [
      entry("2026-10-01", "out", "food", 300),
      entry("2026-10-02", "out", "travel", 100),
      entry("2026-10-03", "out", "food", 100),
    ];
    expect(insightFor(entries)).toEqual({ key: "insight.topCategory", category: "food", share: 80 });
  });

  it("falls back to the share saved, then to a daily average", () => {
    const saver = [
      entry("2026-10-01", "in", "pocket", 1000),
      entry("2026-10-02", "save", "jar", 100),
      entry("2026-10-03", "out", "food", 50),
    ];
    expect(insightFor(saver)).toEqual({ key: "insight.savedShare", share: 10 });
    const spender = [
      entry("2026-10-01", "out", "food", 40),
      entry("2026-10-02", "out", "food", 60),
      entry("2026-10-03", "out", "food", 50),
    ];
    expect(insightFor(spender)).toEqual({ key: "insight.dailyAverage", amount: 50 });
  });

  it("sums the last seven days only", () => {
    const entries = [
      entry("2026-09-20", "out", "food", 999),
      entry("2026-10-01", "out", "food", 40),
      entry("2026-10-05", "save", "jar", 20),
    ];
    expect(weekSummary(entries, "2026-10-05")).toEqual({ in: 0, out: 40, save: 20, days: 2 });
  });
});

describe("redaction", () => {
  it("hides identity numbers in Hindi and Marathi papers too", () => {
    const hidden = redact("आधार: 1234 5678 9012\nपॅन: ABCDE1234F\nफोन: +91 9876543210");
    expect(hidden).not.toMatch(/\d{4}\s\d{4}\s\d{4}/);
    expect(hidden).not.toContain("ABCDE1234F");
    expect(hidden).not.toContain("9876543210");
  });

  it("leaves loan figures alone", () => {
    const text = "Principal: Rs 1,50,000\nInterest: 18% per annum flat\nTenure: 24 months";
    expect(redact(text)).toBe(text);
  });

  it("is applied before the rule reader keeps any text", () => {
    const extraction = ruleExtract(`${SAMPLES[2].text.en}\nAadhaar: 1234 5678 9012`);
    expect(extraction.sourceText).not.toContain("1234 5678 9012");
    expect(extraction.sourceText).toContain("[aadhaar hidden]");
  });
});
