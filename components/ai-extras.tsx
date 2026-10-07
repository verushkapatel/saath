"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Camera, FileText, Image as ImageIcon, Plus, Quote, Route, Search, X } from "lucide-react";
import type { Lang } from "@/lib/catalog";
import { loadJson, type FormsFile } from "@/lib/content-types";
import { canHear, dictate, playText, tap } from "@/lib/speech";
import type { Attachment } from "./ai-context";
import { useApp } from "./app-state";
import { LogoMark } from "./logo";
import { useI18n } from "./providers";
import { Sheet } from "./ui";

/**
 * Reads a photo or text file on this device and returns its words. The picture itself never leaves the phone:
 * only the text is attached to the question, and identity numbers in it are masked before anything is sent.
 */
export async function readDocument(file: File, lang: Lang, onProgress?: (share: number) => void): Promise<string> {
  if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) return (await file.text()).slice(0, 6000);
  if (!file.type.startsWith("image/")) throw new Error("type");
  const [{ readPhoto }, { preprocessImage }] = await Promise.all([import("@/lib/ocr"), import("@/lib/image")]);
  const cleaned = await preprocessImage(file).catch(() => file);
  return (await readPhoto(cleaned, lang, (state) => onProgress?.(state.progress ?? 0))).trim();
}

/** The + button in the chat bar: add a document, take a photo, or cite a part of Saath. */
export function PlusMenu({ onAttach, disabled }: { onAttach: (attachment: Attachment) => void; disabled?: boolean }) {
  const { t, code } = useI18n();
  const [open, setOpen] = useState(false);
  const [citing, setCiting] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setOpen(false);
    setNote(null);
    setReading(0);
    try {
      const text = await readDocument(file, code, (share) => setReading(Math.round(share * 100)));
      if (text.length < 8) throw new Error("empty");
      onAttach({ kind: "doc", title: file.name.replace(/\.[a-z]+$/i, "") || t("ai.plus.photo"), text });
    } catch (error) {
      setNote((error as Error).message === "type" ? t("ai.plus.wrongType") : t("ai.plus.unreadable"));
    } finally {
      setReading(null);
    }
  }

  return (
    <>
      <button type="button" className={`icon-btn plus-btn${open ? " on" : ""}`} aria-label={t("ai.plus.label")} aria-expanded={open} disabled={disabled || reading !== null} onClick={() => { tap(); setOpen((value) => !value); }} data-testid="ai-plus-button">
        {reading !== null ? <span className="plus-ring" style={{ ["--p" as string]: `${reading}%` }} /> : <Plus aria-hidden size={20} />}
      </button>
      <input ref={fileRef} type="file" accept="image/*,.txt,text/plain" hidden onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
      {open && (
        <div className="plus-menu" role="menu" data-testid="ai-plus-menu">
          <button type="button" role="menuitem" onClick={() => { tap(); fileRef.current?.click(); }}><ImageIcon aria-hidden size={18} /><span><b>{t("ai.plus.upload")}</b><small>{t("ai.plus.uploadSub")}</small></span></button>
          <button type="button" role="menuitem" onClick={() => { tap(); cameraRef.current?.click(); }}><Camera aria-hidden size={18} /><span><b>{t("ai.plus.camera")}</b><small>{t("ai.plus.cameraSub")}</small></span></button>
          <button type="button" role="menuitem" onClick={() => { tap(); setOpen(false); setCiting(true); }} data-testid="ai-cite-button"><Quote aria-hidden size={18} /><span><b>{t("ai.plus.cite")}</b><small>{t("ai.plus.citeSub")}</small></span></button>
        </div>
      )}
      {reading !== null && <p className="faint plus-note" role="status">{t("ai.plus.reading", { share: reading })}</p>}
      {note && <p className="note plus-note" role="status">{note}</p>}
      {citing && <CitePicker onClose={() => setCiting(false)} onPick={(attachment) => { setCiting(false); onAttach(attachment); }} />}
    </>
  );
}

type Citable = { id: string; kind: "guide" | "chapter" | "form"; title: string; text: string };

