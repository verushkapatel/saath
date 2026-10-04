"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, Eraser, MessageCircle, Mic, Settings, Sparkles, Square } from "lucide-react";
import { getProvider, onlineConfigured, providerMode, type AiAnswer, type AiProgress, type AiTurn, type Doc } from "@/lib/ai";
import { buildDocs } from "@/lib/ai/knowledge";
import type { Lang } from "@/lib/catalog";
import { loadJson, type FormsFile, type GlossaryTerm, type StoriesFile } from "@/lib/content-types";
import { recommend, weakTopics } from "@/lib/recommend";
import { canHear, dictate, scriptLang, tap } from "@/lib/speech";
import { getMeta, setMeta } from "@/lib/storage";
import { useAi } from "./ai-context";
import { LogoMark } from "./logo";
import { useApp } from "./app-state";
import { usePrefs } from "./prefs";
import { useI18n } from "./providers";
import { ListenButton, Sheet } from "./ui";

/** One line of the conversation as it is shown and, when memory is on, saved. */
export type ChatLine = { role: "user" | "saath"; text: string; sources?: AiAnswer["sources"]; via?: AiAnswer["via"]; lang?: Lang };

const CHAT_KEY = "ai-chat";
const LANG_SHORT: Record<Lang, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };
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
    () => getProvider({ docsFor, allowLocal: prefs.aiLocal, localModel: prefs.aiModel, ollamaUrl: prefs.aiOllamaUrl, ollamaModel: prefs.aiOllamaModel, allowOnline: prefs.aiOnline }),
    [docsFor, prefs.aiLocal, prefs.aiModel, prefs.aiOllamaUrl, prefs.aiOllamaModel, prefs.aiOnline],
  );
}

/**
 * Online answers are on by default when this copy of Saath has a server. The first time, say plainly what that means,
 * and offer to keep everything on this device instead. Settings can switch it either way at any time.
 */
function OnlineNote() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem("saath-online-note") === "seen";
    } catch {
      return false;
    }
  });
  if (hidden || prefs.aiLocal || !onlineConfigured()) return null;
  const close = (keepOnline: boolean) => {
    tap();
    setHidden(true);
    if (keepOnline !== prefs.aiOnline) update({ aiOnline: keepOnline });
    try {
      window.localStorage.setItem("saath-online-note", "seen");
    } catch {
      // Hidden for this visit.
    }
  };
  return (
    <details className="online-offer" role="note">
      <summary><Sparkles aria-hidden size={16} /> <strong>{t("ai.offerTitle")}</strong></summary>
      <p className="faint">{t("ai.offerBody")}</p>
      <div className="pair">
        <button type="button" className="btn btn-secondary" aria-pressed={prefs.aiOnline} onClick={() => close(true)}>{t("ai.offerYes")}</button>
        <button type="button" className="btn btn-ghost" aria-pressed={!prefs.aiOnline} onClick={() => close(false)}>{t("ai.offerNo")}</button>
      </div>
    </details>
  );
}

