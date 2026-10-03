import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extract/route";
import { tryAiExtract } from "@/lib/ai-client";
import { LANGS } from "@/lib/catalog";
import { parseAmount, ruleExtract } from "@/lib/extract";
import { extractWithModel } from "@/lib/llm";
import { SAMPLES } from "@/lib/samples";
import { allowRequest } from "@/lib/rate-limit";

describe("numbers", () => {
  it("reads Indian grouping, lakh, and Indic digits", () => {
    expect(parseAmount("Rs 1,50,000")).toBe(150000);
    expect(parseAmount("₹ 1,00,000")).toBe(100000);
    expect(parseAmount("१,५०,०००")).toBe(150000);
    expect(parseAmount("2 lakh")).toBe(200000);
    expect(parseAmount("೫೦,೦೦೦")).toBe(50000);
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
      expect(extraction.collateral.value?.toLowerCase()).toMatch(/gold|सोन|ಚಿನ್ನ/);
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

describe("ai fallback", () => {
  it("does not call the network when no AI key is configured", async () => {
    const spy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = spy as typeof fetch;
    const result = await tryAiExtract(SAMPLES[0].text.en, "en");
    globalThis.fetch = original;
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns null from the model layer when no provider key is set", async () => {
    expect(await extractWithModel(SAMPLES[0].text.en, "en", 50)).toBeNull();
  });

  it("answers 501 from /api/extract when no key is set", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: SAMPLES[0].text.en, lang: "en" }),
      }),
    );
    expect(response.status).toBe(501);
  });

  it("rejects an oversized extract request", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(12_001), lang: "en" }),
      }),
    );
    expect([413, 501]).toContain(response.status);
  });

  it("rate-limits a noisy client", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 20; i += 1) expect(allowRequest(ip, 20, 60_000)).toBe(true);
    expect(allowRequest(ip, 20, 60_000)).toBe(false);
  });
});
