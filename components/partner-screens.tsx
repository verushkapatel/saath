"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { UNITS } from "@/lib/catalog";
import { BASE_PATH, IMPACT_URL, PUBLIC_URL } from "@/lib/config";
import { aggregate, MIN_COHORT, type ImpactEvent } from "@/lib/impact";
import { cleanCode } from "@/lib/profile";
import { tap } from "@/lib/speech";
import { useI18n } from "./providers";
import { SkywardMark } from "./ui";

/** Made-up events so a partner can see what the view looks like before any school has shared numbers. */
function sampleEvents(): ImpactEvent[] {
  const events: ImpactEvent[] = [];
  const make = (cohort: string, grade: string, students: number, before: number[], lift: number[]) => {
    for (let i = 0; i < students; i += 1) {
      events.push({ cohort, grade, kind: "join" });
      const wobble = ((i * 37) % 21 - 10) / 100;
      events.push({ cohort, grade, kind: "check-before", units: before.map((n) => Math.min(1, Math.max(0, n + wobble))) });
      if (i % 3 !== 0) events.push({ cohort, grade, kind: "check-after", units: before.map((n, at) => Math.min(1, Math.max(0, n + lift[at] + wobble))) });
      events.push({ cohort, grade, kind: "lesson", count: 3 + (i % 5) });
      if (i % 2 === 0) events.push({ cohort, grade, kind: "path" });
    }
  };
  make("SAMPLE-A", "9", 34, [0.62, 0.41, 0.38, 0.47], [0.12, 0.24, 0.27, 0.15]);
  make("SAMPLE-A", "11", 28, [0.7, 0.5, 0.45, 0.52], [0.08, 0.19, 0.22, 0.14]);
  make("SAMPLE-B", "10", 6, [0.5, 0.5, 0.5, 0.5], [0.1, 0.1, 0.1, 0.1]);
  return events;
}

export function ImpactScreen() {
  const { t } = useI18n();
  const [events, setEvents] = useState<ImpactEvent[] | null>(IMPACT_URL ? null : []);
  const [failed, setFailed] = useState(false);
  const [sample, setSample] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!IMPACT_URL) return;
    fetch(IMPACT_URL, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("load"))))
      .then((data: unknown) => setEvents(Array.isArray(data) ? (data as ImpactEvent[]) : []))
      .catch(() => { setFailed(true); setEvents([]); });
  }, []);

  const view = useMemo(() => aggregate(sample ? sampleEvents() : events ?? []), [events, sample]);
  const rows = view.rows.filter((row) => !filter || row.cohort.includes(cleanCode(filter)));
  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <article className="stack-lg">
      <header className="stack-sm">
        <div className="brand"><SkywardMark /><span className="brand-name">Saath</span></div>
        <p className="masthead">{t("home.masthead")}</p>
        <h1>{t("impact.title")}</h1>
        <p className="lead">{t("impact.lead")}</p>
      </header>
      <hr className="rule-double" />

      {!IMPACT_URL && !sample && (
        <section className="stack-sm">
          <p>{t("impact.none")}</p>
          <button type="button" className="btn btn-secondary btn-auto" onClick={() => { tap(); setSample(true); }}>{t("impact.sample")}</button>
        </section>
      )}
      {sample && <p className="note"><strong>{t("impact.sampleTag")}</strong></p>}
      {failed && <p role="alert" className="note err">{t("impact.failed")}</p>}
      {events === null && <p className="muted">{t("common.loading")}</p>}

      {(sample || (IMPACT_URL && events !== null && !failed)) && (
        <>
          <label>
            <span className="label">{t("impact.filter")}</span>
            <span className="field-wrap"><input className="field text" value={filter} onChange={(event) => setFilter(event.target.value)} /></span>
          </label>
          {rows.length === 0 && <p className="muted">{t("impact.empty")}</p>}
          {rows.map((row) => (
            <section key={`${row.cohort}-${row.grade}`} className="card stack">
              <h2>{t("impact.group", { cohort: row.cohort, grade: row.grade })}</h2>
              <dl className="stats">
                <div><dt>{t("impact.students")}</dt><dd>{row.students}</dd></div>
                <div><dt>{t("impact.lessons")}</dt><dd>{row.lessons}</dd></div>
                <div><dt>{t("impact.paths")}</dt><dd>{row.paths}</dd></div>
              </dl>
              <p className="faint">{t("impact.checks", { before: row.beforeCount, after: row.afterCount })}</p>
              {row.before && (
                <ul className="unit-bars">
                  {UNITS.map((unit) => (
                    <li key={unit}>
                      <div className="row-between">
                        <span className="unit-name">{t(`unit.${unit}`)}</span>
                        <span className="faint num">
                          {t("check.before")} {percent(row.before![unit])}
                          {row.after ? ` · ${t("check.after")} ${percent(row.after[unit])}` : ""}
                        </span>
                      </div>
                      <div className="bar thin ghost" role="img" aria-label={`${t("check.before")} ${percent(row.before![unit])}`}>
                        <span style={{ width: percent(row.before![unit]) }} />
                      </div>
                      {row.after && (
                        <div className="bar" role="img" aria-label={`${t("check.after")} ${percent(row.after[unit])}`}>
                          <span style={{ width: percent(row.after[unit]) }} />
                        </div>
                      )}
                      {row.change && <p className="faint num">{row.change[unit] > 0 ? "+" : ""}{t("impact.change", { n: row.change[unit] })}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {view.hidden > 0 && <p className="faint">{t("impact.hidden", { n: view.hidden })} ({MIN_COHORT})</p>}
        </>
      )}
    </article>
  );
}

export function LinkScreen() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const clean = cleanCode(code);
  const base = (PUBLIC_URL || (typeof window !== "undefined" ? window.location.origin + BASE_PATH : "")).replace(/\/$/, "");
  const url = clean ? `${base}/?school=${encodeURIComponent(clean)}` : "";

  const svg = useMemo(() => {
    if (!url) return "";
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  }, [url]);

  return (
    <article className="stack-lg">
      <header className="stack-sm">
        <div className="brand"><SkywardMark /><span className="brand-name">Saath</span></div>
        <h1>{t("link.title")}</h1>
        <p className="lead">{t("link.lead")}</p>
      </header>
      <label>
        <span className="label">{t("link.code")}</span>
        <span className="field-wrap">
          <input className="field text" value={code} maxLength={12} autoCapitalize="characters" autoComplete="off" onChange={(event) => { setCode(event.target.value); setCopied(false); }} />
        </span>
      </label>
      {url && (
        <section className="stack">
          <div className="qr" ref={box} role="img" aria-label={t("link.alt", { code: clean })} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="clause" style={{ fontStyle: "normal", wordBreak: "break-all" }}>{url}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              tap();
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {t("link.copy")}
          </button>
          {copied && <p role="status" className="note ok">{t("common.copied")}</p>}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              tap();
              const blob = new Blob([svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')], { type: "image/svg+xml" });
              const href = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = href;
              link.download = `saath-${clean}.svg`;
              link.click();
              URL.revokeObjectURL(href);
            }}
          >
            {t("link.save")}
          </button>
        </section>
      )}
    </article>
  );
}
