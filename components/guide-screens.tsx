"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, ChevronLeft, ChevronRight, Lightbulb, MessageCircle, Mic, Search } from "lucide-react";
import { TOPICS, type Topic } from "@/lib/catalog";
import { monthLabel } from "@/lib/format";
import { linkHref, loadJson, type CaseStudy, type MiniCheck } from "@/lib/content-types";
import { canHear, hear, tap } from "@/lib/speech";
import { weakTopics } from "@/lib/recommend";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { ShareButton } from "./share-button";
import { CheckCard, ContentIcon, GlossarySheet, ListenButton, PageSkeleton, TermText, useGlossary } from "./ui";

const plain = (text: string) => text.replace(/\[\[|\]\]/g, "");

export function GuideScreen() {
  const { t, code } = useI18n();
  const { lessons, progress } = useApp();
  const glossary = useGlossary();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [listening, setListening] = useState(false);

  // "/guide?topic=saving" opens the list on one topic, for the revise-by-topic links elsewhere.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("topic");
    if (wanted && (TOPICS as readonly string[]).includes(wanted)) setTopic(wanted as Topic);
  }, []);

  async function voice() {
    if (listening) return;
    tap();
    setListening(true);
    try {
      setQuery(await hear(code));
    } catch {
      // The search box is still there to type in.
    } finally {
      setListening(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const termIds = needle
      ? glossary.terms.filter((term) => term.term[code].toLowerCase().includes(needle)).map((term) => `[[${term.id}]]`)
      : [];
    return lessons.filter((lesson) => {
      if (topic !== "all" && lesson.topic !== topic) return false;
      if (!needle) return true;
      const hay = `${lesson.title[code]} ${lesson.summary[code]} ${lesson.points.map((point) => point[code]).join(" ")}`.toLowerCase();
      return hay.includes(needle) || termIds.some((id) => lesson.body[code].includes(id));
    });
  }, [lessons, glossary.terms, query, topic, code]);

  useAiContext({
    screen: t("nav.guide"),
    kind: "lesson",
    title: t("guide.title"),
    suggestions: [t("ai.s1"), t("ai.s2"), t("ai.s3")],
  });

  if (lessons.length === 0) return <PageSkeleton />;
  const read = lessons.filter((lesson) => progress.lessons.includes(lesson.id)).length;

  return (
    <div className="stack rise">
      <div className="stack-xs">
        <p className="masthead">{t("home.masthead")}</p>
        <h1>{t("nav.guide")}</h1>
        <p className="lead">{t("guide.intro")}</p>
      </div>
      <div>
        <Link href="/handbook" className="card tight tile" onClick={tap}>
          <BookMarked aria-hidden size={22} />
          <span className="item-title">{t("handbook.open")}</span>
          <span className="item-sub">{t("handbook.sub")}</span>
        </Link>
      </div>
      <section className="stack-sm" id="revise" aria-labelledby="revise-h">
        <h2 id="revise-h">{t("revise.title")}</h2>
        <p className="faint">{t("revise.lead")}</p>
        <div className="revise-grid">
          {TOPICS.map((item) => {
            const all = lessons.filter((lesson) => lesson.topic === item);
            if (all.length === 0) return null;
            const done = all.filter((lesson) => progress.lessons.includes(lesson.id)).length;
            const weak = weakTopics(progress, 5).includes(item);
            return (
              <button
                key={item}
                type="button"
                className={`revise-tile${weak ? " weak" : ""}`}
                aria-pressed={topic === item}
                onClick={() => { tap(); setTopic(item); document.getElementById("guide-list-h")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              >
                <span className="item-title">{t(`topics.${item}`)}</span>
                <span className="bar" aria-hidden><span style={{ width: `${Math.max(4, (done / all.length) * 100)}%` }} /></span>
                <span className="item-sub">{weak ? t("revise.weak") : t("revise.count", { done, total: all.length })}</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className="row-between">
        <h2 id="guide-list-h">{t("guide.title")}</h2>
        <p className="faint">{t("guide.read", { done: read, total: lessons.length })}</p>
      </div>
      <label>
        <span className="visually-hidden">{t("guide.search")}</span>
        <span className="field-wrap" style={{ marginTop: 0 }}>
          <Search aria-hidden size={18} />
          <input className="field text" type="search" value={query} placeholder={t("guide.search")} onChange={(event) => setQuery(event.target.value)} />
          {canHear() && (
            <button type="button" className="icon-btn" style={{ border: 0 }} aria-label={listening ? t("home.listening") : t("guide.voice")} aria-pressed={listening} onClick={() => void voice()}>
              <Mic aria-hidden size={18} />
            </button>
          )}
        </span>
      </label>
      <div className="chips" role="group" aria-label={t("guide.filter")}>
        {(["all", ...TOPICS] as const).map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={topic === item} onClick={() => { tap(); setTopic(item); }}>
            {item === "all" ? t("guide.allTopics") : t(`topics.${item}`)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="state">
          <span className="item-icon"><Search aria-hidden size={20} /></span>
          <p className="lead">{t("guide.empty")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => { tap(); setQuery(""); setTopic("all"); }}>{t("guide.allTopics")}</button>
        </div>
      ) : (
        <ul className="list card tight">
          {filtered.map((lesson) => {
            const done = progress.lessons.includes(lesson.id);
            return (
              <li key={lesson.id}>
                <Link href={`/guide/${lesson.id}`} className={`item${done ? " is-done" : ""}`}>
                  <span className={`item-icon${done ? " done" : ""}`}>
                    {done ? <Check aria-hidden size={20} strokeWidth={3} /> : <ContentIcon name={lesson.icon} size={20} />}
                  </span>
                  <span className="item-body">
                    {topic === "all" && <span className="unit-badge">{t(`topics.${lesson.topic}`)}</span>}
                    <span className="item-title">{lesson.title[code]}</span>
                    <span className="item-sub two">{lesson.summary[code]}</span>
                  </span>
                  <span className="item-end">
                    {done ? <span className="visually-hidden">{t("lesson.done")}</span> : null}
                    <ChevronRight aria-hidden size={20} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function tryLabel(link: string | null, t: (key: string) => string): string {
  if (link === "tracker") return t("path.openTracker");
  if (link?.startsWith("episode:")) return t("guide.openEpisode");
  if (link?.startsWith("form:")) return t("guide.openForm");
  if (link?.startsWith("drill:")) return t(`drills.${link.slice(6)}.title`);
  if (link?.startsWith("case:")) return t("path.openCase");
  return t("path.openScan");
}

export function LessonScreen({ id, pathId }: { id: string; pathId?: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const glossary = useGlossary();
  const ai = useAi();
  const [picked, setPicked] = useState<number | null>(null);
  const lesson = app.lessons.find((item) => item.id === id) ?? null;

  useAiContext(lesson ? {
    screen: t("nav.guide"),
    kind: "lesson",
    id: lesson.id,
    title: lesson.title[code],
    text: `${lesson.summary[code]}\n${plain(lesson.body[code])}\n${lesson.points.map((point) => point[code]).join(" ")}`,
    suggestions: [t("guide.askSimpler"), t("guide.askExample")],
  } : null);

  if (app.lessons.length === 0) return <PageSkeleton />;
  if (!lesson) {
    return (
      <div className="state">
        <span className="item-icon"><Search aria-hidden size={20} /></span>
        <p className="lead">{t("guide.missing")}</p>
        <Link href="/guide" className="btn btn-primary">{t("guide.title")}</Link>
      </div>
    );
  }

  const index = app.lessons.findIndex((item) => item.id === id);
  const next = app.lessons[index + 1] ?? null;
  const path = pathId ? app.paths.find((item) => item.id === pathId) : null;
  const done = app.progress.lessons.includes(lesson.id);
  const paragraphs = lesson.body[code].split(/\n\n/);
  const tryHref = linkHref(lesson.tryIt.link);
  const spoken = [
    lesson.title[code],
    plain(lesson.body[code]),
    lesson.points.map((point) => point[code]).join(" "),
    lesson.example[code],
    lesson.tryIt.text[code],
  ].join(". ");

  return (
    <article className="stack">
      <Link href={path ? `/paths/${path.id}` : "/guide"} className="link">
        <ChevronLeft aria-hidden size={18} />
        {path ? path.title[code] : t("guide.title")}
      </Link>
      <div className="pin-top cluster"><ListenButton text={spoken} /><ShareButton title={lesson.title[code]} text={`${lesson.title[code]}: ${lesson.points[0]?.[code] ?? ""}`} path={`/guide/${lesson.id}`} /></div>
      <div className="stack-sm">
        <span className="item-icon"><ContentIcon name={lesson.icon} /></span>
        <span className="unit-badge">{t(`topics.${lesson.topic}`)}</span>
        <h1>{lesson.title[code]}</h1>
      </div>

      <div className="prose">
        {paragraphs.map((paragraph, at) => (
          <p key={at}><TermText text={paragraph} terms={glossary.terms} onTerm={glossary.show} /></p>
        ))}
      </div>

      <section className="stack-sm" aria-labelledby="points-h">
        <h2 id="points-h">{t("lesson.points")}</h2>
        <ol className="points">
          {lesson.points.map((point, at) => (
            <li key={at}><span aria-hidden>{at + 1}</span><span>{point[code]}</span></li>
          ))}
        </ol>
      </section>

      <section className="card flat" aria-labelledby="example-h">
        <div className="stack-xs">
          <h2 className="block-title" id="example-h">{t("lesson.example")}</h2>
          <p>{lesson.example[code]}</p>
        </div>
      </section>

      <section className="card tight" aria-labelledby="try-h">
        <div className="block">
          <span className="item-icon"><Lightbulb aria-hidden size={20} /></span>
          <div className="block-body">
            <h2 className="block-title" id="try-h">{t("lesson.try")}</h2>
            <p>{lesson.tryIt.text[code]}</p>
            {tryHref && (
              <Link href={tryHref} className="link">
                {tryLabel(lesson.tryIt.link, t)}
                <ChevronRight aria-hidden size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <button type="button" className="btn btn-ghost" onClick={() => { tap(); ai.openAsk(t("guide.askSimpler")); }}>
        <MessageCircle aria-hidden size={18} />{t("guide.askSaath")}
      </button>

      <section className="card" aria-labelledby="check-h">
        <div className="stack-sm">
          <p className="kicker" id="check-h">{t("lesson.check")}</p>
          <CheckCard
            check={lesson.check}
            picked={picked}
            onPick={(choice) => {
              setPicked(choice);
              if (choice !== lesson.check.answer) void app.mistake(lesson.topic);
              void app.finishLesson(lesson.id);
            }}
          />
          {picked !== null && picked !== lesson.check.answer && (
            <button type="button" className="link" onClick={() => { tap(); ai.openAsk(t("ai.whyWrong", { question: lesson.check.question[code] })); }}>
              <MessageCircle aria-hidden size={16} />{t("ai.askWhy")}
            </button>
          )}
        </div>
      </section>

      {(done || picked !== null) && (
        <div className="stack-sm">
          <p role="status" className="note ok">{t("lesson.finished")}</p>
          {path ? (
            <Link href={`/paths/${path.id}`} className="btn btn-primary">{t("lesson.backToPath")}</Link>
          ) : next ? (
            <Link href={`/guide/${next.id}`} className="btn btn-primary">
              {t("lesson.next")}
              <ChevronRight aria-hidden size={18} />
            </Link>
          ) : null}
        </div>
      )}
      {(lesson.reviewed || lesson.sources?.length) && (
        <div className="stack-xs sources">
          {lesson.reviewed && <p className="faint">{t("lesson.reviewed", { month: monthLabel(lesson.reviewed, code) })}</p>}
          {lesson.sources?.length ? (
            <p className="faint">
              {t("lesson.sources")}:{" "}
              {lesson.sources.map((url, at) => (
                <span key={url}>
                  {at > 0 ? ", " : ""}
                  <a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname.replace(/^www\./, "")}</a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}
      <GlossarySheet term={glossary.term} onClose={glossary.close} />
    </article>
  );
}

export function CaseScreen({ id }: { id: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [item, setItem] = useState<CaseStudy | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    loadJson<CaseStudy[]>("/content/cases.json")
      .then((cases) => {
        const found = cases.find((entry) => entry.id === id) ?? null;
        if (found) setItem(found);
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [id]);

  const check = useMemo<MiniCheck | null>(
    () => (item ? { question: item.question, options: item.options, answer: item.best, why: item.debrief } : null),
    [item],
  );

  if (missing) {
    return (
      <div className="state">
        <span className="item-icon"><Search aria-hidden size={20} /></span>
        <p className="lead">{t("guide.missing")}</p>
        <Link href="/money-lab" className="btn btn-primary">{t("money.title")}</Link>
      </div>
    );
  }
  if (!item || !check || !app.ready) return <PageSkeleton />;

  const choice = id in app.progress.cases ? app.progress.cases[id] : null;
  const path = app.paths.find((entry) => entry.caseIds.includes(id)) ?? null;
  const spoken = `${item.title[code]}. ${item.story[code]} ${choice !== null ? item.debrief[code] : item.question[code]}`;

  return (
    <article className="stack">
      <Link href="/money-lab" className="link"><ChevronLeft aria-hidden size={18} />{t("money.title")}</Link>
      <div className="stack-sm">
        <div className="row-between">
          <p className="kicker">{t("money.caseTitle")}</p>
          <ListenButton text={spoken} />
        </div>
        <h1>{item.title[code]}</h1>
      </div>
      <div className="prose">
        {item.story[code].split(/\n\n/).map((paragraph, at) => <p key={at}>{paragraph}</p>)}
      </div>
      <section className="card">
        <CheckCard check={check} picked={choice} onPick={(index) => void app.finishCase(id, index)} />
      </section>
      {item.sampleId && (
        <Link className="btn btn-secondary" href={`/scan?sample=${item.sampleId}`}>{t("case.openSample")}</Link>
      )}
      {path && (
        <Link className="card tight" href={`/paths/${path.id}`}>
          <span className="item" style={{ padding: 0, minHeight: 0 }}>
            <span className="item-icon"><ContentIcon name={path.icon} size={20} /></span>
            <span className="item-body"><span className="item-title">{t("path.partOf", { title: path.title[code] })}</span></span>
            <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
          </span>
        </Link>
      )}
    </article>
  );
}
