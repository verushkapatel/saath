"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadJson, type CaseStudy } from "@/lib/content-types";
import {
  caseOfTheDay,
  completeRecall,
  completeScenario,
  dueRecall,
  readSimulationState,
  sentenceBeats,
  SIM_GUIDE,
  SIM_PALETTE,
  SIM_PEOPLE,
  writeSimulationState,
  type SimulationState,
} from "@/lib/simulations";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { useI18n } from "./providers";

type Step = "story" | "choice" | "result";

type Session = {
  scenario: CaseStudy;
  index: number;
  recallMode: boolean;
  recallIndex?: number;
  step: Step;
  beat: number;
  choice: number | null;
};

function PersonAvatar({ name, color, main }: { name: string; color: string; main?: boolean }) {
  return (
    <div className="sim-person">
      <span className={`sim-avatar${main ? " sim-person-main" : " sim-person-other"}`} style={{ ["--sim-person" as string]: color }} aria-hidden>
        <svg viewBox="0 0 64 72" focusable="false">
          <path className="sim-avatar-body" d="M5 72c1-17 11-26 27-26s26 9 27 26" />
          <path className="sim-avatar-hair" d="M15 25c0-12 7-19 17-19s17 7 17 19v9H15z" />
          <ellipse className="sim-avatar-face" cx="32" cy="31" rx="16" ry="19" />
          <path className="sim-avatar-fringe" d="M16 26c2-12 8-17 17-17 9 0 14 6 16 16-8 0-14-3-18-8-3 5-8 8-15 9z" />
          <circle cx="26" cy="31" r="1.4" />
          <circle cx="38" cy="31" r="1.4" />
          <path className="sim-avatar-smile" d="M27 38q5 4 10 0" />
        </svg>
        <span className="sim-avatar-name">{name}</span>
      </span>
    </div>
  );
}

function SceneArt({ scenario, index, large }: { scenario: CaseStudy; index: number; large?: boolean }) {
  const [left, right] = SIM_PEOPLE[scenario.id] ?? ["Learner", "Other person"];
  const accent = SIM_PALETTE[index % SIM_PALETTE.length];
  return (
    <div
      className={`sim-scene-art${large ? " sim-scene-art--large" : ""}`}
      style={{ ["--sim-accent" as string]: accent }}
      aria-hidden
    >
      <span className="sim-scene-orbit" />
      <div className="sim-scene-people">
        <PersonAvatar name={left} color={accent} main />
        <span className="sim-scene-link" />
        <PersonAvatar name={right} color={SIM_PALETTE[(index + 4) % SIM_PALETTE.length]} />
      </div>
    </div>
  );
}

