"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Printer, Share2 } from "lucide-react";
import { UNITS, type Unit } from "@/lib/catalog";
import { asset } from "@/lib/config";
import type { Lesson } from "@/lib/content-types";
import { monthLabel } from "@/lib/format";
import { shareText, tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { ListenButton, PageSkeleton } from "./ui";

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
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch(asset("/content/glossary.json"))
      .then((response) => response.json())
      .then((list: { id: string; term: Record<string, string> }[]) => setTerms(Object.fromEntries(list.map((item) => [item.id, item.term[code]]))))
      .catch(() => undefined);
    fetch(asset(`/handbook/saath-handbook-${code}.pdf`), { method: "HEAD" }).then((response) => setPdf(response.ok)).catch(() => setPdf(false));
  }, [code]);

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
      <header className="stack-sm">
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
                <button
                  type="button"
                  className="listen"
                  onClick={async () => {
                    tap();
                    const result = await shareText(t("handbook.title"), unitText(unit, list));
                    setNote(result === "copied" ? `${unit}` : "");
                  }}
                >
                  <Share2 aria-hidden size={18} />
                  {t("handbook.shareUnit")}
                </button>
              </div>
              {note === unit && <p role="status" className="note">{t("common.copied")}</p>}
            </div>
            {list.map((lesson) => (
              <section key={lesson.id} className="stack-sm handbook-lesson">
                <h3>{lesson.title[code]}</h3>
                <p>{words(lesson.body[code]).replace(/\n\n/g, " ")}</p>
                <ul className="bullets">
                  {lesson.points.map((point, at) => <li key={at}>{point[code]}</li>)}
                </ul>
                <p className="muted"><strong>{t("handbook.example")}.</strong> {lesson.example[code]}</p>
              </section>
            ))}
          </section>
        );
      })}
      <p className="faint">{t("common.footer")} · {t("result.disclaimer")}</p>
    </article>
  );
}
