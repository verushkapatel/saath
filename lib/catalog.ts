export const LESSON_IDS = [
  "budget",
  "needs-wants",
  "pay-yourself",
  "what-interest",
  "simple-compound",
  "what-emi",
  "flat-reducing",
  "fees",
  "prepayment",
  "credit-score",
  "reading-agreement",
  "upi-safety",
  "otp-pin",
  "fake-loan-apps",
  "job-scams",
  "what-insurance",
  "health-cover",
  "emergency-fund",
  "where-savings",
  "what-sip",
  "inflation",
  "tax-basics",
  "why-pan",
  "reading-fees",
  "before-you-sign",
] as const;

export const CASE_IDS = [
  "hidden-fees",
  "gold-emergency",
  "upi-pin",
  "blank-form",
  "store-emi",
  "whatsapp-tip",
  "fest-card",
  "room-deposit",
  "insurance-missold",
  "payday-app",
  "two-education-loans",
  "festival-spend",
] as const;

export const PATH_IDS = [
  "first-budget",
  "loan-scam",
  "first-loan-paper",
  "scholarship-safely",
  "emergency-jar",
  "upi-without-fear",
  "salary-slip",
  "bank-visit",
] as const;

export const CATEGORIES = ["budgeting", "loans", "scams", "savings", "insurance", "taxid"] as const;
export type Category = (typeof CATEGORIES)[number];

export const LANGS = ["en", "hi", "mr", "kn"] as const;
export type Lang = (typeof LANGS)[number];
