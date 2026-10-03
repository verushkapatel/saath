const AADHAAR = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const PHONE = /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
const ACCOUNT = /\b\d{9,18}\b/g;

export function redact(text: string): string {
  return text
    .replace(AADHAAR, "[aadhaar hidden]")
    .replace(PAN, "[pan hidden]")
    .replace(PHONE, "[phone hidden]")
    .replace(ACCOUNT, "[account hidden]");
}
