"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Image as ImageIcon, Share2 } from "lucide-react";
import { linkHref, loadJson, type CaseStudy, type Path, type PathStep } from "@/lib/content-types";
import { pathProgress } from "@/lib/progress";
import { milestoneImage } from "@/lib/share-image";
import { shareText, tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { ArtPath } from "./illustrations";
import { useI18n } from "./providers";
import { UnitBadge } from "./unit-badge";
import { CheckCard, ContentIcon, ListenButton, PageSkeleton, Ring, Sheet } from "./ui";

/** One row for a path: its unit, its name, how far along it is, and a slim ring. */
export function PathCard({ path }: { path: Path }) {
  const { t, code } = useI18n();
  const { progress } = useApp();
  const state = pathProgress(path, progress);
  const label = state.complete ? t("path.complete") : t("path.steps", { done: state.done, total: state.total });
  return (
    <Link href={`/paths/${path.id}`} className="card tight" onClick={tap}>
      <span className="row-between">
        <span className="stack-xs">
          <UnitBadge unit={path.unit} />
          <h3>{path.title[code]}</h3>
          <span className="faint">{label}</span>
        </span>
        <Ring value={state.ratio} label={label} size={52} stroke={4}>
          {state.complete ? <Check size={18} strokeWidth={3} /> : <ContentIcon name={path.icon} size={20} />}
        </Ring>
      </span>
    </Link>
  );
}

export function PathsScreen() {
  const { t } = useI18n();
  const { paths, ready } = useApp();
  if (!ready || paths.length === 0) return <PageSkeleton />;
  return (
    <div className="stack rise">
      <Link href="/" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.home")}</Link>
      <div className="stack-xs">
        <h1>{t("paths.title")}</h1>
        <p className="lead">{t("paths.intro")}</p>
      </div>
      <div className="stack-sm">
        {paths.map((path) => <PathCard key={path.id} path={path} />)}
      </div>
    </div>
  );
}

function linkLabel(link: string | null, t: (key: string) => string): string {
  if (!link) return "";
  if (link === "tracker") return t("path.openTracker");
  if (link.startsWith("case:")) return t("path.openCase");
  if (link.startsWith("drill:")) return t(`drills.${link.slice(6)}.title`);
  return t("path.openScan");
}

function Milestone({ path }: { path: Path }) {
  const { t, code } = useI18n();
  const [note, setNote] = useState("");
  const line = path.milestone[code];
  const text = t("path.shareLine", { title: path.title[code], milestone: line });

  async function asText() {
    tap();
    const result = await shareText("Saath", text);
    setNote(result === "copied" ? t("path.copied") : "");
  }

  async function asImage() {
    tap();
    const style = getComputedStyle(document.body);
    const head = getComputedStyle(document.querySelector("h1") ?? document.body).fontFamily;
    await document.fonts?.ready;
    const blob = await milestoneImage({
      kicker: t("path.milestone"),
      line,
      title: path.title[code],
      credit: t("common.footer"),
      font: style.fontFamily,
      headFont: head,
    });
    if (!blob) return;
    const file = new File([blob], "saath-milestone.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch {
      // Fall through to saving the picture.
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setNote(t("path.imageSaved"));
  }

  return (
    <section className="milestone" aria-label={t("path.milestone")}>
      <ArtPath label={t("art.path")} small />
      <p className="kicker accent-text">{t("path.milestone")}</p>
      <h2>{line}</h2>
      <div className="cluster" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-secondary btn-auto" onClick={asText}>
          <Share2 aria-hidden size={18} />
          {t("path.shareText")}
        </button>
        <button type="button" className="btn btn-secondary btn-auto" onClick={asImage}>
          <ImageIcon aria-hidden size={18} />
          {t("path.shareImage")}
        </button>
      </div>
      {note && <p role="status" className="note">{note}</p>}
    </section>
  );
}

/** A short burst, only when a path is finished. Twenty-four small pieces moved with transform and opacity. */
function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const reach = 120 + ((index * 53) % 110);
    return {
      "--x": `${Math.round(Math.cos(angle) * reach)}px`,
      "--y": `${Math.round(Math.sin(angle) * reach * 0.8 + 140)}px`,
      "--r": `${(index * 97) % 540}deg`,
      animationDelay: `${(index % 6) * 30}ms`,
    } as React.CSSProperties;
  });
  return <div className="confetti" aria-hidden>{pieces.map((style, index) => <i key={index} style={style} />)}</div>;
}

