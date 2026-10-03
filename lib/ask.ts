import type { Extraction } from "./schema";

export type AskResult = {
  found: boolean;
  key: string;
  vars?: Record<string, string>;
};

const INTENTS: { id: string; words: string[] }[] = [
  { id: "rate", words: ["interest", "rate", "ब्याज", "व्याज", "ಬಡ್ಡಿ"] },
  { id: "fees", words: ["fee", "fees", "charge", "charges", "शुल्क", "फी", "शूल्क", "ಶುಲ್ಕ"] },
  { id: "penalty", words: ["penalty", "late", "overdue", "जुर्माना", "उशीर", "विलंब", "ದಂಡ"] },
  { id: "prepay", words: ["prepay", "prepayment", "foreclose", "early", "जल्दी", "पूर्वभुगतान", "आधी", "ಮುಂಗಡ"] },
  { id: "collateral", words: ["collateral", "gold", "pledge", "security", "गिरवी", "सोना", "ताराण", "ಅಡಮಾನ", "ಚಿನ್ನ"] },
  { id: "tenure", words: ["tenure", "months", "duration", "अवधि", "कालावधी", "महिने", "ಅವಧಿ", "ತಿಂಗಳು"] },
  { id: "lender", words: ["lender", "who", "bank", "ऋणदाता", "कोण", "सावकार"] },
  { id: "amount", words: ["principal", "amount", "borrow", "राशि", "रक्कम", "ಮೊತ್ತ", "ಮೂಲಧನ"] },
  { id: "blanks", words: ["blank", "empty", "fill", "खाली", "रिकामे", "ಖಾಲಿ"] },
];

function wordsOf(value: string): string[] {
  return value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2);
}

export function answerFromDocument(question: string, extraction: Extraction): AskResult {
  const asked = question.toLowerCase();
  const intent = INTENTS.find((item) => item.words.some((word) => asked.includes(word.toLowerCase())));

  if (intent?.id === "rate" && extraction.interestRate.clause) {
    return {
      found: !extraction.interestRate.unclear,
      key: extraction.interestRate.unclear ? "ask.unknown" : "ask.rate",
      vars: { clause: extraction.interestRate.clause, rate: String(extraction.interestRate.value ?? "") },
    };
  }
  if (intent?.id === "fees") {
    const clause = extraction.processingFee.clause ?? extraction.otherFees[0]?.clause;
    if (!clause) return { found: false, key: "ask.unknown" };
    return { found: true, key: "ask.fees", vars: { clause } };
  }
  if (intent?.id === "penalty") {
    const clause = extraction.penaltyTerms[0]?.clause;
    if (!clause) return { found: false, key: "ask.unknown" };
    return { found: true, key: "ask.penalty", vars: { clause } };
  }
  if (intent?.id === "prepay") {
    if (!extraction.prepaymentTerms.clause) return { found: false, key: "ask.unknown" };
    return { found: true, key: "ask.prepay", vars: { clause: extraction.prepaymentTerms.clause } };
  }
  if (intent?.id === "collateral") {
    if (!extraction.collateral.clause) return { found: false, key: "ask.unknown" };
    return { found: true, key: "ask.collateral", vars: { clause: extraction.collateral.clause } };
  }
  if (intent?.id === "tenure" && extraction.tenureMonths.clause) {
    return { found: !extraction.tenureMonths.unclear, key: extraction.tenureMonths.unclear ? "ask.unknown" : "ask.tenure", vars: { clause: extraction.tenureMonths.clause } };
  }
  if (intent?.id === "lender" && extraction.lender.value) {
    return { found: true, key: "ask.lender", vars: { name: extraction.lender.value } };
  }
  if (intent?.id === "amount" && extraction.principal.clause) {
    return { found: !extraction.principal.unclear, key: extraction.principal.unclear ? "ask.unknown" : "ask.amount", vars: { clause: extraction.principal.clause } };
  }
  if (intent?.id === "blanks") {
    if (!extraction.blanksToFill.length) return { found: false, key: "ask.unknown" };
    return { found: true, key: "ask.blanks", vars: { list: extraction.blanksToFill.join("; ") } };
  }

  const query = new Set(wordsOf(question));
  let best = "";
  let bestScore = 0;
  for (const sentence of extraction.sourceText.split(/\n+/)) {
    const score = wordsOf(sentence).filter((word) => query.has(word)).length;
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }
  if (bestScore >= 2) return { found: true, key: "ask.quote", vars: { clause: best } };
  return { found: false, key: "ask.unknown" };
}
