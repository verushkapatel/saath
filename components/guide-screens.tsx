"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Lightbulb, Search } from "lucide-react";
import { CATEGORIES, type Category } from "@/lib/catalog";
import { linkHref, loadJson, type CaseStudy, type MiniCheck } from "@/lib/content-types";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { CheckCard, ContentIcon, GlossarySheet, ListenButton, PageSkeleton, TermText, useGlossary } from "./ui";

const plain = (text: string) => text.replace(/\[\[|\]\]/g, "");

export function GuideScreen() {
  const { t, code } = useI18n();
  const { lessons, progress } = useApp();
  const glossary = useGlossary();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const termIds = needle
      ? glossary.terms.filter((term) => term.term[code].toLowerCase().includes(needle)).map((term) => `[[${term.id}]]`)
      : [];
    return lessons.filter((lesson) => {
      if (category !== "all" && lesson.category !== category) return false;
      if (!needle) return true;
      const hay = `${lesson.title[code]} ${lesson.summary[code]} ${lesson.points.map((point) => point[code]).join(" ")}`.toLowerCase();
      return hay.includes(needle) || termIds.some((id) => lesson.body[code].includes(id));
    });
  }, [lessons, glossary.terms, query, category, code]);

  if (lessons.length === 0) return <PageSkeleton />;
  const read = lessons.filter((lesson) => progress.lessons.includes(lesson.id)).length;

  return (
    <div className="stack rise">
      <div className="stack-xs">
        <h1>{t("guide.title")}</h1>
        <p className="faint">{t("guide.read", { done: read, total: lessons.length })}</p>
      </div>
      <label>
        <span className="visually-hidden">{t("guide.search")}</span>
        <span className="field-wrap" style={{ marginTop: 0 }}>
          <Search aria-hidden size={18} />
          <input className="field text" type="search" value={query} placeholder={t("guide.search")} onChange={(event) => setQuery(event.target.value)} />
        </span>
      </label>
      <div className="chips" role="group" aria-label={t("guide.filter")}>
        {(["all", ...CATEGORIES] as const).map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={category === item} onClick={() => { tap(); setCategory(item); }}>
            {t(`cat.${item}`)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="state">
          <span className="item-icon"><Search aria-hidden size={20} /></span>
          <p className="lead">{t("guide.empty")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => { tap(); setQuery(""); setCategory("all"); }}>{t("cat.all")}</button>
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
  if (link?.startsWith("case:")) return t("path.openCase");
  return t("path.openScan");
}

export function LessonScreen({ id, pathId }: { id: string; pathId?: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const glossary = useGlossary();
  const [picked, setPicked] = useState<number | null>(null);
  const lesson = app.lessons.find((item) => item.id === id) ?? null;

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
      <div className="pin-top"><ListenButton text={spoken} /></div>
      <div className="stack-sm">
        <span className="item-icon"><ContentIcon name={lesson.icon} /></span>
        <p className="kicker">{t(`cat.${lesson.category}`)}</p>
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

      <section className="card" aria-labelledby="check-h">
        <div className="stack-sm">
          <p className="kicker" id="check-h">{t("lesson.check")}</p>
          <CheckCard
            check={lesson.check}
            picked={picked}
            onPick={(choice) => {
              setPicked(choice);
              void app.finishLesson(lesson.id);
            }}
          />
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