function CaseDialog({
  session,
  onClose,
  onChoose,
  onContinueStory,
  onRetry,
  onFinish,
}: {
  session: Session;
  onClose: () => void;
  onChoose: (index: number) => void;
  onContinueStory: () => void;
  onRetry: () => void;
  onFinish: () => void;
}) {
  const { t, code } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { scenario, recallMode, step, beat, choice, index } = session;
  const title = scenario.title[code];
  const beats = useMemo(() => sentenceBeats(scenario.story[code]), [scenario.story, code]);
  const correct = choice !== null && choice === scenario.best;

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (!node.open) node.showModal();
    node.querySelector<HTMLElement>(".sim-modal-close")?.focus();
  }, [session.scenario.id, session.recallMode]);

  const stageLabel =
    step === "story" ? t("sim.story") : step === "choice" ? (recallMode ? t("sim.recall") : t("sim.decision")) : t("sim.stageResult");

  return (
    <dialog
      ref={dialogRef}
      className="sim-dialog"
      aria-labelledby="saath-sim-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="sim-modal-shell">
        <header className="sim-modal-head">
          <span className="sim-modal-brand">SAATH · CASE FILE</span>
          <button type="button" className="sim-modal-close" aria-label={t("sim.close")} onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </header>
        <p className="sim-modal-kicker">{stageLabel}</p>
        <h2 className="sim-modal-title" id="saath-sim-dialog-title" tabIndex={-1}>
          {title}
        </h2>
        <SceneArt scenario={scenario} index={index} large />

        {step === "story" && (
          <>
            <div
              className="sim-story-progress"
              aria-label={t("sim.beat", { current: beat + 1, total: beats.length })}
            >
              {beats.map((_, at) => (
                <span key={at} className={at <= beat ? "is-active" : undefined} />
              ))}
            </div>
            <p className="sim-story-count">{t("sim.beat", { current: beat + 1, total: beats.length })}</p>
            <p className="sim-story-beat">{beats[beat] || scenario.story[code]}</p>
            <button type="button" className="sim-button sim-button--primary sim-modal-action" onClick={onContinueStory}>
              {beat + 1 < beats.length ? t("sim.nextScene") : t("sim.decide")}
            </button>
          </>
        )}

        {step === "choice" && (
          <>
            <p className="sim-question">{recallMode ? scenario.question[code] : t("sim.select")}</p>
            {!recallMode && <p className="sim-question-context">{scenario.question[code]}</p>}
            <div className="sim-choice-list">
              {scenario.options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  type="button"
                  className="sim-choice"
                  onClick={() => {
                    tap();
                    onChoose(optionIndex);
                  }}
                >
                  {option[code]}
                </button>
              ))}
            </div>
            {recallMode && <p className="sim-return-plan">{t("sim.returnPlan")}</p>}
          </>
        )}

        {step === "result" && choice !== null && (
          <>
            <section className={`sim-outcome ${correct ? "is-protected" : "is-rethink"}`} aria-live="polite">
              <p className="sim-outcome-kicker">{t("sim.consequence")}</p>
              <h3 className="sim-outcome-title">{correct ? t("sim.good") : t("sim.rethink")}</h3>
              {!correct && <p className="sim-outcome-note">{t("sim.noPenalty")}</p>}
              <p className="sim-debrief-label">{t("sim.explanation")}</p>
              <p className="sim-debrief">{scenario.debrief[code]}</p>
            </section>

            {recallMode ? (
              <>
                <p className="sim-complete-note">{t("sim.recallDone")}</p>
                <button type="button" className="sim-button sim-button--primary sim-modal-action" onClick={onFinish}>
                  {t("sim.continue")}
                </button>
              </>
            ) : (
              <>
                {!correct && (
                  <button type="button" className="sim-button sim-button--secondary sim-modal-action" onClick={onRetry}>
                    {t("sim.tryAgain")}
                  </button>
                )}
                <div className="sim-next-step">
                  <p className="sim-next-step-label">{t("sim.practical")}</p>
                  <Link className="sim-guide-link" href={SIM_GUIDE[scenario.id] || "/guide"} onClick={tap}>
                    <span className="sim-guide-title">{t("sim.guide")}</span>
                    <span className="sim-guide-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </div>
                <p className="sim-complete-note">{t("sim.returnPlan")}</p>
                <button type="button" className="sim-button sim-button--primary sim-modal-action" onClick={onFinish}>
                  {t("sim.complete")}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

export function CaseSimulations() {
  const { t, code } = useI18n();
  const app = useApp();
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [state, setState] = useState<SimulationState>(() => emptyClientState());
  const [session, setSession] = useState<Session | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    loadJson<CaseStudy[]>("/content/cases.json")
      .then((items) => setCases(items.filter((item) => item?.id && item.options?.length)))
      .catch(() => setCases([]));
  }, []);

  const refresh = useCallback(() => setState(readSimulationState()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("saath-practice-updated", refresh);
    return () => window.removeEventListener("saath-practice-updated", refresh);
  }, [refresh]);

  const featured = useMemo(() => caseOfTheDay(cases, app.today), [cases, app.today]);
  const due = useMemo(() => dueRecall(state, app.today), [state, app.today]);
  const explored = useMemo(() => Object.values(state.cases).filter((item) => item?.completedAt).length, [state]);

  function openEpisode(id: string, recallMode: boolean, trigger: HTMLElement | null, recallIndex?: number) {
    const scenario = cases.find((item) => item.id === id);
    if (!scenario) return;
    returnFocus.current = trigger;
    setSession({
      scenario,
      index: Math.max(0, cases.findIndex((item) => item.id === id)),
      recallMode,
      recallIndex,
      step: recallMode ? "choice" : "story",
      beat: 0,
      choice: null,
    });
  }

  function closeSession() {
    setSession(null);
    queueMicrotask(() => returnFocus.current?.focus());
  }

  function chooseOption(choice: number) {
    if (!session) return;
    const { scenario, recallMode, recallIndex } = session;
    let nextState = state;
    if (recallMode && recallIndex !== undefined) {
      nextState = completeRecall(state, scenario.id, recallIndex, choice, scenario.best, app.today);
    } else {
      nextState = completeScenario(state, scenario.id, choice, scenario.best, app.today);
      void app.finishCase(scenario.id, choice);
    }
    writeSimulationState(nextState);
    setState(nextState);
    setSession({ ...session, choice, step: "result" });
  }

  if (!cases.length) return null;

  const featuredDone = featured ? Boolean(state.cases[featured.id]?.completedAt) : false;
  const featuredIndex = featured ? cases.indexOf(featured) : 0;

  return (
    <>
      <section className="card saath-sim-home" id="saath-simulations" aria-labelledby="saath-sim-heading">
        <div className="sim-home-intro">
          <p className="sim-eyebrow">{t("sim.eyebrow")}</p>
          <h2 className="sim-home-title" id="saath-sim-heading">
            {t("sim.title")}
          </h2>
          <p className="sim-home-description">{t("sim.intro")}</p>
          <p className="sim-home-meta">{t("sim.time")}</p>
        </div>

        {featured && (
          <article
            className={`sim-featured${featuredDone ? " is-complete" : ""}`}
            style={{ ["--sim-accent" as string]: SIM_PALETTE[featuredIndex % SIM_PALETTE.length] }}
          >
            <div className="sim-featured-art">
              <SceneArt scenario={featured} index={featuredIndex} />
            </div>
            <div className="sim-featured-copy">
              <p className="sim-featured-kicker">{state.days[app.today] ? t("sim.dayComplete") : t("sim.today")}</p>
              <h3 className="sim-featured-title">{featured.title[code]}</h3>
              <button
                type="button"
                className="sim-button sim-button--primary"
                aria-label={`${featuredDone ? t("sim.startAgain") : t("sim.start")}: ${featured.title[code]}`}
                onClick={(event) => {
                  tap();
                  openEpisode(featured.id, false, event.currentTarget);
                }}
              >
                {featuredDone ? t("sim.startAgain") : t("sim.start")}
              </button>
            </div>
          </article>
        )}

        {due && (
          <div className="sim-recall-card">
            <div className="sim-recall-copy">
              <p className="sim-recall-kicker">{t("sim.review")}</p>
              <p className="sim-recall-title">{cases.find((item) => item.id === due.id)?.title[code] ?? ""}</p>
              <p className="sim-recall-description">{t("sim.reviewHint")}</p>
            </div>
            <button
              type="button"
              className="sim-button sim-button--secondary"
              onClick={(event) => {
                tap();
                openEpisode(due.id, true, event.currentTarget, due.index);
              }}
            >
              {t("sim.reviewStart")}
            </button>
          </div>
        )}

        <details className="sim-library">
          <summary>{t("sim.library", { count: cases.length })}</summary>
          <div className="sim-library-grid">
            {cases.map((scenario, index) => {
              const done = Boolean(state.cases[scenario.id]?.completedAt);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className={`sim-library-item${done ? " is-explored" : ""}`}
                  style={{ ["--sim-accent" as string]: SIM_PALETTE[index % SIM_PALETTE.length] }}
                  onClick={(event) => {
                    tap();
                    openEpisode(scenario.id, false, event.currentTarget);
                  }}
                >
                  <span className="sim-library-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="sim-library-name">{scenario.title[code]}</span>
                  <span className="sim-library-state">{done ? t("sim.shelfDone") : t("sim.shelfNew")}</span>
                </button>
              );
            })}
          </div>
        </details>

        <p className="sim-progress-line">{t("sim.progress", { count: explored, total: cases.length })}</p>
        <p className="sim-privacy-note">{t("sim.footer")}</p>
      </section>

      {session && (
        <CaseDialog
          session={session}
          onClose={closeSession}
          onChoose={chooseOption}
          onContinueStory={() => {
            if (!session) return;
            const beats = sentenceBeats(session.scenario.story[code]);
            if (session.beat + 1 < beats.length) setSession({ ...session, beat: session.beat + 1 });
            else setSession({ ...session, step: "choice" });
          }}
          onRetry={() => setSession(session ? { ...session, step: "choice", choice: null } : null)}
          onFinish={() => {
            const node = document.querySelector<HTMLDialogElement>(".sim-dialog");
            node?.close();
            closeSession();
          }}
        />
      )}
    </>
  );
}

function emptyClientState(): SimulationState {
  if (typeof window === "undefined") return { cases: {}, days: {} };
  return readSimulationState();
}
