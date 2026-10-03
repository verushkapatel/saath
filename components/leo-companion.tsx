"use client";

import { useEffect, useMemo, useState } from "react";
import { continuePath, scorePractice } from "@/lib/practice";
import { readSimulationState, scenarioCount } from "@/lib/simulations";
import { useApp } from "./app-state";
import { useI18n } from "./providers";

function LeoSvg({ stage }: { stage: number }) {
  return (
    <svg className="saath-companion-svg" data-stage={stage} viewBox="0 0 120 120" aria-hidden focusable="false">
      <circle className="saath-companion-orbit" cx="60" cy="60" r="53" />
      <ellipse className="saath-companion-shadow" cx="60" cy="101" rx="23" ry="3.5" />
      <g className="saath-lion-mane">
        <path
          className="saath-lion-mane-shape"
          d="M59 13q6-4 10 3l7 8 12-2q7 0 7 7l3 10q5 6 0 11l-5 9 3 11q1 7-6 9l-8 6-4 10q-3 7-10 4l-10-4-10 5q-7 3-10-4l-5-9-11-3q-7-2-5-9l2-11-6-9q-4-6 2-11l7-8-1-11q0-7 7-7l11-1 7-9q4-5 10-2Z"
        />
        <path className="saath-lion-mane-detail" d="M34 38q-5 6-4 13m56-13q5 6 4 13M31 65q3 7 9 10m40 0q6-3 9-10" />
      </g>
      <path className="saath-lion-ear" d="M39 39q-7-7-3-14 8-3 13 8l1 8Zm42 2 1-8q5-11 13-8 4 7-3 14l-7 2Z" />
      <path className="saath-lion-ear-inner" d="M41 33q-2-4 1-6 4 0 5 6l-3 3Zm38 0q2-4-1-6-4 0-5 6l3 3Z" />
      <path
        className="saath-lion-face"
        d="M60 30c11 0 19 8 19 19 0 8-4 14-9 18-1 9-5 14-10 14s-9-5-10-14c-5-4-9-10-9-18 0-11 8-19 19-19Z"
      />
      <path className="saath-lion-brow" d="M47 47q4-3 8-1m10 0q4-2 8 1" />
      <ellipse className="saath-lion-eye" cx="52" cy="51" rx="1.5" ry="2.2" />
      <ellipse className="saath-lion-eye" cx="68" cy="51" rx="1.5" ry="2.2" />
      <ellipse className="saath-lion-muzzle" cx="55" cy="63" rx="6" ry="4.5" />
      <ellipse className="saath-lion-muzzle" cx="65" cy="63" rx="6" ry="4.5" />
      <path className="saath-lion-nose" d="M56 60q4-4 8 0l-1.5 4q-2.5 2-5 0Z" />
      <path className="saath-lion-mouth" d="M60 64v4m0 0q-3 3-6 1m6-1q3 3 6 1" />
      <path className="saath-lion-whiskers" d="m44 63-7-1m7 5-7 1m39-5 7-1m-7 5 7 1" />
      <g className="saath-evolve-one">
        <path className="saath-lion-whisker-dots" d="M39 68h2m-2 4h2m38-4h2m-2 4h2" />
        <g className="saath-lion-glasses">
          <path d="M43 49h7q4 0 4 4v2q0 4-4 4h-5q-4 0-4-4v-2q0-4 2-4Zm24 0h7q2 0 2 4v2q0 4-4 4h-5q-4 0-4-4v-2q0-4 4-4Zm-13 5h8" />
        </g>
      </g>
      <g className="saath-evolve-two">
        <path className="saath-lion-suit" d="M38 80q8 7 22 7t22-7l8 8-4 15H34l-4-15Z" />
        <path className="saath-lion-lapel" d="m43 79 9 7-5 8-8-10m21 2 8-7 7 5-8 10" />
        <path className="saath-lion-tie" d="m57 85 3-2 3 2-1 4 3 9-5 4-5-4 3-9Z" />
        <path className="saath-lion-collar" d="m43 78 9 8 8-1 8 1 9-8" />
      </g>
      <g className="saath-evolve-three">
        <circle className="saath-lion-compass" cx="60" cy="87" r="6" />
        <path className="saath-lion-compass-mark" d="m60 83 1.5 4-1.5 4-1.5-4 1.5-4Z" />
      </g>
    </svg>
  );
}

