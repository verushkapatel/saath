import { describe, expect, it } from "vitest";
import { LANGS } from "@/lib/catalog";
import { parseAmount, ruleExtract } from "@/lib/extract";
import { SAMPLES } from "@/lib/samples";

describe("numbers", () => {
  it("reads Indian grouping, lakh, and Indic digits", () => {
    expect(parseAmount("Rs 1,50,000")).toBe(150000);
    expect(parseAmount("₹ 1,00,000")).toBe(100000);
    expect(parseAmount("१,५०,०००")).toBe(150000);
    expect(parseAmount("2 lakh")).toBe(200000);
  });
});

describe("extract samples", () => {
  it("reads the personal loan in every language", () => {
    for (const lang of LANGS) {
      const extraction = ruleExtract(SAMPLES[0].text[lang]);
      expect(extraction.documentType).toBe("personal_loan");
      expect(extraction.principal.value).toBe(150000);
      expect(extraction.interestRate.value).toBe(18);
      expect(extraction.rateType.value).toBe("flat");
      expect(extraction.tenureMonths.value).toBe(24);
      expect(extraction.processingFee.value).toBe(5250);
      expect(extraction.otherFees[0]?.amount).toBe(750);
      expect(extraction.prepaymentAllowed).toBe(false);
      expect(extraction.penaltyTerms[0]?.monthlyPercent).toBe(3);
      expect(extraction.lender.value).toMatch(/Northstar/);
    }
  });

  it("reads the gold loan in every language", () => {
    for (const lang of LANGS) {
      const extraction = ruleExtract(SAMPLES[1].text[lang]);
      expect(extraction.documentType).toBe("gold_loan");
      expect(extraction.principal.value).toBe(50000);
      expect(extraction.interestRate.value).toBe(12);
      expect(extraction.rateType.value).toBe("reducing");
      expect(extraction.tenureMonths.value).toBe(6);
      expect(extraction.processingFee.value).toBe(500);
      expect(extraction.prepaymentAllowed).toBe(true);
      expect(extraction.penaltyTerms[0]?.monthlyPercent).toBe(2);
      expect(extraction.collateral.value?.toLowerCase()).toMatch(/gold|सोन/);
    }
  });

  it("reads the scheme form in every language and does not invent a loan", () => {
    for (const lang of LANGS) {
      const extraction = ruleExtract(SAMPLES[2].text[lang]);
      expect(extraction.documentType).toBe("scheme_form");
      expect(extraction.principal.value).toBe(25000);
      expect(extraction.interestRate.unclear).toBe(true);
      expect(extraction.blanksToFill.length).toBeGreaterThan(0);
    }
  });
});
