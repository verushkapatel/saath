"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, MessageCircle, Play, Quote, X } from "lucide-react";
import { loadWalk, type Copy, type Walkthrough } from "@/lib/content-types";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { SceneArt } from "./scenes";
import { ListenButton } from "./ui";

const pick = (copy: Copy | undefined, code: keyof Copy) => (copy ? copy[code] || copy.en : "");

export function useWalk(id: string | null | undefined): Walkthrough | null | "missing" {
  const [walk, setWalk] = useState<Walkthrough | null | "missing">(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadWalk(id).then((data) => live && setWalk(data)).catch(() => live && setWalk("missing"));
    return () => {
      live = false;
    };
  }, [id]);
  return id ? walk : "missing";
}

/** The card on a guide that opens its walkthrough. */
export function WalkCard({ walk, onOpen }: { walk: Walkthrough; onOpen: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const done = app.progress.walks.includes(walk.id);
  const first = walk.steps[0];
  return (
    <button type="button" className="walk-card" onClick={() => { tap(); onOpen(); }} data-testid="walk-open">
      <span className="walk-card-art">
        <SceneArt kind={first.scene} lines={(first.screen ?? []).map((line) => pick(line, code))} look={app.verena} />
      </span>
      <span className="walk-card-body">
        <span className="kicker">{done ? t("walk.again") : t("walk.kicker")}</span>
        <strong>{pick(walk.title, code)}</strong>
        <span className="faint">{t("walk.meta", { steps: walk.steps.length })} · {pick(walk.setting, code)}</span>
        <span className="walk-play">{done ? <CheckCircle2 aria-hidden size={18} /> : <Play aria-hidden size={18} fill="currentColor" />}{done ? t("walk.replay") : t("walk.start")}</span>
      </span>
    </button>
  );
}

/**
 * The walkthrough player. Full screen, one step at a time, with the picture on top and a segmented bar like a story.
 * A step with a decision waits until a choice is made, then explains it. The end lists what to remember and finishes
 * the guide, which plays the XP, Verena and postcard celebration.
 */
export function WalkPlayer({ walk, onClose }: { walk: Walkthrough; onClose: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const total = walk.steps.length;
  const step = walk.steps[Math.min(at, total - 1)];
  const atEnd = at >= total;
  const choice = step?.choice;
  const picked = picks[at];
  const blocked = Boolean(choice) && picked === undefined && !atEnd;
  const startX = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const stepText = useMemo(() => {
    if (!step || atEnd) return "";
    return [
      pick(step.title, code),
      pick(step.text, code),
      ...(step.details ?? []).map((line) => pick(line, code)),
      step.say ? `${pick(step.say.who, code)}: ${pick(step.say.line, code)}` : "",
      step.watch ? `${t("walk.watch")}: ${pick(step.watch, code)}` : "",
    ].filter(Boolean).join("\n");
  }, [step, atEnd, code, t]);

  useAiContext({
    screen: t("walk.kicker"),
    kind: "lesson",
    id: walk.guide,
    title: `${pick(walk.title, code)}${atEnd ? "" : ` · ${t("walk.stepOf", { n: at + 1, total })}`}`,
    text: stepText || walk.takeaways.map((line) => pick(line, code)).join("\n"),
    suggestions: [t("walk.askWhy"), t("walk.askReal")],
  });

  const go = useCallback((next: number) => {
    setAt(Math.max(0, Math.min(total, next)));
    bodyRef.current?.scrollTo({ top: 0 });
  }, [total]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && !blocked) go(at + 1);
      if (event.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [at, blocked, go, onClose]);

  const good = Object.entries(picks).filter(([index, option]) => walk.steps[Number(index)]?.choice?.options[option]?.good).length;

  async function finish() {
    tap();
    setFinished(true);
    onClose();
    await app.finishWalk(walk.id, walk.guide, good);
  }

  return createPortal(
    <div
      className="walk"
      role="dialog"
      aria-modal="true"
      aria-label={pick(walk.title, code)}
      data-testid="walk-player"
      onTouchStart={(event) => { startX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (startX.current === null) return;
        const dx = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
        startX.current = null;
        if (dx < -70 && !blocked) go(at + 1);
        if (dx > 70) go(at - 1);
      }}
    >
      <div className="walk-top">
        <div className="walk-bars" aria-hidden>
          {walk.steps.map((_, index) => <span key={index} className={index < at ? "done" : index === at ? "now" : ""} />)}
        </div>
        <div className="walk-head">
          <span className="faint">{atEnd ? t("walk.end") : t("walk.stepOf", { n: at + 1, total })}</span>
          <span className="cluster">
            {!atEnd && <ListenButton compact text={stepText} />}
            <button type="button" className="icon-btn" aria-label={t("common.close")} onClick={() => { tap(); onClose(); }} data-testid="walk-close"><X aria-hidden size={20} /></button>
          </span>
        </div>
      </div>

      <div className="walk-body" ref={bodyRef}>
        {!atEnd && step ? (
          <article key={at} className="walk-step">
            <div className="walk-art">
              <SceneArt kind={step.scene} lines={(step.screen ?? []).map((line) => pick(line, code))} look={app.verena} label={pick(step.title, code)} />
            </div>
            <h2 className="walk-title">{pick(step.title, code)}</h2>
            {step.cost && <p className="walk-cost"><Clock aria-hidden size={14} />{pick(step.cost, code)}</p>}
            <p className="walk-text">{pick(step.text, code)}</p>
            {step.say && (
              <blockquote className="walk-say">
                <Quote aria-hidden size={16} />
                <span><b>{pick(step.say.who, code)}</b> {pick(step.say.line, code)}</span>
              </blockquote>
            )}
            {step.details && step.details.length > 0 && (
              <ul className="walk-details">
                {step.details.map((line, index) => <li key={index}><Check aria-hidden size={15} strokeWidth={3} /><span>{pick(line, code)}</span></li>)}
              </ul>
            )}
            {step.watch && (
              <p className="walk-watch"><AlertTriangle aria-hidden size={16} /><span><b>{t("walk.watch")}</b> {pick(step.watch, code)}</span></p>
            )}
            {choice && (
              <div className="walk-choice" role="group" aria-label={pick(choice.prompt, code)}>
                <p className="walk-choice-q">{pick(choice.prompt, code)}</p>
                {choice.options.map((option, index) => {
                  const chosen = picked === index;
                  const reveal = picked !== undefined;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`walk-option${reveal && option.good ? " good" : ""}${chosen && !option.good ? " bad" : ""}${reveal && !chosen && !option.good ? " dim" : ""}`}
                      disabled={reveal}
                      onClick={() => { tap(); setPicks((current) => ({ ...current, [at]: index })); }}
                      data-testid="walk-option"
                    >
                      {pick(option.text, code)}
                      {reveal && option.good && <Check aria-hidden size={16} strokeWidth={3} />}
                    </button>
                  );
                })}
                {picked !== undefined && (
                  <p className={`walk-result${choice.options[picked]?.good ? " good" : ""}`} role="status">
                    {choice.options[picked]?.good ? <b>{t("walk.goodCall")} </b> : <b>{t("walk.thinkAgain")} </b>}
                    {pick(choice.options[picked]?.result, code)}
                  </p>
                )}
              </div>
            )}
            <button type="button" className="link walk-ask" onClick={() => { tap(); ai.openAsk(t("walk.askThis", { step: pick(step.title, code) })); }}>
              <MessageCircle aria-hidden size={16} />{t("walk.askSaath")}
            </button>
          </article>
        ) : (
          <article className="walk-step walk-end">
            <div className="walk-art"><SceneArt kind="garden" lines={[t("walk.livedIt")]} look={app.verena} /></div>
            <h2 className="walk-title">{t("walk.livedIt")}</h2>
            <p className="walk-text">{pick(walk.title, code)}</p>
            <h3>{t("walk.remember")}</h3>
            <ol className="walk-takeaways">
              {walk.takeaways.map((line, index) => <li key={index}><span>{index + 1}</span>{pick(line, code)}</li>)}
            </ol>
            {Object.keys(picks).length > 0 && (
              <p className="faint">{t("walk.score", { good, total: walk.steps.filter((item) => item.choice).length })}</p>
            )}
          </article>
        )}
      </div>

      <div className="walk-nav">
        <button type="button" className="btn btn-secondary walk-back" disabled={at === 0} onClick={() => { tap(); go(at - 1); }} aria-label={t("walk.back")}>
          <ArrowLeft aria-hidden size={18} />
        </button>
        {atEnd ? (
          <button type="button" className="btn btn-primary" disabled={finished} onClick={() => void finish()} data-testid="walk-finish">
            {t("walk.finish")}<Check aria-hidden size={18} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={blocked} onClick={() => { tap(); go(at + 1); }} data-testid="walk-next">
            {blocked ? t("walk.chooseFirst") : at === total - 1 ? t("walk.toEnd") : t("walk.next")}
            {!blocked && <ArrowRight aria-hidden size={18} />}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