export function LeoCompanion() {
  const { t } = useI18n();
  const { progress, paths, ready } = useApp();
  const [scenarios, setScenarios] = useState(0);

  useEffect(() => {
    const refresh = () => setScenarios(scenarioCount(readSimulationState()));
    refresh();
    window.addEventListener("saath-practice-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("saath-practice-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const score = useMemo(
    () => (ready ? scorePractice(progress, paths, scenarios) : null),
    [ready, progress, paths, scenarios],
  );

  if (!ready || !score) return null;

  const stage = score.growthStage;
  const stageLabel = t(`practice.companionStages.${stage}`);
  const badgeNames = [
    t("practice.badgeFirst"),
    t("practice.badgeBudget"),
    t("practice.badgePaper"),
    t("practice.badgeDigital"),
  ];
  const earnedCount = score.earned.filter(Boolean).length;
  const toNext = 100 - score.withinLevel || 100;

  return (
    <section className="card saath-practice" id="saath-practice-panel" aria-labelledby="saath-companion-title">
      <div className="saath-companion">
        <div
          className="saath-companion-art"
          role="img"
          aria-label={t("practice.companionAlt", { name: t("practice.title"), stage: stageLabel })}
        >
          <LeoSvg stage={stage} />
        </div>
        <div className="saath-companion-copy">
          <p className="saath-companion-eyebrow">{t("practice.companionEyebrow")}</p>
          <div className="saath-companion-head">
            <h2 className="saath-practice-title" id="saath-companion-title">
              {t("practice.title")}
            </h2>
            <span className="saath-practice-level">{t("practice.level", { level: score.level })}</span>
          </div>
          <p className="saath-companion-stage">{stageLabel}</p>
          <p className="saath-companion-hint">{t(`practice.companionHints.${stage}`)}</p>
        </div>
      </div>

      <div className="saath-practice-progress">
        <div className="saath-practice-progress-head">
          <p className="saath-practice-points">{t("practice.points", { points: score.points })}</p>
          <p className="saath-practice-next">{t("practice.next", { points: toNext, level: score.level + 1 })}</p>
        </div>
        <div
          className="saath-practice-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score.withinLevel}
          aria-label={t("practice.meter", { points: score.withinLevel })}
        >
          <span className="saath-practice-fill" style={{ width: `${score.withinLevel}%` }} />
        </div>
      </div>

      <details className="saath-badge-details">
        <summary>
          <span className="saath-badge-title">{t("practice.badges")}</span>
          <span className="saath-badge-count">{t("practice.badgesCount", { count: earnedCount })}</span>
        </summary>
        <div className="saath-badges">
          {badgeNames.map((name, index) => {
            const earned = score.earned[index];
            return (
              <div key={name} className={`saath-badge${earned ? " is-earned" : " is-locked"}`}>
                <span className="saath-badge-mark" aria-hidden>
                  {earned ? "✓" : "·"}
                </span>
                <span className="saath-badge-name">
                  {name}
                  <span className="visually-hidden"> — {earned ? t("practice.earned") : t("practice.locked")}</span>
                </span>
              </div>
            );
          })}
        </div>
      </details>

      <p className="saath-practice-note">{t("practice.note")}</p>
    </section>
  );
}

export function useContinuePath() {
  const { progress, paths, ready } = useApp();
  return useMemo(() => (ready ? continuePath(progress, paths) : null), [ready, progress, paths]);
}
