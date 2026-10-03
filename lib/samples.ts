import type { Lang } from "./catalog";
import { asset } from "./config";

export type SampleId = "personal-loan" | "gold-loan" | "scheme-form";

export type SampleDoc = {
  id: SampleId;
  image: string;
  text: Record<Lang, string>;
};

const PERSONAL_EN = [
  "NORTHSTAR FINANCE",
  "Personal Loan Agreement",
  "Lender: Northstar Finance Pvt Ltd",
  "Principal: Rs 1,50,000",
  "Interest: 18% per annum flat",
  "Tenure: 24 months",
  "Processing fee: Rs 5,250",
  "Other fee: Documentation Rs 750",
  "Penalty: 3% per month on the overdue amount",
  "Prepayment: Not permitted during the tenure",
  "Collateral: None",
].join("\n");

const GOLD_EN = [
  "PUNE GOLD VAULT",
  "Gold Loan Slip",
  "Lender: Pune Gold Vault",
  "Principal: Rs 50,000",
  "Interest: 12% per annum reducing balance",
  "Tenure: 6 months",
  "Processing fee: Rs 500",
  "Penalty: 2% per month after the due date",
  "Prepayment: Allowed without charge",
  "Collateral: 20 grams gold chain",
].join("\n");

const SCHEME_EN = [
  "STATE EDUCATION SUPPORT",
  "Application Form",
  "Scheme: State Education Support Grant",
  "Applicant name: ________",
  "Aadhaar: ________",
  "School: ________",
  "Annual family income: ________",
  "Benefit: Up to Rs 25,000 per year",
  "Interest: Not a loan",
  "Tenure: One academic year",
].join("\n");

const PERSONAL: Record<Lang, string> = {
  en: PERSONAL_EN,
  hi: [
    "NORTHSTAR FINANCE",
    "व्यक्तिगत ऋण समझौता",
    "ऋणदाता: Northstar Finance Pvt Ltd",
    "मूलधन: ₹ १,५०,०००",
    "ब्याज: 18% प्रति वर्ष फ्लैट",
    "अवधि: 24 महीने",
    "प्रोसेसिंग शुल्क: ₹ 5,250",
    "अन्य शुल्क: दस्तावेज़ ₹ 750",
    "जुर्माना: बकाया पर प्रति माह 3%",
    "पूर्वभुगतान: अवधि में अनुमति नहीं",
    "गिरवी: नहीं",
  ].join("\n"),
  mr: [
    "NORTHSTAR FINANCE",
    "वैयक्तिक कर्ज करार",
    "कर्ज देणारा: Northstar Finance Pvt Ltd",
    "मुद्दल: ₹ 1,50,000",
    "व्याज: 18% प्रति वर्ष फ्लॅट",
    "कालावधी: 24 महिने",
    "प्रोसेसिंग शुल्क: ₹ 5,250",
    "इतर शुल्क: कागदपत्र ₹ 750",
    "दंड: थकबाकीवर महिन्याला 3%",
    "पूर्वफेड: कालावधीत परवानगी नाही",
    "तारण: नाही",
  ].join("\n"),
};

const GOLD: Record<Lang, string> = {
  en: GOLD_EN,
  hi: [
    "PUNE GOLD VAULT",
    "सोने का कर्ज पर्ची",
    "ऋणदाता: Pune Gold Vault",
    "मूलधन: ₹ 50,000",
    "ब्याज: 12% प्रति वर्ष घटता बैलेंस",
    "अवधि: 6 महीने",
    "प्रोसेसिंग शुल्क: ₹ 500",
    "जुर्माना: तारीख बाद प्रति माह 2%",
    "पूर्वभुगतान: बिना शुल्क अनुमति",
    "गिरवी: 20 ग्राम सोने की चेन",
  ].join("\n"),
  mr: [
    "PUNE GOLD VAULT",
    "सोन्याचे कर्ज चिठ्ठी",
    "कर्ज देणारा: Pune Gold Vault",
    "मुद्दल: ₹ 50,000",
    "व्याज: 12% प्रति वर्ष कमी होणारी शिल्लक",
    "कालावधी: 6 महिने",
    "प्रोसेसिंग शुल्क: ₹ 500",
    "दंड: तारखेनंतर महिन्याला 2%",
    "पूर्वफेड: शुल्काशिवाय परवानगी",
    "तारण: 20 ग्रॅम सोन्याची साखळी",
  ].join("\n"),
};

const SCHEME: Record<Lang, string> = {
  en: SCHEME_EN,
  hi: [
    "STATE EDUCATION SUPPORT",
    "आवेदन फॉर्म",
    "योजना: State Education Support Grant",
    "आवेदक नाम: ________",
    "आधार: ________",
    "स्कूल: ________",
    "वार्षिक पारिवारिक आय: ________",
    "लाभ: प्रति वर्ष ₹ 25,000 तक",
    "ब्याज: कर्ज नहीं",
    "अवधि: एक शैक्षणिक वर्ष",
  ].join("\n"),
  mr: [
    "STATE EDUCATION SUPPORT",
    "अर्ज",
    "योजना: State Education Support Grant",
    "अर्जदाराचे नाव: ________",
    "आधार: ________",
    "शाळा: ________",
    "वार्षिक कौटुंबिक उत्पन्न: ________",
    "मदत: वर्षाला ₹ 25,000 पर्यंत",
    "व्याज: कर्ज नाही",
    "कालावधी: एक शैक्षणिक वर्ष",
  ].join("\n"),
};

export const SAMPLES: SampleDoc[] = [
  { id: "personal-loan", image: asset("/samples/personal-loan.png"), text: PERSONAL },
  { id: "gold-loan", image: asset("/samples/gold-loan.png"), text: GOLD },
  { id: "scheme-form", image: asset("/samples/scheme-form.png"), text: SCHEME },
];

export function sampleById(id: string): SampleDoc | undefined {
  return SAMPLES.find((sample) => sample.id === id);
}
