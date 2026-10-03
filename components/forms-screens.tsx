"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, ChevronLeft, ChevronRight, ExternalLink, FileSearch, ImagePlus, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { TOPICS, type Topic } from "@/lib/catalog";
import { loadJson, type FormGuide, type FormsFile } from "@/lib/content-types";
import { dayLabel } from "@/lib/format";
import { explainFormText, type FieldRule, type FormReading } from "@/lib/form-explain";
import { photoQuality, preprocessImage } from "@/lib/image";
import { readPhotoBest, type OcrProgress } from "@/lib/ocr";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { ListenButton, PageSkeleton, Ring } from "./ui";

function useForms() {
  const [file, setFile] = useState<FormsFile | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loadJson<FormsFile>("/content/forms.json").then(setFile).catch(() => setFailed(true));
  }, []);
  return { file, failed };
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function FormsScreen() {
  const { t, code } = useI18n();
  const { progress } = useApp();
  const { file, failed } = useForms();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "all">("all");

  useAiContext({ screen: t("nav.forms"), kind: "form", title: t("forms.title"), suggestions: [t("forms.askBlank"), t("forms.askKfs")] });

  const topics = useMemo(() => TOPICS.filter((item) => file?.forms.some((form) => form.topic === item)), [file]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (file?.forms ?? []).filter((form) => {
      if (topic !== "all" && form.topic !== topic) return false;
      if (!needle) return true;
      return `${form.name[code]} ${form.alsoCalled[code]} ${form.purpose[code]} ${form.name.en} ${form.alsoCalled.en}`.toLowerCase().includes(needle);
    });
  }, [file, query, topic, code]);

  if (failed) return <p className="note err">{t("errors.generic")}</p>;
  if (!file) return <PageSkeleton />;

  return (
    <div className="stack rise">
      <div className="stack-xs">
        <p className="masthead">{t("forms.kicker")}</p>
        <h1>{t("forms.title")}</h1>
        <p className="lead">{t("forms.lead")}</p>
      </div>

      <Link href="/forms/explain" className="card hero tight" onClick={tap}>
        <span className="item" style={{ padding: 0, minHeight: 0 }}>
          <span className="item-icon"><Camera aria-hidden size={20} /></span>
          <span className="item-body">
            <span className="item-title">{t("forms.photoTitle")}</span>
            <span className="item-sub">{t("forms.photoSub")}</span>
          </span>
          <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
        </span>
      </Link>

      <label>
        <span className="visually-hidden">{t("forms.search")}</span>
        <span className="field-wrap" style={{ marginTop: 0 }}>
          <Search aria-hidden size={18} />
          <input className="field text" type="search" value={query} placeholder={t("forms.search")} onChange={(event) => setQuery(event.target.value)} />
        </span>
      </label>
      <div className="chips" role="group" aria-label={t("guide.filter")}>
        <button type="button" className="chip" aria-pressed={topic === "all"} onClick={() => { tap(); setTopic("all"); }}>{t("guide.allTopics")}</button>
        {topics.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={topic === item} onClick={() => { tap(); setTopic(item); }}>{t(`topics.${item}`)}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="state">
          <p className="lead">{t("forms.empty")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => { setQuery(""); setTopic("all"); }}>{t("guide.allTopics")}</button>
        </div>
      ) : (
        <ul className="list card tight">
          {shown.map((form) => {
            const opened = progress.forms.includes(form.id);
            return (
              <li key={form.id}>
                <Link href={`/forms/${form.id}`} className="item" onClick={tap}>
                  <span className={`item-icon${opened ? " done" : ""}`}>{opened ? <Check aria-hidden size={18} strokeWidth={3} /> : <FileSearch aria-hidden size={20} />}</span>
                  <span className="item-body">
                    <span className="item-title">{form.name[code]}</span>
                    <span className="item-sub two">{form.alsoCalled[code]}</span>
                  </span>
                  <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="faint">{file.note[code]}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack-sm">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function FormScreen({ id }: { id: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const { file, failed } = useForms();
  const form: FormGuide | null = file?.forms.find((item) => item.id === id) ?? null;

  useEffect(() => {
    if (form && app.ready) void app.markForm(form.id);
    // Marking once per visit is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, app.ready]);

  useAiContext(form ? {
    screen: t("nav.forms"),
    kind: "form",
    id: form.id,
    title: form.name[code],
    text: `${form.purpose[code]} ${form.authority[code]}\n${form.mistakes.map((item) => item[code]).join(" ")}`,
    suggestions: [t("forms.askCheck"), t("forms.askBlank")],
  } : null);

  if (failed) return <p className="note err">{t("errors.generic")}</p>;
  if (!file) return <PageSkeleton />;
  if (!form) {
    return (
      <div className="state">
        <p className="lead">{t("guide.missing")}</p>
        <Link href="/forms" className="btn btn-primary">{t("forms.title")}</Link>
      </div>
    );
  }

  const spoken = [form.name[code], form.purpose[code], ...form.mistakes.map((item) => item[code])].join(". ");

  return (
    <article className="stack">
      <Link href="/forms" className="link"><ChevronLeft aria-hidden size={18} />{t("forms.title")}</Link>
      <div className="stack-sm">
        <p className="kicker">{t(`topics.${form.topic}`)}</p>
        <h1>{form.name[code]}</h1>
        <p className="faint">{t("forms.alsoCalled")}: {form.alsoCalled[code]}</p>
        <ListenButton text={spoken} />
      </div>
      <div className="card flat stack-sm">
        <p className="lead">{form.purpose[code]}</p>
        <p className="muted">{form.authority[code]}</p>
        <p className="faint">{t("forms.who")}: {form.audience[code]}</p>
      </div>

      <Section title={t("forms.fields")}>
        <dl className="field-list">
          {form.fields.map((field, at) => (
            <div key={at}>
              <dt>{field.name[code]}</dt>
              <dd>{field.meaning[code]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {form.documents.length > 0 && (
        <Section title={t("forms.documents")}>
          <ul className="checks">{form.documents.map((item, at) => <li key={at}><Check aria-hidden size={16} /><span>{item[code]}</span></li>)}</ul>
        </Section>
      )}

      {form.terms.length > 0 && (
        <Section title={t("forms.terms")}>
          <dl className="field-list">
            {form.terms.map((term, at) => (
              <div key={at}><dt>{term.term[code]}</dt><dd>{term.meaning[code]}</dd></div>
            ))}
          </dl>
        </Section>
      )}

      <Section title={t("forms.mistakes")}>
        <ul className="checks warn">{form.mistakes.map((item, at) => <li key={at}><AlertTriangle aria-hidden size={16} /><span>{item[code]}</span></li>)}</ul>
      </Section>

      <Section title={t("forms.verify")}>
        <ul className="checks">{form.verify.map((item, at) => <li key={at}><ShieldCheck aria-hidden size={16} /><span>{item[code]}</span></li>)}</ul>
      </Section>

      <button type="button" className="btn btn-secondary" onClick={() => { tap(); ai.openAsk(t("forms.askCheck")); }}>
        <MessageCircle aria-hidden size={18} />{t("forms.askSaath")}
      </button>

      {form.guides.length > 0 && (
        <div className="stack-xs">
          <p className="label">{t("journey.readMore")}</p>
          <ul className="cluster">
            {form.guides.map((guideId) => {
              const lesson = app.lessons.find((item) => item.id === guideId);
              return lesson ? <li key={guideId}><Link className="chip" href={`/guide/${guideId}`}>{lesson.title[code]}</Link></li> : null;
            })}
          </ul>
        </div>
      )}

      <div className="stack-xs sources">
        <p className="faint">{t("forms.verified", { date: dayLabel(form.verified, code) })}</p>
        <p className="faint">
          {t("lesson.sources")}:{" "}
          {form.source.map((source, at) => (
            <span key={source.url}>
              {at > 0 ? ", " : ""}
              <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name || host(source.url)} <ExternalLink aria-hidden size={12} /></a>
            </span>
          ))}
        </p>
        <p className="faint">{file.note[code]}</p>
      </div>
    </article>
  );
}

type Phase = "idle" | "reading" | "done" | "failed";

/**
 * A photo of a form, read on this phone. The picture is held in memory only while it is read,
 * then dropped. Nothing is saved and nothing is uploaded.
 */
export function FormExplainScreen() {
  const { t, code } = useI18n();
  const ai = useAi();
  const [rules, setRules] = useState<FieldRule[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [reading, setReading] = useState<FormReading | null>(null);
  const [quality, setQuality] = useState<{ dark: boolean; blurry: boolean } | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const pickRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadJson<FieldRule[]>("/content/form-fields.json").then(setRules).catch(() => setRules([]));
  }, []);

  const found = reading?.found ?? [];
  useAiContext({
    screen: t("nav.forms"),
    kind: "form-photo",
    title: t("forms.photoTitle"),
    // Only the field names Saath recognised are shared with Saath AI, never the words read from the paper.
    text: found.length ? found.map((item) => `${item.rule.label[code]}: ${item.rule.meaning[code]}`).join("\n") : undefined,
    suggestions: [t("forms.askBlank"), t("forms.askCheck")],
  });

  async function handle(fileIn: File | undefined) {
    if (!fileIn || !rules) return;
    tap();
    setPhase("reading");
    setReading(null);
    setProgress(null);
    let file: Blob | null = fileIn;
    try {
      setQuality(await photoQuality(file));
      const cleaned = await preprocessImage(file);
      const score = (text: string) => {
        const reading = explainFormText(text, rules);
        return reading.readable ? reading.found.length : 0;
      };
      const text = await readPhotoBest(file, cleaned, code, score, 5, setProgress);
      setReading(explainFormText(text, rules));
      setPhase("done");
    } catch {
      setPhase("failed");
    } finally {
      // Drop the picture. It was never written anywhere.
      file = null;
      if (cameraRef.current) cameraRef.current.value = "";
      if (pickRef.current) pickRef.current.value = "";
    }
  }

  const ratio = progress ? (progress.phase === "download" ? progress.progress * 0.3 : 0.3 + progress.progress * 0.7) : 0;

  return (
    <div className="stack">
      <Link href="/forms" className="link"><ChevronLeft aria-hidden size={18} />{t("forms.title")}</Link>
      <div className="stack-xs">
        <h1>{t("forms.photoTitle")}</h1>
        <p className="lead">{t("forms.photoLead")}</p>
      </div>
      <p className="note"><ShieldCheck aria-hidden size={16} style={{ verticalAlign: "-3px" }} /> {t("forms.photoPrivate")}</p>

      {phase !== "reading" && (
        <div className="pair">
          <button type="button" className="btn btn-primary" disabled={!rules} onClick={() => cameraRef.current?.click()}>
            <Camera aria-hidden size={18} />{t("forms.takePhoto")}
          </button>
          <button type="button" className="btn btn-secondary" disabled={!rules} onClick={() => pickRef.current?.click()}>
            <ImagePlus aria-hidden size={18} />{t("forms.pickPhoto")}
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => void handle(event.target.files?.[0])} />
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={(event) => void handle(event.target.files?.[0])} />

      {phase === "reading" && (
        <div className="work stack-sm center" role="status" aria-live="polite">
          <Ring value={ratio} size={72} label={t("forms.reading")} spin={!progress} />
          <p>{progress?.phase === "download" ? t("forms.downloading") : t("forms.reading")}</p>
          <p className="faint">{t("forms.readingNote")}</p>
        </div>
      )}

      {phase === "failed" && <p className="note err" role="alert">{t("forms.failed")}</p>}

      {phase === "done" && reading && !reading.readable && (
        <div className="card flat stack-sm" role="alert">
          <p className="kicker">{t("forms.unreadableTitle")}</p>
          <p>{t("forms.unreadable")}</p>
          {quality?.dark && <p className="muted">{t("forms.tipDark")}</p>}
          {quality?.blurry && <p className="muted">{t("forms.tipBlur")}</p>}
          <p className="muted">{t("forms.tipFlat")}</p>
          <Link href="/forms" className="link">{t("forms.tryLibrary")}<ChevronRight aria-hidden size={18} /></Link>
        </div>
      )}

      {phase === "done" && reading?.readable && (
        <section className="stack-sm" aria-labelledby="found-h">
          <h2 id="found-h">{t("forms.foundTitle", { count: found.length })}</h2>
          <p className="faint">{t("forms.foundLead")}</p>
          <ul className="stack-sm">
            {found.map((item) => (
              <li key={item.rule.id} className="card tight stack-xs">
                <strong>{item.rule.label[code]}</strong>
                <p>{item.rule.meaning[code]}</p>
                <p className="muted"><ShieldCheck aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {item.rule.tip[code]}</p>
                <p className="faint quote-line">{t("forms.readAs")}: “{item.line}”</p>
              </li>
            ))}
          </ul>
          <p className="faint">{t("forms.notAll")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => { tap(); ai.openAsk(t("forms.askBlank")); }}>
            <MessageCircle aria-hidden size={18} />{t("forms.askSaath")}
          </button>
        </section>
      )}
    </div>
  );
}
