"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, Eraser, MessageCircle, Settings, Sparkles } from "lucide-react";
import { getProvider, onlineConfigured, providerMode, type AiAnswer, type AiProgress, type AiTurn, type Doc } from "@/lib/ai";
import { buildDocs } from "@/lib/ai/knowledge";
import type { Lang } from "@/lib/catalog";
import { loadJson, type FormsFile, type GlossaryTerm, type StoriesFile } from "@/lib/content-types";
import { recommend, weakTopics } from "@/lib/recommend";
import { tap } from "@/lib/speech";
import { getMeta, setMeta } from "@/lib/storage";
import { useAi } from "./ai-context";
import { useApp } from "./app-state";
import { usePrefs } from "./prefs";
import { useI18n } from "./providers";
import { Sheet } from "./ui";

/** One line of the conversation as it is shown and, when memory is on, saved. */
export type ChatLine = { role: "user" | "saath"; text: string; sources?: AiAnswer["sources"]; via?: AiAnswer["via"] };

const CHAT_KEY = "ai-chat";
const KEEP = 40;

let extra: Promise<{ glossary: GlossaryTerm[]; forms: FormsFile | null; stories: StoriesFile | null }> | null = null;
function loadExtra() {
  extra ??= Promise.all([
    loadJson<GlossaryTerm[]>("/content/glossary.json").catch(() => []),
    loadJson<FormsFile>("/content/forms.json").catch(() => null),
    loadJson<StoriesFile>("/content/stories.json").catch(() => null),
  ]).then(([glossary, forms, stories]) => ({ glossary, forms, stories }));
  return extra;
}

/** Saath's checked content, as passages the AI may answer from. Built once per language. */
export function useAiDocs(): (lang: Lang) => Doc[] {
  const { lessons, journey } = useApp();
  const [more, setMore] = useState<{ glossary: GlossaryTerm[]; forms: FormsFile | null; stories: StoriesFile | null }>({ glossary: [], forms: null, stories: null });
  useEffect(() => {
    let live = true;
    loadExtra().then((data) => live && setMore(data));
    return () => {
      live = false;
    };
  }, []);
  return useMemo(() => {
    const cache = new Map<Lang, Doc[]>();
    return (lang: Lang) => {
      const hit = cache.get(lang);
      if (hit) return hit;
      const docs = buildDocs({ lessons, journey, glossary: more.glossary, forms: more.forms, stories: more.stories }, lang);
      cache.set(lang, docs);
      return docs;
    };
  }, [lessons, journey, more]);
}

/** The learning record Saath AI may see. Money Lab amounts are never part of it. */
export function useAiProgress(): AiProgress {
  const { t, code } = useI18n();
  const app = useApp();
  return useMemo(() => {
    const recs = recommend({ progress: app.progress, lessons: app.lessons, journey: app.story, today: app.today });
    const nextUp = recs
      .filter((rec) => rec.kind !== "episode")
      .slice(0, 3)
      .map((rec) => app.lessons.find((lesson) => lesson.id === rec.id)?.title[code])
      .filter((title): title is string => Boolean(title));
    return {
      level: app.level.level,
      xp: app.progress.xp,
      streak: app.streak.count,
      lessonsDone: app.progress.lessons.length,
      lessonsTotal: app.lessons.length,
      episodesDone: app.story?.done ?? 0,
      episodesTotal: app.story?.total ?? 0,
      stage: app.story?.stage?.title[code] ?? null,
      focus: app.progress.focus.map((topic) => t(`topics.${topic}`)),
      weak: weakTopics(app.progress).map((topic) => t(`topics.${topic}`)),
      nextUp,
    };
  }, [app.progress, app.lessons, app.story, app.today, app.level, app.streak, code, t]);
}

/** The provider the person's settings call for, rebuilt when a setting changes. */
export function useProvider() {
  const { prefs } = usePrefs();
  const docsFor = useAiDocs();
  return useMemo(
    () => getProvider({ docsFor, allowLocal: prefs.aiLocal, localModel: prefs.aiModel, allowOnline: prefs.aiOnline }),
    [docsFor, prefs.aiLocal, prefs.aiModel, prefs.aiOnline],
  );
}

