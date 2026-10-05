"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Printer } from "lucide-react";
import { UNITS, type Unit } from "@/lib/catalog";
import { asset } from "@/lib/config";
import type { Lesson } from "@/lib/content-types";
import { monthLabel } from "@/lib/format";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { ShareButton } from "./share-button";
import { ListenButton, PageSkeleton } from "./ui";
import { loadWalk, type Walkthrough } from "@/lib/content-types";
import { Character } from "./character";
import { LogoMark, SkywardEmblem } from "./logo";
import { SceneArt } from "./scenes";
import { verenaAt } from "@/lib/verena";

const plain = (text: string) => text.replace(/\[\[([a-z0-9-]+)\]\]/g, "$1");

/**
 * The Skyward Handbook. It is built from the same lessons as Learn, so the app, the PDF and
 * the printed copy cannot disagree. Printing this page (or saving it as PDF) gives the handbook.
 */
export function HandbookScreen({ print }: { print?: boolean }) {
  const { t, code } = useI18n();
  const { lessons } = useApp();
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [pdf, setPdf] = useState(false);
  const [walks, setWalks] = useState<Record<string, Walkthrough>>({});

  useEffect(() => {
    fetch(asset("/content/glossary.json"))
      .then((response) => response.json())
      .then((list: { id: string; term: Record<string, string> }[]) => setTerms(Object.fromEntries(list.map((item) => [item.id, item.term[code]]))))
      .catch(() => undefined);
    fetch(asset(`/handbook/saath-handbook-${code}.pdf`), { method: "HEAD" }).then((response) => setPdf(response.ok)).catch(() => setPdf(false));
  }, [code]);

  // Every guide's step-by-step walkthrough is part of the book.
  useEffect(() => {
    if (lessons.length === 0) return;
    let live = true;
    Promise.all(lessons.map((lesson) => loadWalk(lesson.id).then((walk) => [lesson.id, walk] as const).catch(() => null))).then((list) => {
      if (live) setWalks(Object.fromEntries(list.filter((item): item is readonly [string, Walkthrough] => item !== null)));
    });
    return () => { live = false; };
  }, [lessons]);

  if (lessons.length === 0) return <PageSkeleton />;

  const words = (text: string) => text.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id: string) => terms[id] ?? id);
  const reviewed = lessons.map((lesson) => lesson.reviewed ?? "").sort().at(-1) ?? "";
  const unitText = (unit: Unit, list: Lesson[]) =>
    [
      `${t(`unit.${unit}`)}`,
      t(`unitDesc.${unit}`),
      ...list.map((lesson) => `\n${lesson.title[code]}\n${plain(words(lesson.body[code]))}\n${lesson.points.map((point) => `• ${point[code]}`).join("\n")}\n${t("handbook.example")}: ${lesson.example[code]}`),
      `\n${t("common.footer")}`,
    ].join("\n");

  return (
    <article className="stack-lg handbook">
      {!print && <Link href="/guide" className="link no-print"><ChevronLeft aria-hidden size={18} />{t("nav.guide")}</Link>}
      <section className="hb-cover" aria-hidden={!print}>
        <div className="hb-cover-band">
          <p className="hb-cover-brand"><span className="hb-logo"><LogoMark size={30} /></span> Saath <span className="logo-divider" aria-hidden /><SkywardEmblem size={34} /></p>
          <h1 className="hb-cover-title">{t("handbook.title")}</h1>
          <p className="hb-cover-lead">{t("handbook.coverLead")}</p>
        </div>
        <div className="hb-cover-row">
          {[0, 12, 30, 52, 72, 92].map((step) => {
            const look = verenaAt(step, 92);
            return <Character key={step} look={look} age={look.age} size={92} bare />;
          })}
        </div>
        <ol className="hb-toc">
          {UNITS.map((unit, index) => <li key={unit}><span>{String(index + 1).padStart(2, "0")}</span>{t(`unit.${unit}`)}<em>{lessons.filter((lesson) => lesson.unit === unit).length}</em></li>)}
        </ol>
      </section>
      <header className="stack-sm hb-screen-head">
        <p className="masthead">{t("home.masthead")}</p>
        <h1>{t("handbook.title")}</h1>
        <p className="lead">{t("handbook.lead")}</p>
        {reviewed && <p className="faint">{t("handbook.reviewed", { month: monthLabel(reviewed, code) })}</p>}
        <div className="cluster no-print">
          <button type="button" className="btn btn-secondary btn-auto" onClick={() => { tap(); window.print(); }}>
            <Printer aria-hidden size={18} />
            {t("handbook.pdf")}
          </button>
          {pdf && (
            <a className="btn btn-secondary btn-auto" href={asset(`/handbook/saath-handbook-${code}.pdf`)} download>
              <Download aria-hidden size={18} />
              {t("handbook.download")}
            </a>
          )}
        </div>
      </header>

      {UNITS.map((unit, index) => {
        const list = lessons.filter((lesson) => lesson.unit === unit);
        return (
          <section key={unit} className="stack handbook-unit" aria-labelledby={`hb-${unit}`}>
            <hr className="rule-double" />
            <div className="stack-sm">
              <p className="masthead">{String(index + 1).padStart(2, "0")}</p>
              <h2 id={`hb-${unit}`}>{t(`unit.${unit}`)}</h2>
              <p className="lead">{t(`unitDesc.${unit}`)}</p>
              <div className="cluster no-print">
                <ListenButton text={unitText(unit, list)} />
                <ShareButton title={t("handbook.title")} text={unitText(unit, list)} path="/handbook" label={t("handbook.shareUnit")} className="listen" />
              </div>
            </div>
            {list.map((lesson) => (
              <section key={lesson.id} className="stack-sm handbook-lesson">
                <h3>{lesson.title[code]}</h3>
                <p>{words(lesson.body[code]).replace(/\n\n/g, " ")}</p>
                <ul className="bullets">
                  {lesson.points.map((point, at) => <li key={at}>{point[code]}</li>)}
                </ul>
                <p className="muted"><strong>{t("handbook.example")}.</strong> {lesson.example[code]}</p>
                {walks[lesson.id] && (
                  <div className="hb-walk">
                    <p className="hb-walk-title">{t("handbook.liveIt")}: {walks[lesson.id].title[code]}</p>
                    <ol className="hb-steps">
                      {walks[lesson.id].steps.map((step, at) => (
                        <li key={at} className="hb-step">
                          <div className="hb-step-art"><SceneArt kind={step.scene} lines={(step.screen ?? []).map((line) => line[code] ?? line.en)} look={verenaAt(at * 7 + 30, 92)} /></div>
                          <div className="hb-step-body">
                            <h4><span>{at + 1}</span>{step.title[code]}</h4>
                            <p>{step.text[code]}</p>
                            {step.details && <ul>{step.details.map((line, i) => <li key={i}>{line[code]}</li>)}</ul>}
                            {step.say && <p className="hb-say">{step.say.who[code]} {step.say.line[code]}</p>}
                            {step.watch && <p className="hb-watch"><strong>{t("walk.watch")}</strong> {step.watch[code]}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p className="hb-remember"><strong>{t("walk.remember")}:</strong> {walks[lesson.id].takeaways.map((line) => line[code]).join(" · ")}</p>
                  </div>
                )}
              </section>
            ))}
          </section>
        );
      })}
      <p className="faint">{t("common.footer")} · {t("result.disclaimer")}</p>
    </article>
  );
}