export function PathScreen({ id }: { id: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const router = useRouter();
  const [open, setOpen] = useState<PathStep | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [burst, setBurst] = useState(false);
  const wasComplete = useRef<boolean | null>(null);
  const path = app.paths.find((item) => item.id === id) ?? null;
  const completeNow = path && app.ready ? pathProgress(path, app.progress).complete : null;

  useEffect(() => {
    if (completeNow === null) return;
    if (wasComplete.current === false && completeNow) {
      setBurst(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      const timer = window.setTimeout(() => setBurst(false), 1500);
      wasComplete.current = completeNow;
      return () => window.clearTimeout(timer);
    }
    wasComplete.current = completeNow;
  }, [completeNow]);

  useEffect(() => {
    loadJson<CaseStudy[]>("/content/cases.json").then(setCases).catch(() => undefined);
  }, []);

  if (!app.ready || app.paths.length === 0) return <PageSkeleton />;
  if (!path) {
    return (
      <div className="state">
        <ArtPath label={t("art.path")} small />
        <p className="lead">{t("path.missing")}</p>
        <Link href="/paths" className="btn btn-primary">{t("home.allPaths")}</Link>
      </div>
    );
  }

  const state = pathProgress(path, app.progress);
  const finished = new Set(app.progress.paths[path.id] ?? []);
  const next = path.steps.find((step) => step.id === state.nextStepId) ?? null;
  const pathCases = cases.filter((item) => path.caseIds.includes(item.id));

  function openStep(step: PathStep) {
    tap();
    void app.setActivePath(path!.id);
    if (step.kind === "lesson") {
      router.push(`/guide/${step.lessonId}?path=${path!.id}`);
      return;
    }
    setPicked(null);
    setOpen(step);
  }

  const kind = (step: PathStep) =>
    step.kind === "lesson" ? t("path.kindLesson") : step.kind === "action" ? t("path.kindAction") : t("path.kindCheck");

  return (
    <div className="stack">
      <Link href="/paths" className="link"><ChevronLeft aria-hidden size={18} />{t("paths.title")}</Link>
      <div className="stack-sm">
        <UnitBadge unit={path.unit} />
        <h1>{path.title[code]}</h1>
        <p className="lead">{path.summary[code]}</p>
        <div className="stack-xs">
          <div className="bar" aria-hidden><span style={{ width: `${state.ratio * 100}%` }} /></div>
          <p className="faint">{state.complete ? t("path.complete") : t("path.steps", { done: state.done, total: state.total })}</p>
        </div>
      </div>

      {burst && <Confetti />}
      {state.complete && <Milestone path={path} />}

      <ol className="steps">
        {path.steps.map((step, index) => {
          const done = finished.has(step.id);
          const isNext = step.id === state.nextStepId;
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`step${done ? " done" : ""}${isNext ? " next" : ""}`}
                aria-label={`${done ? t("path.stepDone") : isNext ? t("path.stepNext") : t("path.stepLater")}. ${kind(step)}. ${step.title[code]}`}
                onClick={() => openStep(step)}
              >
                <span className="step-mark" aria-hidden>{done ? <Check className="draw" size={18} strokeWidth={3} /> : index + 1}</span>
                <span className="step-body">
                  <span className="item-sub">{kind(step)}</span>
                  <span className="item-title">{step.title[code]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {next && (
        <button type="button" className="btn btn-primary" onClick={() => openStep(next)}>
          {state.done > 0 ? t("path.continue") : t("path.start")}
          <ChevronRight aria-hidden size={18} />
        </button>
      )}

      {pathCases.length > 0 && (
        <section className="stack-sm">
          <h2>{t("path.cases")}</h2>
          <ul className="list card tight">
            {pathCases.map((item) => (
              <li key={item.id}>
                <Link href={`/money-lab/case/${item.id}`} className="item">
                  <span className={`item-icon${item.id in app.progress.cases ? " done" : ""}`}>
                    {item.id in app.progress.cases ? <Check aria-hidden size={20} strokeWidth={3} /> : <ContentIcon name="file" size={20} />}
                  </span>
                  <span className="item-body"><span className="item-title">{item.title[code]}</span></span>
                  <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && open.kind === "action" && (
        <Sheet title={open.title[code]} onClose={() => setOpen(null)}>
          <div className="stack">
            <p>{open.body[code]}</p>
            <ListenButton text={`${open.title[code]}. ${open.body[code]}`} />
            {linkHref(open.link) && (
              <Link href={linkHref(open.link)!} className="btn btn-secondary" onClick={() => setOpen(null)}>
                {linkLabel(open.link, t)}
              </Link>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={finished.has(open.id)}
              onClick={async () => {
                await app.finishStep(path.id, open.id);
                setOpen(null);
              }}
            >
              <Check aria-hidden size={18} strokeWidth={3} />
              {finished.has(open.id) ? t("task.done") : t("path.didIt")}
            </button>
          </div>
        </Sheet>
      )}

      {open && open.kind === "check" && (
        <Sheet title={open.title[code]} onClose={() => setOpen(null)}>
          <div className="stack">
            <CheckCard
              check={open.check}
              picked={picked}
              onPick={(index) => {
                setPicked(index);
                void app.finishStep(path.id, open.id);
              }}
            />
            {picked !== null && (
              <button type="button" className="btn btn-primary" onClick={() => setOpen(null)}>{t("common.done")}</button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
