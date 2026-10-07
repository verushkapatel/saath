"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Check, ChevronRight, Flame, Lock, Play, Sparkles, Star } from "lucide-react";
import { inr } from "@/lib/format";
import { MISSION, missionDone, starsFor, starTotals, worlds } from "@/lib/game";
import type { Episode, Money } from "@/lib/journey";
import type { EpisodeResult } from "@/lib/progress";
import { tap } from "@/lib/speech";
import { useAi } from "./ai-context";
import { Character } from "./character";
import { LogoMark } from "./logo";
import { useI18n } from "./providers";

/** One to three stars, filled as earned. */
export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="g-stars" role="img" aria-label={label ?? `${value} / 3`}>
      {[0, 1, 2].map((at) => <Star key={at} size={size} className={at < value ? "on" : ""} aria-hidden fill={at < value ? "currentColor" : "none"} />)}
    </span>
  );
}

/** A row of questions for Saath AI about whatever is on screen. Each one opens the chat with the question ready. */
export function AskChips({ prompts }: { prompts: string[] }) {
  const { t } = useI18n();
  const ai = useAi();
  return (
    <div className="ask-chips" data-testid="ask-chips">
      <p className="ask-chips-head"><span className="ask-dot" aria-hidden><LogoMark size={10} /></span>{t("aiask.chips")}</p>
      <div className="ask-chips-row">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => { tap(); ai.openAsk(prompt); }}>
            {prompt}
            <ChevronRight aria-hidden size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The chapter's mission: four objectives that tick off as the chapter moves along, and the stars at stake. */
export function MissionPanel({ step, order, stars }: { step: string; order: readonly string[]; stars: number | null }) {
  const { t } = useI18n();
  const done = missionDone(step, order);
  return (
    <div className="g-mission" data-testid="mission-panel">
      <div className="g-mission-head">
        <span className="g-label">{t("game.mission")}</span>
        {stars === null ? <span className="g-faint">{t("game.upTo")}</span> : <Stars value={stars} size={15} />}
      </div>
      <ol>
        {MISSION.filter((key) => key !== "live" || order.includes("live")).map((key) => (
          <li key={key} className={done[key] ? "done" : order[order.indexOf(step)] === key || (key === "live" && step === "sim") ? "now" : ""}>
            <span className="g-tick" aria-hidden>{done[key] ? <Check size={12} strokeWidth={3} /> : null}</span>
            {t(`game.obj.${key}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** What a decision changed in Verena's life, counted up on screen. */
export function StatDeltas({ before, after }: { before: Money; after: Money }) {
  const { t, code } = useI18n();
  const rows: { key: keyof Money; label: string; money: boolean; goodUp: boolean }[] = [
    { key: "cash", label: t("journey.cash"), money: true, goodUp: true },
    { key: "savings", label: t("journey.savings"), money: true, goodUp: true },
    { key: "debt", label: t("journey.debt"), money: true, goodUp: false },
    { key: "confidence", label: t("journey.confidence"), money: false, goodUp: true },
    { key: "resilience", label: t("journey.resilience"), money: false, goodUp: true },
  ];
  const changed = rows.filter((row) => Math.round(after[row.key] - before[row.key]) !== 0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(1);
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!changed.length) return null;
  return (
    <div className="g-deltas" data-testid="stat-deltas">
      <p className="g-label">{t("game.delta")}</p>
      <ul>
        {changed.map((row, index) => {
          const delta = (after[row.key] - before[row.key]) * shown;
          const good = row.goodUp ? delta >= 0 : delta <= 0;
          const value = row.money ? inr(Math.abs(Math.round(delta)), code) : `${Math.abs(Math.round(delta))}`;
          return (
            <li key={row.key} className={good ? "up" : "down"} style={{ "--i": index } as CSSProperties}>
              <span>{row.label}</span>
              <b>{delta >= 0 ? "+" : "−"}{value}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Board = {
  episodes: Episode[];
  stages: { id: string; title: Record<string, string> }[];
  results: Record<string, EpisodeResult>;
  nextId: string | null;
  open: boolean;
  look: { outfit: string; extra: string; place: string; tint?: string };
  age: number;
};

/** The story as a game board: worlds (life stages), a winding path of chapter nodes, stars on every finished one. */
export function StoryBoard({ episodes, results, nextId, open, look, age }: Board) {
  const { t, code } = useI18n();
  return (
    <div className="g-board" data-testid="story-board">
      {worlds(episodes).map((world, worldIndex) => {
        const earned = world.episodes.reduce((sum, { episode }) => sum + starsFor(episode, results[episode.id]), 0);
        return (
          <section key={world.band} className="g-world">
            <header className="g-world-head">
              <span className="g-label">{t("game.world", { n: worldIndex + 1 })} · {t("game.ages", { from: world.from, to: world.to })}</span>
              <h3>{t(`game.w.${world.band}`)}</h3>
              <span className="g-world-stars"><Star size={13} fill="currentColor" aria-hidden /> {earned} / {world.episodes.length * 3}</span>
            </header>
            <ol className="g-path">
              {world.episodes.map(({ episode, index }) => {
                const result = results[episode.id];
                const isNext = nextId === episode.id;
                const state = result ? "done" : isNext ? (open ? "open" : "waiting") : "locked";
                const stars = starsFor(episode, result);
                const node = (
                  <>
                    <span className={`g-node ${state}`} aria-hidden>
                      {state === "done" ? <Check size={20} strokeWidth={3} /> : state === "locked" ? <Lock size={16} /> : state === "open" ? <Play size={18} fill="currentColor" /> : index + 1}
                    </span>
                    <span className="g-node-text">
                      <span className="g-num">{String(index + 1).padStart(2, "0")} · {t("journey.age", { age: episode.age })}</span>
                      <strong>{state === "locked" ? t("journey.locked") : episode.title[code].replace(/^\d+\s*·\s*/, "")}</strong>
                      {state === "done" && <Stars value={stars} />}
                      {state === "open" && <span className="g-here">{t("game.youAreHere")}</span>}
                    </span>
                    {state === "open" && <span className="g-avatar" aria-hidden><Character look={look} age={age} size={58} bare alive /></span>}
                  </>
                );
                return (
                  <li key={episode.id} className={`g-step ${state}`} style={{ "--x": `${Math.sin(index * 1.15) * 26}%` } as CSSProperties}>
                    {state === "done" || state === "open" ? (
                      <Link href={`/journey/${episode.id}`} onClick={tap} aria-label={episode.title[code]}>{node}</Link>
                    ) : (
                      <div>{node}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** The story's game header: level, stars, chapters and streak at a glance. */
export function GameHud({ level, ratio, xp, episodes, results, streak }: { level: number; ratio: number; xp: number; episodes: Episode[]; results: Record<string, EpisodeResult>; streak: number }) {
  const { t } = useI18n();
  const stars = starTotals(episodes, results);
  const done = Object.keys(results).filter((id) => episodes.some((episode) => episode.id === id)).length;
  return (
    <div className="g-hud" data-testid="game-hud">
      <div className="g-level">
        <span className="g-ring" style={{ "--p": `${Math.max(4, ratio * 100)}%` } as CSSProperties}><b>{level}</b></span>
        <span><span className="g-label">{t("game.level")}</span><span className="g-xp">{xp} XP</span></span>
      </div>
      <dl>
        <div><dt>{t("game.starsLabel")}</dt><dd><Star size={14} fill="currentColor" aria-hidden /> {stars.earned}<small>/{stars.max}</small></dd></div>
        <div><dt>{t("game.chapters")}</dt><dd><Sparkles size={14} aria-hidden /> {done}<small>/{episodes.length}</small></dd></div>
        <div><dt>{t("game.streak")}</dt><dd><Flame size={14} aria-hidden /> {streak}</dd></div>
      </dl>
    </div>
  );
}

/**
 * The chapter vault: every finished chapter as a collectible card, framed bronze, silver or gold by its stars.
 * Chapters not yet played show as sealed cards, so the collection is something to complete.
 */
export function ChapterVault({ episodes, results }: { episodes: Episode[]; results: Record<string, EpisodeResult> }) {
  const { t, code } = useI18n();
  const stars = starTotals(episodes, results);
  const owned = episodes.filter((episode) => results[episode.id]).length;
  return (
    <div className="g-vault-wrap" data-testid="chapter-vault">
      <div className="g-vault-meter">
        <span className="g-label">{t("journey.vault")}</span>
        <b>{owned}<small>/{episodes.length}</small></b>
        <span className="g-vault-bar"><i style={{ width: `${(owned / Math.max(1, episodes.length)) * 100}%` }} /></span>
        <span className="g-world-stars"><Star size={13} fill="currentColor" aria-hidden /> {stars.earned}/{stars.max}</span>
      </div>
      <ol className="g-vault">
        {episodes.map((episode, index) => {
          const result = results[episode.id];
          const earned = starsFor(episode, result);
          const tier = !result ? "sealed" : earned >= 3 ? "gold" : earned === 2 ? "silver" : "bronze";
          const title = episode.title[code].replace(/^\d+\s*·\s*/, "");
          const body = (
            <>
              <span className="g-card-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="g-card-age">{t("journey.age", { age: episode.age })}</span>
              <strong>{result ? title : "?"}</strong>
              {result ? <Stars value={earned} size={12} /> : <Lock size={14} aria-hidden />}
            </>
          );
          return (
            <li key={episode.id} className={`g-card ${tier}`} style={{ "--i": index % 12 } as CSSProperties}>
              {result ? <Link href={`/journey/${episode.id}`} onClick={tap} aria-label={episode.title[code]}>{body}</Link> : <div aria-label={t("journey.locked")}>{body}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
