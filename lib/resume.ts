import { AI_URL } from "./config";
import { redact } from "./redact";

/** A resume, as Saath's template lays it out. Every field is plain text the person can edit. */
export type Resume = {
  name: string;
  headline: string;
  contact: string;
  summary: string;
  education: { title: string; place: string; dates: string; detail: string }[];
  experience: { title: string; place: string; dates: string; bullets: string[] }[];
  projects: { title: string; bullets: string[] }[];
  skills: string[];
  certifications: string[];
  languages: string[];
};

/** The questions Saath AI asks, in order. Answers are free text. */
export const RESUME_QUESTIONS = [
  "name", "contact", "role", "education", "experience", "projects", "achievements", "skills", "certifications", "languages",
] as const;
export type ResumeQuestion = (typeof RESUME_QUESTIONS)[number];
export type ResumeAnswers = Partial<Record<ResumeQuestion, string>>;

const lines = (text = "") => text.split(/\n|;|•/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
const list = (text = "") => text.split(/,|\n|;/).map((item) => item.trim()).filter(Boolean);
const sentence = (text: string) => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return `${clean[0].toUpperCase()}${clean.slice(1)}${/[.!?]$/.test(clean) ? "" : "."}`;
};

/**
 * The resume made on this device, from the answers alone, when Saath AI is offline. It uses the person's own words,
 * tidied into the template. Nothing is invented.
 */
export function localResume(answers: ResumeAnswers): Resume {
  const role = answers.role?.trim() ?? "";
  const education = lines(answers.education).map((line) => {
    const [title, place = "", dates = "", ...rest] = line.split(/\s*[,|–-]\s+/);
    return { title: title ?? line, place, dates, detail: rest.join(", ") };
  });
  const experience = lines(answers.experience).map((line) => {
    const [head, ...more] = line.split(/[:.]\s+/);
    const [title, place = "", dates = ""] = head.split(/\s*[,|–]\s+/);
    return { title: title ?? head, place, dates, bullets: more.length ? more.map(sentence) : [] };
  });
  const achievements = lines(answers.achievements).map(sentence);
  if (experience.length && achievements.length) experience[0].bullets.push(...achievements.slice(0, 3));
  return {
    name: answers.name?.trim() ?? "",
    headline: role,
    contact: answers.contact?.trim() ?? "",
    summary: role ? sentence(`${role} candidate${answers.skills ? ` skilled in ${list(answers.skills).slice(0, 3).join(", ")}` : ""}`) : "",
    education,
    experience,
    projects: lines(answers.projects).map((line) => ({ title: line.split(/[:.]\s+/)[0] ?? line, bullets: line.split(/[:.]\s+/).slice(1).map(sentence) })),
    skills: list(answers.skills),
    certifications: lines(answers.certifications),
    languages: list(answers.languages),
  };
}

function valid(value: unknown): value is Resume {
  const r = value as Resume;
  return Boolean(r) && typeof r.name === "string" && Array.isArray(r.experience) && Array.isArray(r.education) && Array.isArray(r.skills);
}

/**
 * Asks Saath AI to write the resume from the answers. Identity numbers are masked first. If the server is not set up,
 * is offline, or returns something that is not a resume, the device's own version is used instead.
 */
export async function draftResume(answers: ResumeAnswers, fetcher: typeof fetch = fetch): Promise<{ resume: Resume; via: "online" | "device" }> {
  const local = localResume(answers);
  if (!AI_URL || (typeof navigator !== "undefined" && !navigator.onLine)) return { resume: local, via: "device" };
  const input = RESUME_QUESTIONS.map((key) => `${key.toUpperCase()}: ${redact(answers[key] ?? "").slice(0, 600)}`).join("\n");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetcher(AI_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ task: "resume", lang: "en", input, context: null, progress: null, history: [], passages: [] }),
    });
    if (!response.ok) throw new Error("ai");
    const data = (await response.json()) as { text?: string };
    const raw = (data.text ?? "").replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    if (!valid(parsed)) throw new Error("shape");
    // The person's own name and contact are always kept exactly as typed.
    return { resume: { ...local, ...parsed, name: local.name || parsed.name, contact: local.contact || parsed.contact }, via: "online" };
  } catch {
    return { resume: local, via: "device" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lays the resume out on an A4 page as a real PDF file, with a small "Made by Saath AI" line at the foot of the page.
 * Built with jsPDF on the phone, so nothing is uploaded to make it.
 */
export async function resumePdf(resume: Resume, watermark = "Made by Saath AI"): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46;
  const NAVY: [number, number, number] = [20, 51, 107];
  const INK: [number, number, number] = [20, 20, 22];
  const MUTED: [number, number, number] = [90, 94, 102];
  let y = 0;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(resume.name || "Your Name", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  if (resume.headline) doc.text(resume.headline, M, 62);
  doc.setFontSize(9.5);
  if (resume.contact) doc.text(doc.splitTextToSize(resume.contact, W - 2 * M), M, 78);
  y = 116;

  const ensure = (needed: number) => {
    if (y + needed > H - 50) {
      doc.addPage();
      y = 50;
    }
  };
  const heading = (label: string) => {
    ensure(34);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(label.toUpperCase(), M, y);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(M, y + 5, W - M, y + 5);
    y += 20;
  };
  const para = (text: string, size = 10, color: [number, number, number] = INK, indent = 0) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, W - 2 * M - indent) as string[];
    ensure(wrapped.length * (size + 3));
    doc.text(wrapped, M + indent, y);
    y += wrapped.length * (size + 3) + 2;
  };
  const row = (left: string, right: string) => {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(left, M, y, { maxWidth: W - 2 * M - 110 });
    if (right) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(right, W - M, y, { align: "right" });
    }
    y += 14;
  };
  const bullets = (items: string[]) => {
    for (const item of items.filter(Boolean)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const wrapped = doc.splitTextToSize(item, W - 2 * M - 14) as string[];
      ensure(wrapped.length * 13);
      doc.text("•", M + 2, y);
      doc.text(wrapped, M + 14, y);
      y += wrapped.length * 13 + 1;
    }
  };

  if (resume.summary) { heading("Summary"); para(resume.summary); y += 4; }
  if (resume.experience.length) {
    heading("Experience");
    for (const job of resume.experience) {
      row([job.title, job.place].filter(Boolean).join(", "), job.dates);
      bullets(job.bullets);
      y += 6;
    }
  }
  if (resume.education.length) {
    heading("Education");
    for (const item of resume.education) {
      row([item.title, item.place].filter(Boolean).join(", "), item.dates);
      para(item.detail, 9.5, MUTED);
      y += 4;
    }
  }
  if (resume.projects.length) {
    heading("Projects and activities");
    for (const project of resume.projects) {
      row(project.title, "");
      bullets(project.bullets);
      y += 4;
    }
  }
  if (resume.skills.length) { heading("Skills"); para(resume.skills.join("  ·  ")); y += 4; }
  if (resume.certifications.length) { heading("Certifications"); bullets(resume.certifications); y += 4; }
  if (resume.languages.length) { heading("Languages"); para(resume.languages.join("  ·  ")); }

  // The small watermark on every page.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 154, 162);
    doc.text(watermark, W / 2, H - 20, { align: "center" });
  }
  return doc.output("blob");
}