/** Search every guide, story chapter and form in Saath, and attach one to the question. */
export function CitePicker({ onClose, onPick }: { onClose: () => void; onPick: (attachment: Attachment) => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [forms, setForms] = useState<FormsFile | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    loadJson<FormsFile>("/content/forms.json").then(setForms).catch(() => undefined);
  }, []);

  const items = useMemo<Citable[]>(() => {
    const plain = (text: string) => text.replace(/\[\[([a-z0-9-]+)\]\]/g, "$1");
    const guides = app.lessons.map((lesson) => ({
      id: lesson.id,
      kind: "guide" as const,
      title: lesson.title[code],
      text: `${lesson.summary[code]}\n${plain(lesson.body[code])}\n${lesson.points.map((point) => `- ${point[code]}`).join("\n")}\n${lesson.example[code]}`,
    }));
    const chapters = (app.journey?.episodes ?? []).map((episode) => ({
      id: episode.id,
      kind: "chapter" as const,
      title: episode.title[code],
      text: [...episode.story.map((line) => line[code]), episode.slip?.[code] ?? "", episode.question?.[code] ?? ""].join("\n"),
    }));
    const formList = (forms?.forms ?? []).map((form) => ({
      id: form.id,
      kind: "form" as const,
      title: form.name[code],
      text: `${form.purpose[code]}\n${form.fields.map((field) => `- ${field.name[code]}: ${field.meaning[code]}`).join("\n")}`,
    }));
    return [...guides, ...chapters, ...formList];
  }, [app.lessons, app.journey, forms, code]);

  const needle = query.trim().toLowerCase();
  const shown = (needle ? items.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(needle)) : items).slice(0, 40);
  const icon = (kind: Citable["kind"]) => (kind === "guide" ? <BookOpen aria-hidden size={18} /> : kind === "chapter" ? <Route aria-hidden size={18} /> : <FileText aria-hidden size={18} />);

  return (
    <Sheet title={t("ai.plus.cite")} onClose={onClose}>
      <div className="stack-sm" data-testid="cite-picker">
        <label className="field-wrap" style={{ marginTop: 0 }}>
          <Search aria-hidden size={18} />
          <span className="visually-hidden">{t("guide.search")}</span>
          <input className="field text" type="search" autoFocus value={query} placeholder={t("ai.plus.citeSearch")} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <ul className="list card tight cite-list">
          {shown.map((item) => (
            <li key={`${item.kind}:${item.id}`}>
              <button type="button" className="item" onClick={() => { tap(); onPick({ kind: "cite", title: item.title, text: item.text.slice(0, 3000) }); }}>
                <span className="item-icon">{icon(item.kind)}</span>
                <span className="item-body">
                  <span className="unit-badge">{t(`ai.plus.kind.${item.kind}`)}</span>
                  <span className="item-title">{item.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/** The attached document or citation, shown above the message box until the question is sent. */
export function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <div className="attach-chip" data-testid="ai-attachment">
      {attachment.kind === "doc" ? <FileText aria-hidden size={16} /> : <Quote aria-hidden size={16} />}
      <span><small>{attachment.kind === "doc" ? t("ai.plus.attachedDoc") : t("ai.plus.attachedCite")}</small>{attachment.title}</span>
      <button type="button" className="icon-btn ghost" aria-label={t("common.close")} onClick={() => { tap(); onRemove(); }}><X aria-hidden size={14} /></button>
    </div>
  );
}

type VoiceState = "listening" | "thinking" | "speaking" | "idle";

/**
 * Voice mode: talk, and Saath AI talks back, hands free. It listens, sends what was said, reads the answer aloud,
 * then listens again, until the person taps to stop.
 */
export function VoiceMode({ ask, onClose }: { ask: (question: string) => Promise<string | null>; onClose: () => void }) {
  const { t, code } = useI18n();
  const [state, setState] = useState<VoiceState>("idle");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const liveRef = useRef(true);

  function listen() {
    if (!liveRef.current) return;
    setState("listening");
    setHeard("");
    let said = "";
    stopRef.current = dictate(code, {
      onText: (text) => { said = text; setHeard(text); },
      onEnd: () => {
        stopRef.current = null;
        if (!liveRef.current) return;
        if (said.trim().length < 2) { setState("idle"); return; }
        void respond(said);
      },
      onError: () => { stopRef.current = null; setState("idle"); },
    }, { silenceMs: 1500 });
  }

  async function respond(question: string) {
    setState("thinking");
    const text = await ask(question);
    if (!liveRef.current) return;
    if (!text) { setState("idle"); return; }
    setAnswer(text);
    setState("speaking");
    const spoken = text.replace(/\*\*/g, "").replace(/^- /gm, "").replace(/\n+/g, ". ");
    stopRef.current = await playText(spoken, code, () => {
      stopRef.current = null;
      if (liveRef.current) window.setTimeout(listen, 350);
    });
  }

  useEffect(() => {
    liveRef.current = true;
    listen();
    return () => {
      liveRef.current = false;
      stopRef.current?.();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    tap();
    liveRef.current = false;
    stopRef.current?.();
    window.speechSynthesis?.cancel();
    onClose();
  }

  return createPortal(
    <div className={`voice-mode ${state}`} role="dialog" aria-modal="true" aria-label={t("ai.voice.title")} data-testid="voice-mode">
      <button type="button" className="celebrate-close" aria-label={t("common.close")} onClick={close}><X aria-hidden size={22} /></button>
      <p className="celebrate-kicker">{t("ai.voice.title")}</p>
      <button type="button" className="voice-orb" aria-label={state === "idle" ? t("ai.voice.tap") : t(`ai.voice.${state}`)} onClick={() => { tap(); if (state === "idle") listen(); else if (state === "speaking") { stopRef.current?.(); } }}>
        <span className="orb-ring r1" /><span className="orb-ring r2" /><span className="orb-ring r3" />
        <span className="orb-core"><LogoMark size={40} /></span>
      </button>
      <p className="voice-state" aria-live="polite">{state === "idle" ? t("ai.voice.tap") : t(`ai.voice.${state}`)}</p>
      <p className="voice-heard">{state === "speaking" ? answer.replace(/\*\*/g, "").slice(0, 280) : heard}</p>
      {!canHear() && <p className="note">{t("ai.voice.unsupported")}</p>}
    </div>,
    document.body,
  );
}
