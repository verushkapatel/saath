/**
 * The four units of the Skyward syllabus. Every lesson, path, drill and FinLit Check question belongs to one.
 * The order here is the order they are taught and shown.
 */
export const UNITS = ["own-money", "bank-paper", "borrow-safe", "how-money"] as const;
export type Unit = (typeof UNITS)[number];

/** The path to suggest when a unit turns out to be a student's weakest. */
export const UNIT_PATH: Record<Unit, string> = {
  "own-money": "first-budget",
  "bank-paper": "missing-money",
  "borrow-safe": "scam-shield",
  "how-money": "grow-savings",
};

/** Lessons, in syllabus order. The unit of each lesson is stored on the lesson in content/guide.json. */
export const LESSON_IDS = [
  "budget",
  "needs-wants",
  "pay-yourself",
  "true-cost",
  "subscription-traps",
  "lending-friends",
  "emergency-fund",
  "first-bank-account",
  "bank-charges",
  "money-missing",
  "why-pan",
  "payment-proof",
  "credit-score",
  "choosing-card",
  "upi-safety",
  "otp-pin",
  "tax-basics",
  "what-insurance",
  "health-cover",
  "pay-later",
  "guarantor",
  "what-interest",
  "what-emi",
  "flat-reducing",
  "fees",
  "reading-fees",
  "reading-agreement",
  "before-you-sign",
  "prepayment",
  "fake-loan-apps",
  "scam-calls",
  "job-scams",
  "double-money",
  "inflation",
  "simple-compound",
  "what-sip",
  "where-savings",
  "who-keeps-safe",
  "resume",
  "salary-slip",
  "kyc-basics",
  "nominee-matters",
  "govt-schemes",
  "family-money",
  "children-planning",
  "risk-diversify",
  "retirement-basics",
  "stock-market",
  "mutual-funds",
  "aif-pms",
  "ppf-explained",
  "retirement-accounts",
  "govt-bonds",
  "cheques",
  "demand-draft",
  "rbi-explained",
  "kinds-of-banks",
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
  "emergency-jar",
  "spend-smart",
  "bank-visit",
  "salary-slip",
  "missing-money",
  "upi-without-fear",
  "loan-scam",
  "first-loan-paper",
  "scholarship-safely",
  "scam-shield",
  "borrow-wisely",
  "grow-savings",
] as const;

/** The Day 2 activities, rebuilt for the phone. */
export const DRILL_IDS = ["scam", "form", "price", "stories"] as const;
export type DrillId = (typeof DRILL_IDS)[number];

export const DRILL_UNIT: Record<DrillId, Unit> = {
  scam: "borrow-safe",
  form: "bank-paper",
  price: "own-money",
  stories: "borrow-safe",
};

/** The daily question bank is tagged by topic. This places each topic in a unit. */
export const TOPIC_UNIT: Record<string, Unit> = {
  budgeting: "own-money",
  saving: "own-money",
  interest: "borrow-safe",
  loans: "borrow-safe",
  scams: "borrow-safe",
  insurance: "bank-paper",
  investing: "how-money",
  inflation: "how-money",
};

/**
 * The money areas the whole product is organised by. Guides, story episodes, daily questions, forms and
 * real-life stories each carry one, which is what lets Saath suggest the right thing to a person.
 */
export const TOPICS = [
  "banking", "budgeting", "saving", "income", "investing", "insurance", "borrowing",
  "tax", "schemes", "paperwork", "family", "retirement", "scams",
] as const;
export type Topic = (typeof TOPICS)[number];

/** The daily question bank uses older topic names. This maps them to the list above. */
export const QUESTION_TOPIC: Record<string, Topic> = {
  budgeting: "budgeting",
  saving: "saving",
  interest: "borrowing",
  loans: "borrowing",
  scams: "scams",
  insurance: "insurance",
  investing: "investing",
  inflation: "investing",
};

/** The life stages of the story, in order. One episode each. */
export const STAGE_IDS = [
  "early-adulthood", "first-job", "first-income", "banking", "budgeting", "saving", "investing",
  "insurance", "borrowing", "family-finances", "children", "long-term-planning", "financial-security", "retirement",
] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** The complete Verena journey, in narrative order. */
export const CHAPTER_IDS = [
  "first-resume", "first-job", "first-bank-account", "cheque-and-draft", "first-income", "early-adulthood", "saving", "insurance", "government-benefits", "bank-choice", "first-goal", "ppf-start", "tracking-spending", "receipt", "subscription-trap", "rent-lifestyle", "demat-first", "investing", "mutual-fund-plan", "market-fall", "financial-security", "scam-consequences", "medical-expense", "money-tight", "borrowing", "bad-loan-offer", "loan-repayment", "job-loss", "recovery", "fraud-attempt", "financial-reset", "budgeting", "rbi-ombudsman", "moving-home", "family-finances", "insurance-review", "taxes", "important-documents", "government-form", "kyc", "gold-loan", "children", "long-term-planning", "govt-bond-buy", "family-emergency", "pms-pitch", "helping-relative", "long-term-investing", "security-review", "thinking-retirement", "nps-epf-check", "retirement-plan", "late-life-shock", "retirement", "verena-looks-back",
] as const;

export const FORM_IDS = [
  "savings-account", "kyc-update", "nomination", "pan-application", "no-pan-declaration", "salary-tds-certificate",
  "no-tds-declaration", "loan-kfs", "gold-loan", "insurance-proposal", "jan-suraksha", "atal-pension",
  "sukanya-samriddhi", "epf-joining", "itr-1", "health-claim", "epf-claim", "ppf-account", "credit-card", "ayushman-card",
  "demat-account", "mutual-fund", "nps-account", "rbi-retail-direct", "demand-draft", "cheque", "pms-aif-agreement",
] as const;

export const LANGS = ["en", "hi", "mr"] as const;
export type Lang = (typeof LANGS)[number];

export const GRADES = ["9", "10", "11", "12"] as const;
export type Grade = (typeof GRADES)[number];