/** Bold words and "- " bullets, the only formatting Saath AI is asked to use. Everything else is plain text. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) blocks.push(<ul key={`u${blocks.length}`}>{bullets.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>);
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}

/** The newest answer appears word by word, quickly, so it reads like a reply rather than a page. */
function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce");
    if (reduce) {
      setCount(words.length);
      onDone?.();
      return;
    }
    let at = 0;
    const step = Math.max(2, Math.ceil(words.length / 60));
    const timer = window.setInterval(() => {
      at = Math.min(words.length, at + step);
      setCount(at);
      if (at >= words.length) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, 24);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);
  return <RichText text={words.slice(0, count).join("")} />;
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
  const [fresh, setFresh] = useState<number | null>(null);
  // The language the person speaks or types in. Saath AI answers in the same one.
  const [talk, setTalk] = useState<Lang>(code);
  const [hearing, setHearing] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const micOk = useMemo(() => canHear(), []);
  useEffect(() => setTalk(code), [code]);
  useEffect(() => () => stopRef.current?.(), []);
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
    const replyLang = kind === "ask" ? scriptLang(text, talk) : talk;
    const request = { lang: replyLang, context: ai.context, progress, history };
    try {
      const answer =
        kind === "revise" ? await provider.recommendRevision(request)
        : kind === "summary" ? await provider.summarizeProgress(request)
        : await provider.answerQuestion(text, request);
      remember([...withQuestion, { role: "saath", text: answer.text, sources: answer.sources, via: answer.via, lang: replyLang }]);
      setFresh(withQuestion.length);
    } catch {
      remember([...withQuestion, { role: "saath", text: t("ai.error") }]);
    } finally {
      setBusy(false);
    }
  }, [busy, talk, ai.context, progress, provider, remember, t]);

  function listen() {
    tap();
    if (hearing) {
      stopRef.current?.();
      return;
    }
    setMicNote(null);
    setHearing(true);
    let heard = "";
    stopRef.current = dictate(talk, {
      onText: (text) => {
        heard = text;
        setDraft(text);
      },
      onEnd: () => {
        setHearing(false);
        stopRef.current = null;
        // Spoken questions are sent as soon as the person stops talking.
        if (heard.trim()) void ask(heard);
      },
      onError: (reason) => {
        setHearing(false);
        stopRef.current = null;
        setMicNote(reason === "not-allowed" || reason === "service-not-allowed" ? t("ai.micBlocked") : reason === "no-speech" ? t("ai.micNothing") : t("ai.micFailed"));
      },
    });
  }

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
  const mode = providerMode({ allowLocal: prefs.aiLocal, allowOnline: prefs.aiOnline, ollamaUrl: prefs.aiOllamaUrl, ollamaModel: prefs.aiOllamaModel });

  return (
    <div className={`chat-wrap${compact ? " compact" : ""}`}>
      {ai.context && (
        <p className="ai-about faint">
          <BookOpen aria-hidden size={14} /> {t("ai.about", { title: ai.context.title ?? ai.context.screen })}
        </p>
      )}
      <OnlineNote />
      <div className="chat" aria-live="polite" aria-busy={busy}>
        {lines.length === 0 && (
          <div className="ai-hello">
            <span className="ai-orb" aria-hidden><LogoMark size={34} /></span>
            <h2>{t("ai.helloTitle")}</h2>
            <p className="muted">{t("ai.hello")}</p>
          </div>
        )}
        {lines.map((line, index) => (
          <div key={index} className={`bubble ${line.role === "user" ? "me" : "saath"}`}>
            {line.role === "user" ? <p>{line.text}</p> : index === fresh ? <Typed text={line.text} onDone={() => endRef.current?.scrollIntoView({ block: "end" })} /> : <RichText text={line.text} />}
            {line.sources && line.sources.length > 0 && (
              <div className="bubble-guides" data-testid="ai-guide-recommendations">
                <span className="faint">{t("ai.sources")}</span>
                {line.sources.map((source, at) => (
                  <Link key={source.href + at} href={source.href} className="ai-guide-card" onClick={() => ai.closeAsk()}>
                    <BookOpen aria-hidden size={17} />
                    <span>{source.title}</span>
                    <ArrowUp aria-hidden size={15} className="guide-arrow" />
                  </Link>
                ))}
              </div>
            )}
            {line.role === "saath" && <div className="bubble-tools"><ListenButton compact text={line.text.replace(/\*\*/g, "").replace(/^- /gm, "")} lang={line.lang} /></div>}
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

      <div className="talk-row" role="group" aria-label={t("ai.talkIn")}>
        <span className="faint">{t("ai.talkIn")}</span>
        {(["en", "hi", "mr"] as const).map((item) => (
          <button key={item} type="button" className="talk-chip" aria-pressed={talk === item} lang={item} onClick={() => { tap(); setTalk(item); }}>{LANG_SHORT[item]}</button>
        ))}
      </div>
      <form className={`chat-input${hearing ? " hearing" : ""}`} onSubmit={submit}>
        <label className="visually-hidden" htmlFor={compact ? "ask-sheet-input" : "ask-page-input"}>{t("ai.placeholder")}</label>
        <input
          id={compact ? "ask-sheet-input" : "ask-page-input"}
          className="field text boxed"
          value={draft}
          maxLength={500}
          autoComplete="off"
          placeholder={hearing ? t("ai.listening") : t("ai.placeholder")}
          lang={talk}
          onChange={(event) => setDraft(event.target.value)}
        />
        {micOk && (
          <button type="button" className={`icon-btn mic${hearing ? " on" : ""}`} aria-label={hearing ? t("ai.micStop") : t("ai.micStart", { lang: LANG_SHORT[talk] })} aria-pressed={hearing} disabled={busy} onClick={listen}>
            {hearing ? <Square aria-hidden size={16} fill="currentColor" /> : <Mic aria-hidden size={20} />}
          </button>
        )}
        <button type="submit" className="icon-btn send" aria-label={t("ai.send")} disabled={busy || !draft.trim()}>
          <ArrowUp aria-hidden size={20} />
        </button>
      </form>
      {micNote && <p role="status" className="note">{micNote}</p>}

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
