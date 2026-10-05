"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, Download, Mic, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { draftResume, RESUME_QUESTIONS, resumePdf, type Resume, type ResumeAnswers, type ResumeQuestion } from "@/lib/resume";
import { canHear, dictate, tap } from "@/lib/speech";
import { getMeta, setMeta } from "@/lib/storage";
import { useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { LogoMark } from "./logo";
import { useI18n } from "./providers";

const KEY = "resume";
type Saved = { answers: ResumeAnswers; resume: Resume | null; downloaded?: boolean };

/** The Saath resume template, drawn on screen exactly as the PDF lays it out. */
function Paper({ resume }: { resume: Resume }) {
  return (
    <article className="resume-paper" data-testid="resume-preview">
      <header>
        <h2>{resume.name || "Your Name"}</h2>
        {resume.headline && <p className="resume-headline">{resume.headline}</p>}
        {resume.contact && <p className="resume-contact">{resume.contact}</p>}
      </header>
      {resume.summary && <section><h3>Summary</h3><p>{resume.summary}</p></section>}
      {resume.experience.length > 0 && (
        <section><h3>Experience</h3>
          {resume.experience.map((job, index) => (
            <div key={index} className="resume-item">
              <p className="resume-row"><b>{[job.title, job.place].filter(Boolean).join(", ")}</b><span>{job.dates}</span></p>
              <ul>{job.bullets.filter(Boolean).map((bullet, at) => <li key={at}>{bullet}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {resume.education.length > 0 && (
        <section><h3>Education</h3>
          {resume.education.map((item, index) => (
            <div key={index} className="resume-item">
              <p className="resume-row"><b>{[item.title, item.place].filter(Boolean).join(", ")}</b><span>{item.dates}</span></p>
              {item.detail && <p className="resume-detail">{item.detail}</p>}
            </div>
          ))}
        </section>
      )}
      {resume.projects.length > 0 && (
        <section><h3>Projects and activities</h3>
          {resume.projects.map((project, index) => (
            <div key={index} className="resume-item"><p className="resume-row"><b>{project.title}</b></p><ul>{project.bullets.filter(Boolean).map((bullet, at) => <li key={at}>{bullet}</li>)}</ul></div>
          ))}
        </section>
      )}
      {resume.skills.length > 0 && <section><h3>Skills</h3><p>{resume.skills.join("  ·  ")}</p></section>}
      {resume.certifications.length > 0 && <section><h3>Certifications</h3><ul>{resume.certifications.map((item, at) => <li key={at}>{item}</li>)}</ul></section>}
      {resume.languages.length > 0 && <section><h3>Languages</h3><p>{resume.languages.join("  ·  ")}</p></section>}
      <footer>Made by Saath AI</footer>
    </article>
  );
}

/** Editing in plain boxes: one line per bullet, commas between skills. */
function Editor({ resume, onChange }: { resume: Resume; onChange: (next: Resume) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<Resume>) => onChange({ ...resume, ...patch });
  const field = (label: string, value: string, apply: (value: string) => void, rows = 1) => (
    <label className="resume-field">
      <span>{label}</span>
      {rows > 1 ? <textarea rows={rows} value={value} onChange={(event) => apply(event.target.value)} /> : <input value={value} onChange={(event) => apply(event.target.value)} />}
    </label>
  );
  return (
    <div className="stack-sm resume-editor" data-testid="resume-editor">
      {field(t("resume.f.name"), resume.name, (value) => set({ name: value }))}
      {field(t("resume.f.headline"), resume.headline, (value) => set({ headline: value }))}
      {field(t("resume.f.contact"), resume.contact, (value) => set({ contact: value }))}
      {field(t("resume.f.summary"), resume.summary, (value) => set({ summary: value }), 3)}
      {resume.experience.map((job, index) => (
        <fieldset key={`e${index}`} className="resume-group">
          <legend>{t("resume.f.job", { n: index + 1 })}<button type="button" className="icon-btn ghost" aria-label={t("resume.remove")} onClick={() => set({ experience: resume.experience.filter((_, at) => at !== index) })}><Trash2 aria-hidden size={15} /></button></legend>
          {field(t("resume.f.title"), job.title, (value) => set({ experience: resume.experience.map((item, at) => (at === index ? { ...item, title: value } : item)) }))}
          {field(t("resume.f.place"), job.place, (value) => set({ experience: resume.experience.map((item, at) => (at === index ? { ...item, place: value } : item)) }))}
          {field(t("resume.f.dates"), job.dates, (value) => set({ experience: resume.experience.map((item, at) => (at === index ? { ...item, dates: value } : item)) }))}
          {field(t("resume.f.bullets"), job.bullets.join("\n"), (value) => set({ experience: resume.experience.map((item, at) => (at === index ? { ...item, bullets: value.split("\n") } : item)) }), 4)}
        </fieldset>
      ))}
      <button type="button" className="btn btn-ghost btn-auto" onClick={() => set({ experience: [...resume.experience, { title: "", place: "", dates: "", bullets: [] }] })}><Plus aria-hidden size={16} />{t("resume.addJob")}</button>
      {resume.education.map((item, index) => (
        <fieldset key={`d${index}`} className="resume-group">
          <legend>{t("resume.f.edu", { n: index + 1 })}</legend>
          {field(t("resume.f.title"), item.title, (value) => set({ education: resume.education.map((entry, at) => (at === index ? { ...entry, title: value } : entry)) }))}
          {field(t("resume.f.place"), item.place, (value) => set({ education: resume.education.map((entry, at) => (at === index ? { ...entry, place: value } : entry)) }))}
          {field(t("resume.f.dates"), item.dates, (value) => set({ education: resume.education.map((entry, at) => (at === index ? { ...entry, dates: value } : entry)) }))}
          {field(t("resume.f.detail"), item.detail, (value) => set({ education: resume.education.map((entry, at) => (at === index ? { ...entry, detail: value } : entry)) }))}
        </fieldset>
      ))}
      {field(t("resume.f.skills"), resume.skills.join(", "), (value) => set({ skills: value.split(",").map((item) => item.trim()) }), 2)}
      {field(t("resume.f.certs"), resume.certifications.join("\n"), (value) => set({ certifications: value.split("\n") }), 2)}
      {field(t("resume.f.languages"), resume.languages.join(", "), (value) => set({ languages: value.split(",").map((item) => item.trim()) }))}
    </div>
  );
}

/**
 * The resume builder. Saath AI asks ten short questions, writes the resume into Saath's template, and the person
 * edits it and downloads a PDF. Answers and the resume are kept on this device for this account only.
 */
export function ResumeScreen() {
  const { t } = useI18n();
  const app = useApp();
  const [saved, setSaved] = useState<Saved>({ answers: {}, resume: null });
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [via, setVia] = useState<"online" | "device" | null>(null);
  const [hearing, setHearing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useAiContext({ screen: t("resume.title"), kind: "other", title: t("resume.title"), text: saved.resume ? JSON.stringify(saved.resume).slice(0, 2000) : t("resume.lead"), suggestions: [t("resume.askImprove"), t("resume.askInterview")] });

  useEffect(() => {
    getMeta<Saved>(KEY).then((value) => { if (value) setSaved(value); }).catch(() => undefined).finally(() => setLoaded(true));
    return () => stopRef.current?.();
  }, []);

  const store = (next: Saved) => {
    setSaved(next);
    void setMeta(KEY, next).catch(() => undefined);
  };

  const question: ResumeQuestion | null = step !== null && step < RESUME_QUESTIONS.length ? RESUME_QUESTIONS[step] : null;
  const answer = question ? saved.answers[question] ?? "" : "";

  async function build() {
    tap();
    setBusy(true);
    setStep(null);
    const result = await draftResume(saved.answers);
    setVia(result.via);
    store({ ...saved, resume: result.resume });
    setBusy(false);
  }

  async function download() {
    if (!saved.resume) return;
    tap();
    const blob = await resumePdf(saved.resume);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(saved.resume.name || "resume").replace(/[^\w]+/g, "_")}_Resume.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (!saved.downloaded) {
      store({ ...saved, downloaded: true });
      app.celebrate("resume", t("resume.title"), "/resume", app.progress.xp);
    }
  }

  function listen() {
    if (!question) return;
    tap();
    if (hearing) { stopRef.current?.(); return; }
    setHearing(true);
    const before = answer ? `${answer} ` : "";
    stopRef.current = dictate("en", {
      onText: (text) => store({ ...saved, answers: { ...saved.answers, [question]: before + text } }),
      onEnd: () => { setHearing(false); stopRef.current = null; },
      onError: () => { setHearing(false); stopRef.current = null; },
    });
  }

  if (!loaded) return null;

  return (
    <div className="stack resume-screen">
      <Link href="/guide/resume" className="link"><ChevronLeft aria-hidden size={18} />{t("resume.backGuide")}</Link>
      <div className="stack-xs">
        <p className="kicker">{t("resume.kicker")}</p>
        <h1>{t("resume.title")}</h1>
        <p className="lead">{t("resume.lead")}</p>
      </div>

      {question ? (
        <section className="card resume-ask" data-testid="resume-question">
          <div className="resume-progress" aria-hidden>{RESUME_QUESTIONS.map((_, index) => <span key={index} className={index <= (step ?? 0) ? "on" : ""} />)}</div>
          <p className="faint">{t("resume.qOf", { n: (step ?? 0) + 1, total: RESUME_QUESTIONS.length })}</p>
          <div className="resume-bubble"><span className="ai-mark sm" aria-hidden><LogoMark size={16} /></span><p>{t(`resume.q.${question}`)}</p></div>
          <p className="faint resume-hint">{t(`resume.h.${question}`)}</p>
          <label className="visually-hidden" htmlFor="resume-answer">{t(`resume.q.${question}`)}</label>
          <textarea id="resume-answer" className="field text resume-answer" rows={4} value={answer} autoFocus onChange={(event) => store({ ...saved, answers: { ...saved.answers, [question]: event.target.value } })} data-testid="resume-answer" />
          <div className="resume-nav">
            <button type="button" className="btn btn-secondary btn-auto" disabled={step === 0} onClick={() => { tap(); setStep((step ?? 1) - 1); }} aria-label={t("walk.back")}><ArrowLeft aria-hidden size={18} /></button>
            {canHear() && <button type="button" className={`btn btn-secondary btn-auto${hearing ? " on" : ""}`} onClick={listen} aria-pressed={hearing} aria-label={t("ai.micStart", { lang: "English" })}><Mic aria-hidden size={18} /></button>}
            {step === RESUME_QUESTIONS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => void build()} data-testid="resume-build"><Sparkles aria-hidden size={18} />{t("resume.build")}</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => { tap(); setStep((step ?? 0) + 1); }} data-testid="resume-next">{answer.trim() ? t("walk.next") : t("resume.skip")}<ArrowRight aria-hidden size={18} /></button>
            )}
          </div>
        </section>
      ) : busy ? (
        <section className="card resume-busy" role="status"><span className="ai-mark thinking" aria-hidden><LogoMark size={22} /></span><p>{t("resume.writing")}</p></section>
      ) : saved.resume ? (
        <>
          {via && <p className="faint">{via === "online" ? t("resume.viaOnline") : t("resume.viaDevice")}</p>}
          <div className="resume-actions">
            <button type="button" className="btn btn-primary" onClick={() => void download()} data-testid="resume-download"><Download aria-hidden size={18} />{t("resume.download")}</button>
            <button type="button" className="btn btn-secondary" aria-pressed={editing} onClick={() => { tap(); setEditing((value) => !value); }} data-testid="resume-edit"><Pencil aria-hidden size={18} />{editing ? t("resume.doneEditing") : t("resume.edit")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { tap(); setStep(0); }}><RotateCcw aria-hidden size={18} />{t("resume.again")}</button>
          </div>
          {editing && <Editor resume={saved.resume} onChange={(resume) => store({ ...saved, resume })} />}
          <div className="resume-stage"><Paper resume={saved.resume} /></div>
        </>
      ) : (
        <section className="card resume-intro">
          <div className="resume-thumb" aria-hidden><Paper resume={{ name: "Verena D'Souza", headline: "Operations Trainee", contact: "Pune · verena@email.com", summary: "Commerce graduate who managed a ₹4.2 lakh fest budget.", education: [{ title: "B.Com", place: "Pune University", dates: "2023–2026", detail: "8.1 CGPA" }], experience: [{ title: "Intern", place: "CA firm", dates: "2025", bullets: ["Reconciled 140 entries in Excel."] }], projects: [], skills: ["Excel", "Tally"], certifications: [], languages: ["English", "Hindi", "Marathi"] }} /></div>
          <div className="stack-sm">
            <p>{t("resume.how")}</p>
            <button type="button" className="btn btn-primary" onClick={() => { tap(); setStep(0); }} data-testid="resume-start"><Sparkles aria-hidden size={18} />{t("resume.start")}</button>
            <p className="faint">{t("resume.privacy")}</p>
          </div>
        </section>
      )}
    </div>
  );
}