/**
 * When this copy of Saath has an online model, offer it once, in plain words, inside the chat.
 * Nothing is sent until the person taps yes. They can switch it off again in Settings.
 */
function OnlineOffer() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem("saath-online-offer") === "no";
    } catch {
      return false;
    }
  });
  if (hidden || prefs.aiOnline || prefs.aiLocal || !onlineConfigured()) return null;
  return (
    <div className="online-offer navy-scene" role="note">
      <p><Sparkles aria-hidden size={16} style={{ verticalAlign: "-3px" }} /> <strong>{t("ai.offerTitle")}</strong></p>
      <p className="faint">{t("ai.offerBody")}</p>
      <div className="pair">
        <button type="button" className="btn btn-primary" onClick={() => { tap(); update({ aiOnline: true }); }}>{t("ai.offerYes")}</button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            tap();
            setHidden(true);
            try {
              window.localStorage.setItem("saath-online-offer", "no");
            } catch {
              // Hidden for this visit.
            }
          }}
        >
          {t("ai.offerNo")}
        </button>
      </div>
    </div>
  );
}

function Chat({ compact }: { compact?: boolean }) {
  const { t, code } = useI18n();
  const { prefs } = usePrefs();
  const ai = useAi();
  const provider = useProvider();
  const progress = useAiProgress();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef<ChatLine[]>([]);
  linesRef.current = lines;

  useEffect(() => {
    let live = true;
    if (!prefs.aiMemory) {
      setLoaded(true);
      return;
    }
    getMeta<ChatLine[]>(CHAT_KEY)
      .then((saved) => {
        if (live && Array.isArray(saved)) setLines(saved.slice(-KEEP));
      })
      .catch(() => undefined)
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [prefs.aiMemory]);

  const remember = useCallback((next: ChatLine[]) => {
    setLines(next);
    if (prefs.aiMemory) void setMeta(CHAT_KEY, next.slice(-KEEP)).catch(() => undefined);
  }, [prefs.aiMemory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lines, busy]);

  const ask = useCallback(async (question: string, kind: "ask" | "revise" | "summary" = "ask") => {
    const text = question.trim();
    if (!text || busy) return;
    const before = linesRef.current;
    const withQuestion: ChatLine[] = [...before, { role: "user", text }];
    setLines(withQuestion);
    setDraft("");
    setBusy(true);
    const history: AiTurn[] = before.slice(-6).map((line) => ({ role: line.role, text: line.text }));
    const request = { lang: code, context: ai.context, progress, history };
    try {
      const answer =
        kind === "revise" ? await provider.recommendRevision(request)
        : kind === "summary" ? await provider.summarizeProgress(request)
        : await provider.answerQuestion(text, request);
      remember([...withQuestion, { role: "saath", text: answer.text, sources: answer.sources, via: answer.via }]);
    } catch {
      remember([...withQuestion, { role: "saath", text: t("ai.error") }]);
    } finally {
      setBusy(false);
    }
  }, [busy, code, ai.context, progress, provider, remember, t]);

  // A question sent from another screen ("Explain this", "Why was I wrong?") is asked as soon as the chat is ready.
  useEffect(() => {
    if (!loaded) return;
    const pending = ai.takePending();
    if (pending) void ask(pending);
  }, [loaded, ai, ask]);

  function submit(event: FormEvent) {
    event.preventDefault();
    tap();
    void ask(draft);
  }

  const suggestions = ai.context?.suggestions?.length
    ? ai.context.suggestions
    : [t("ai.s1"), t("ai.s2"), t("ai.s3")];
  const mode = providerMode({ allowLocal: prefs.aiLocal, allowOnline: prefs.aiOnline });

  return (
    <div className={`chat-wrap${compact ? " compact" : ""}`}>
      {ai.context && (
        <p className="ai-about faint">
          <BookOpen aria-hidden size={14} /> {t("ai.about", { title: ai.context.title ?? ai.context.screen })}
        </p>
      )}
      <OnlineOffer />
      <div className="chat" aria-live="polite" aria-busy={busy}>
        {lines.length === 0 && <p className="bubble saath">{t("ai.hello")}</p>}
        {lines.map((line, index) => (
          <div key={index} className={`bubble ${line.role === "user" ? "me" : "saath"}`}>
            <p>{line.text}</p>
            {line.sources && line.sources.length > 0 && (
              <p className="bubble-sources">
                <span className="faint">{t("ai.sources")}: </span>
                {line.sources.map((source, at) => (
                  <span key={source.href + at}>
                    {at > 0 ? ", " : ""}
                    <Link href={source.href} onClick={() => ai.closeAsk()}>{source.title}</Link>
                  </span>
                ))}
              </p>
            )}
            {line.via && <p className="bubble-via">{t(`ai.via.${line.via}`)}</p>}
          </div>
        ))}
        {busy && <p className="bubble saath typing" aria-label={t("ai.thinking")}><i /><i /><i /></p>}
        <div ref={endRef} />
      </div>

      <div className="chips" role="group" aria-label={t("ai.try")}>
        {ai.context?.text && (
          <button type="button" className="chip" disabled={busy} onClick={() => { tap(); void ask(t("ai.explainThis")); }}>{t("ai.explainThis")}</button>
        )}
        {suggestions.map((item) => (
          <button key={item} type="button" className="chip" disabled={busy} onClick={() => { tap(); void ask(item); }}>{item}</button>
        ))}
        <button type="button" className="chip" disabled={busy} onClick={() => { tap(); void ask(t("ai.revise"), "revise"); }}>{t("ai.revise")}</button>
        <button type="button" className="chip" disabled={busy} onClick={() => { tap(); void ask(t("ai.summary"), "summary"); }}>{t("ai.summary")}</button>
      </div>

      <form className="chat-input" onSubmit={submit}>
        <label className="visually-hidden" htmlFor={compact ? "ask-sheet-input" : "ask-page-input"}>{t("ai.placeholder")}</label>
        <input
          id={compact ? "ask-sheet-input" : "ask-page-input"}
          className="field text boxed"
          value={draft}
          maxLength={500}
          autoComplete="off"
          placeholder={t("ai.placeholder")}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="icon-btn send" aria-label={t("ai.send")} disabled={busy || !draft.trim()}>
          <ArrowUp aria-hidden size={20} />
        </button>
      </form>

      <div className="row-between chat-foot">
        <p className="faint">{t(`ai.mode.${mode}`)} {prefs.aiMemory ? t("ai.memoryOn") : t("ai.memoryOff")}</p>
        {lines.length > 0 && (
          <button
            type="button"
            className="link"
            onClick={() => {
              tap();
              remember([]);
            }}
          >
            <Eraser aria-hidden size={16} />
            {t("ai.clear")}
          </button>
        )}
      </div>
      <p className="faint">{t("ai.notAdvice")}</p>
    </div>
  );
}

function AiOff() {
  const { t } = useI18n();
  const ai = useAi();
  return (
    <div className="state">
      <span className="item-icon"><MessageCircle aria-hidden size={20} /></span>
      <p className="lead">{t("ai.off")}</p>
      <Link href="/settings" className="btn btn-secondary" onClick={() => ai.closeAsk()}>
        <Settings aria-hidden size={18} />
        {t("ai.openSettings")}
      </Link>
    </div>
  );
}

/** The sheet that opens from the Ask button in the top bar, over whatever screen is open. */
export function AskSheet() {
  const { t } = useI18n();
  const { prefs } = usePrefs();
  const ai = useAi();
  return (
    <Sheet title={t("ai.title")} onClose={ai.closeAsk}>
      {prefs.ai ? <Chat compact /> : <AiOff />}
    </Sheet>
  );
}

/** The full Saath AI page. */
export function AiScreen() {
  const { t } = useI18n();
  const { prefs } = usePrefs();
  return (
    <div className="stack">
      <div className="stack-xs">
        <p className="masthead">{t("ai.kicker")}</p>
        <h1>{t("ai.title")}</h1>
        <p className="lead">{t("ai.lead")}</p>
      </div>
      {prefs.ai ? <Chat /> : <AiOff />}
    </div>
  );
}
