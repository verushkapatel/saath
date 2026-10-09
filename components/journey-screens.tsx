"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lock, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import type { MiniCheck } from "@/lib/content-types";
import { dayLabel, inr } from "@/lib/format";
import { applyEffects, grownValue, loanCost, moneyAfter, type Episode, type Money, type Sim } from "@/lib/journey";
import { recommend, weakTopics } from "@/lib/recommend";
import { safeLook } from "@/lib/rewards";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { StoryTabs } from "./story-tabs";
import { Character, type Mood } from "./character";
import { WalkCard, WalkPlayer, useWalk } from "./walkthrough";
import { LifeScene } from "./life-scene";
import { verenaAt } from "@/lib/verena";
import { ShareButton } from "./share-button";
import { useI18n } from "./providers";
import { rewardName } from "./reward-sheet";
import { CheckCard, ListenButton, PageSkeleton, PageGlow } from "./ui";
import { AskChips, ChapterVault, GameHud, MissionPanel, StatDeltas, Stars, StoryBoard } from "./game";
import { starsFor } from "@/lib/game";

function MoneyStrip({ money }: { money: { cash: number; savings: number; debt: number } }) {
  const { t, code } = useI18n();
  return (
    <dl className="stats money-strip">
      <div><dt>{t("journey.cash")}</dt><dd>{inr(money.cash, code)}</dd></div>
      <div><dt>{t("journey.savings")}</dt><dd>{inr(money.savings, code)}</dd></div>
      <div><dt>{t("journey.debt")}</dt><dd>{inr(money.debt, code)}</dd></div>
    </dl>
  );
}

function LifeState({ state }: { state: Money }) {
  const { t, code } = useI18n();
  return (
    <div className="life-state" data-testid="verena-life-state">
      <dl>
        <div><dt>{t("journey.income")}</dt><dd>{inr(state.income, code)}</dd></div>
        <div><dt>{t("journey.emergency")}</dt><dd>{inr(state.emergency, code)}</dd></div>
        <div><dt>{t("journey.investments")}</dt><dd>{inr(state.investments, code)}</dd></div>
        <div><dt>{t("journey.protection")}</dt><dd>{Math.round(state.insurance)}%</dd></div>
      </dl>
      <div className="state-meters">
        <div><span>{t("journey.confidence")}</span><div className="bar" role="progressbar" aria-valuenow={state.confidence} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${state.confidence}%` }} /></div></div>
        <div><span>{t("journey.resilience")}</span><div className="bar" role="progressbar" aria-valuenow={state.resilience} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${state.resilience}%` }} /></div></div>
      </div>
    </div>
  );
}

/** The story map: every life stage, what Verena chose in it, and what opens next. */
export function JourneyScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const { journey, story, progress, streak, lessons, today } = app;
  const [archiveView, setArchiveView] = useState<"path" | "vault">("path");
  const recs = useMemo(() => recommend({ progress, lessons, journey: story, today }).filter((rec) => rec.kind !== "episode").slice(0, 3), [progress, lessons, story, today]);

  useAiContext(journey && story ? {
    screen: t("nav.journey"),
    kind: "episode",
    title: t("journey.title", { name: journey.name[code] }),
    text: journey.intro[code],
    suggestions: [t("journey.askWhatNext"), t("ai.s1")],
  } : null);

  if (!app.ready || !journey || !story) return <PageSkeleton />;
  const look = app.verena;
  const next = story.next;
  const drillRight = Object.values(progress.journey).reduce((sum, result) => sum + result.drill, 0);
  const drillTotal = journey.episodes.reduce((sum, episode) => sum + (progress.journey[episode.id] ? episode.drill.length : 0), 0);
  const topicScores = new Map<string, { right: number; total: number }>();
  for (const episode of journey.episodes) {
    const result = progress.journey[episode.id];
    if (!result) continue;
    const current = topicScores.get(episode.topic) ?? { right: 0, total: 0 };
    current.right += result.drill;
    current.total += episode.drill.length;
    topicScores.set(episode.topic, current);
  }
  const strongest = [...topicScores.entries()].sort((a, b) => (b[1].right / b[1].total) - (a[1].right / a[1].total))[0]?.[0] ?? null;

  return (
    <div className="stack-lg rise">
      <StoryTabs current="story" />
      <div className="stack-sm page-hero">
        <PageGlow />
        <p className="masthead">{t("journey.kicker")}</p>
        <h1>{t("journey.title", { name: journey.name[code] })}</h1>
        <p className="lead">{journey.intro[code]}</p>
      </div>

      <GameHud level={app.level.level} ratio={app.level.ratio} xp={progress.xp} episodes={journey.episodes} results={progress.journey} streak={streak.count} />

      <section className="card hero journey-hero">
        <div className="walk-strip journey-walk" role="img" aria-label={t("journey.figure", { name: journey.name[code], age: app.verena.age })}>
          <div className="walker"><div className="walker-flip"><div className="walker-bob"><Character look={app.verena} age={app.verena.age} size={130} bare alive /></div></div></div>
        </div>
        <div className="stack-sm">
          <p className="kicker">{story.stage?.title[code]} · {t("journey.age", { age: story.age })}</p>
          <p className="faint">{t("journey.herMoney")}</p>
          <MoneyStrip money={story.money} />
          <LifeState state={story.money} />
          <div className="row-between">
            <span className="faint">{t("journey.progress", { done: story.done, total: story.total })}</span>
          </div>
          <div className="bar" aria-hidden><span style={{ width: `${Math.max(3, (story.done / Math.max(1, story.total)) * 100)}%` }} /></div>
          {story.done > 0 && (
            <ShareButton
              title="Saath"
              text={t("share.storyMap", { name: journey.name[code], done: story.done, total: story.total, stage: story.stage?.title[code] ?? "" })}
              path="/"
              label={t("share.storyButton")}
            />
          )}
          {story.finished ? (
            <p className="note ok">{t("journey.finishedTitle")}</p>
          ) : next && story.open ? (
            <Link href={`/journey/${next.id}`} className="btn btn-primary" onClick={tap}>
              {story.done ? t("journey.playNext", { title: next.title[code] }) : t("journey.start")}
              <ChevronRight aria-hidden size={20} />
            </Link>
          ) : next ? (
            <p className="note">{t("journey.tomorrow", { date: story.opensOn ? dayLabel(story.opensOn, code) : "" })}</p>
          ) : null}
        </div>
      </section>

      {story.finished && (
        <section className="finale navy-scene stack-sm" aria-labelledby="revision-h">
          <div className="journey-transformation" aria-hidden>
            <div><Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={105} /></div>
            <ArrowRight size={22} />
            <div><Character look={look} age={story.age} size={125} mood="proud" /></div>
          </div>
          <h2 id="revision-h">{t("journey.revisionTitle")}</h2>
          <p className="lead">{t("journey.revisionLead")}</p>
          <dl className="stats three journey-summary" data-testid="journey-end-summary">
            <div><dt>{t("journey.summaryChapters")}</dt><dd>{story.done}</dd></div>
            <div><dt>{t("journey.summaryDrills")}</dt><dd>{drillRight} / {drillTotal}</dd></div>
            <div><dt>{t("journey.summaryStrong")}</dt><dd>{strongest ? t(`topics.${strongest}`) : "—"}</dd></div>
          </dl>
          {weakTopics(progress).length > 0 && (
            <p className="muted">{t("journey.revisionWeak", { topics: weakTopics(progress).map((topic) => t(`topics.${topic}`)).join(", ") })}</p>
          )}
          <ul className="list card tight">
            {recs.map((rec) => {
              const lesson = lessons.find((item) => item.id === rec.id);
              if (!lesson) return null;
              return (
                <li key={rec.id}>
                  <Link href={`/guide/${lesson.id}`} className="item">
                    <span className="item-icon"><RotateCcw aria-hidden size={18} /></span>
                    <span className="item-body">
                      <span className="item-title">{lesson.title[code]}</span>
                      <span className="item-sub">{t(`home.reason.${rec.reason}`)}</span>
                    </span>
                    <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/guide#revise" className="btn btn-primary">{t("revise.open")}<ChevronRight aria-hidden size={18} /></Link>
          <p className="faint">{t("journey.revisionReplay")}</p>
        </section>
      )}

      <section className="stack-sm" aria-labelledby="map-h">
        <h2 id="map-h">{t("journey.archive")}</h2>
        <p className="faint">{t("journey.archiveLead")}</p>
        <div className="seg g-switch" role="tablist">
          <button type="button" role="tab" aria-selected={archiveView === "path"} className={archiveView === "path" ? "on" : ""} onClick={() => { tap(); setArchiveView("path"); }}>{t("journey.pathView")}</button>
          <button type="button" role="tab" aria-selected={archiveView === "vault"} className={archiveView === "vault" ? "on" : ""} onClick={() => { tap(); setArchiveView("vault"); }} data-testid="vault-tab">{t("journey.vault")}</button>
        </div>
        {archiveView === "vault" ? <ChapterVault episodes={journey.episodes} results={progress.journey} /> : <StoryBoard
          episodes={journey.episodes}
          stages={journey.stages}
          results={progress.journey}
          nextId={next?.id ?? null}
          open={story.open}
          look={app.verena}
          age={app.verena.age}
        />}
        <AskChips prompts={[t("aiask.story1"), t("aiask.story2"), t("journey.askWhatNext")]} />
        <p className="faint">{t("journey.rule")}</p>
        <p className="faint">{t("journey.reviewed", { date: journey.reviewed })}</p>
      </section>
    </div>
  );
}

function InspectSim({ sim }: { sim: Extract<Sim, { kind: "inspect" }> }) {
  const { t, code } = useI18n();
  const [open, setOpen] = useState<number[]>([]);
  return (
    <div className="stack-sm">
      <ul className="paper-form">
        {sim.lines.map((line, index) => {
          const shown = open.includes(index);
          return (
            <li key={index}>
              <button
                type="button"
                className={`form-row${shown ? " is-marked" : ""}${shown && line.flag ? " is-caught" : ""}`}
                aria-expanded={shown}
                onClick={() => { tap(); setOpen((current) => (current.includes(index) ? current : [...current, index])); }}
              >
                <span className="form-label">{line.label[code]}{line.flag && shown ? <span className="sev-tag"> {t("journey.flag")}</span> : null}</span>
                <span className="form-value num">{line.value[code]}</span>
                {shown && <span className="form-note">{line.note[code]}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="faint" aria-live="polite">{t("journey.inspected", { done: open.length, total: sim.lines.length })}</p>
    </div>
  );
}

function BudgetSim({ sim }: { sim: Extract<Sim, { kind: "budget" }> }) {
  const { t, code } = useI18n();
  const free = Math.max(0, sim.income - sim.needs);
  const [spend, setSpend] = useState(Math.round(free * 0.8));
  const saved = free - spend;
  const pct = (value: number) => `${(value / Math.max(1, sim.income)) * 100}%`;
  return (
    <div className="stack-sm">
      <div className="split-bar three" aria-hidden>
        <span className="part-needs" style={{ width: pct(sim.needs) }} />
        <span className="part-wants" style={{ width: pct(spend) }} />
        <span className="part-save" style={{ width: pct(saved) }} />
      </div>
      <dl className="stats">
        <div><dt>{t("journey.needs")}</dt><dd>{inr(sim.needs, code)}</dd></div>
        <div><dt>{t("journey.wants")}</dt><dd>{inr(spend, code)}</dd></div>
        <div><dt>{t("journey.saved")}</dt><dd>{inr(saved, code)}</dd></div>
      </dl>
      <label className="stack-xs">
        <span className="label">{t("journey.wantsSlider")}</span>
        <input type="range" className="range" min={0} max={free} step={50} value={spend} onChange={(event) => setSpend(Number(event.target.value))} aria-valuetext={inr(spend, code)} />
      </label>
      <p className="muted" aria-live="polite">{saved > 0 ? t("journey.budgetLeft", { amount: inr(saved, code) }) : t("journey.budgetNone")}</p>
    </div>
  );
}

function GrowSim({ sim }: { sim: Extract<Sim, { kind: "grow" }> }) {
  const { t, code } = useI18n();
  const [years, setYears] = useState(sim.years[0]);
  const result = grownValue(sim.monthly, sim.rate, years);
  const max = grownValue(sim.monthly, sim.rate, Math.max(...sim.years)).value;
  return (
    <div className="stack-sm">
      <div className="seg" role="group" aria-label={t("journey.years")}>
        {sim.years.map((item) => (
          <button key={item} type="button" aria-pressed={years === item} onClick={() => { tap(); setYears(item); }}>{t("journey.yearsN", { n: item })}</button>
        ))}
      </div>
      <dl className="stats" aria-live="polite">
        <div><dt>{t("journey.paidIn")}</dt><dd>{inr(result.paid, code)}</dd></div>
        <div><dt>{t("journey.grownTo")}</dt><dd>{inr(result.value, code)}</dd></div>
        <div><dt>{t("journey.growth")}</dt><dd>{inr(result.value - result.paid, code)}</dd></div>
      </dl>
      <div className="stack-xs" aria-hidden>
        <div className="bar thin ghost"><span style={{ width: `${(result.paid / max) * 100}%` }} /></div>
        <div className="bar"><span style={{ width: `${(result.value / max) * 100}%` }} /></div>
      </div>
      <p className="faint">{t("journey.assumed", { rate: sim.rate })}</p>
    </div>
  );
}

function EmiSim({ sim }: { sim: Extract<Sim, { kind: "emi" }> }) {
  const { t, code } = useI18n();
  const [months, setMonths] = useState(sim.months[0]);
  const cost = loanCost(sim.principal, sim.rate, months);
  return (
    <div className="stack-sm">
      <div className="seg" role="group" aria-label={t("journey.months")}>
        {sim.months.map((item) => (
          <button key={item} type="button" aria-pressed={months === item} onClick={() => { tap(); setMonths(item); }}>{t("journey.monthsN", { n: item })}</button>
        ))}
      </div>
      <dl className="stats" aria-live="polite">
        <div><dt>{t("journey.emi")}</dt><dd>{inr(cost.emi, code)}</dd></div>
        <div><dt>{t("journey.interest")}</dt><dd>{inr(cost.interest, code)}</dd></div>
        <div><dt>{t("journey.total")}</dt><dd>{inr(cost.total, code)}</dd></div>
      </dl>
      <p className="faint">{t("journey.exampleRate", { rate: sim.rate })}</p>
    </div>
  );
}

function SimBlock({ sim }: { sim: Sim }) {
  switch (sim.kind) {
    case "inspect": return <InspectSim sim={sim} />;
    case "budget": return <BudgetSim sim={sim} />;
    case "grow": return <GrowSim sim={sim} />;
    case "emi": return <EmiSim sim={sim} />;
  }
}

/**
 * The story, told like a short film: Verena on a dark navy stage, one line at a time, tap to go on.
 * Every line can be heard aloud. Her face follows the scene: calm as it opens, worried when the problem lands.
 */
function StoryPlayer({ episode, look, name, onDone }: { episode: Episode; look: { outfit: string; extra: string; place: string }; name: string; onDone: () => void }) {
  const { t, code } = useI18n();
  const [at, setAt] = useState(0);
  const lines = episode.story;
  const last = at >= lines.length - 1;
  const mood: Mood = at === 0 ? "neutral" : last ? "worried" : "neutral";
  const next = () => { tap(); if (last) onDone(); else setAt(at + 1); };
  const back = () => { tap(); setAt(Math.max(0, at - 1)); };
  return (
    <section className="story-player navy-scene" aria-roledescription={t("journey.storyPlayer")}>
      <ol className="story-segments" aria-hidden>
        {lines.map((_, index) => <li key={index} className={index < at ? "was" : index === at ? "on" : undefined}><i /></li>)}
      </ol>
      <div className="story-stage">
        <LifeScene place={episode.place} beat={at} />
        <div className="story-actor"><Character look={{ ...look, place: episode.place }} age={episode.age} size={230} mood={mood} label={t("journey.figure", { name, age: episode.age })} alive bare /></div>
        <button type="button" className="story-tap back" onClick={back} aria-label={t("common.back")} disabled={at === 0} />
        <button type="button" className="story-tap fwd" onClick={next} aria-label={t("common.next")} />
      </div>
      <div className="story-caption" key={at}>
        <Typewriter text={lines[at][code]} />
      </div>
      <div className="story-controls">
        <ListenButton text={lines[at][code]} compact />
        <span className="faint num">{at + 1} / {lines.length}</span>
        <button type="button" className="btn btn-primary btn-auto" onClick={next}>
          {last ? t("journey.toDecision") : t("common.next")}<ArrowRight aria-hidden size={18} />
        </button>
      </div>
    </section>
  );
}

/** A line that types itself out like a subtitle; the whole line is available to screen readers at once. */
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text.length); return; }
    setShown(0);
    const chars = [...text];
    let i = 0;
    const timer = window.setInterval(() => {
      i += Math.max(1, Math.round(chars.length / 90));
      setShown(Math.min(chars.length, i));
      if (i >= chars.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [text]);
  const chars = [...text];
  return (
    <p onClick={() => setShown(chars.length)}>
      <span className="visually-hidden" aria-live="polite">{text}</span>
      <span aria-hidden>{chars.slice(0, shown).join("")}<span className="tw-rest">{chars.slice(shown).join("")}</span></span>
    </p>
  );
}

const STEPS = ["story", "slip", "sim", "live", "decide", "outcome", "why", "drill", "done"] as const;
type Step = (typeof STEPS)[number];

/** One episode, played as a loop: story, slip, try it, decide, see what follows, why, two questions, XP. */
/** The step-by-step simulation behind a chapter: live the real process Verena just faced. */
function ChapterWalk({ guideId }: { guideId: string }) {
  const walk = useWalk(guideId);
  const [open, setOpen] = useState(false);
  if (!walk || walk === "missing") return null;
  return (
    <>
      <WalkCard walk={walk} onOpen={() => setOpen(true)} />
      {open && <WalkPlayer walk={walk} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EpisodeScreen({ id }: { id: string }) {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const { journey, story, progress, streak } = app;
  const episode = journey?.episodes.find((item) => item.id === id) ?? null;
  const already = episode ? progress.journey[episode.id] : undefined;
  // Whether this visit is a replay is fixed when the screen opens, so finishing does not turn it into one.
  const replayRef = useRef<boolean | null>(null);
  if (replayRef.current === null && episode && app.ready) replayRef.current = Boolean(progress.journey[episode.id]);
  const replaying = replayRef.current === true;
  const [step, setStep] = useState<Step>("story");
  const [choice, setChoice] = useState<number | null>(null);
  const [drill, setDrill] = useState<(number | null)[]>([]);
  const [xpBefore, setXpBefore] = useState<number | null>(null);
  const finishing = useRef(false);
  // Progress as it was before this chapter was first recorded, so the celebration at the end shows what it earned.
  const beforeRef = useRef<typeof progress | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const walk = useWalk(episode?.guides[0]);
  const hasLive = Boolean(walk && walk !== "missing");
  const [simOpen, setSimOpen] = useState(false);
  const [simRan, setSimRan] = useState(false);

  useEffect(() => {
    if (episode) setDrill(episode.drill.map(() => null));
  }, [episode]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const contextText = useMemo(() => {
    if (!episode) return "";
    const parts = [episode.story.map((line) => line[code]).join(" "), episode.question[code]];
    if (choice !== null) parts.push(episode.options[choice].text[code], episode.options[choice].outcome[code], episode.lesson[code]);
    return parts.join("\n");
  }, [episode, choice, code]);

  useAiContext(episode ? {
    screen: t("nav.journey"),
    kind: "episode",
    id: episode.id,
    title: episode.title[code],
    text: contextText,
    suggestions: [t("journey.askWhy"), t("journey.askReal")],
  } : null);

  if (!app.ready || !journey || !story) return <PageSkeleton />;
  if (!episode) {
    return (
      <div className="state">
        <p className="lead">{t("guide.missing")}</p>
        <Link href="/journey" className="btn btn-primary">{t("nav.journey")}</Link>
      </div>
    );
  }

  const playable = Boolean(already) || (story.next?.id === episode.id && story.open);
  if (!playable) {
    const waiting = story.next?.id === episode.id;
    return (
      <div className="state">
        <span className="item-icon"><Lock aria-hidden size={20} /></span>
        <p className="lead">{waiting ? t("journey.tomorrow", { date: story.opensOn ? dayLabel(story.opensOn, code) : "" }) : t("journey.lockedLead")}</p>
        <Link href="/journey" className="btn btn-primary">{t("journey.backToMap")}</Link>
      </div>
    );
  }

  const stage = journey.stages.find((item) => item.id === episode.stage);
  const index = journey.episodes.findIndex((item) => item.id === episode.id);
  // The same Verena as everywhere else in the app: grown with progress, in the outfit the person chose for her.
  const look = app.verena;
  const before = moneyAfter(journey, Object.fromEntries(Object.entries(progress.journey).filter(([key]) => journey.episodes.findIndex((item) => item.id === key) < index)));
  const option = choice !== null ? episode.options[choice] : null;
  const drillRight = drill.filter((pick, at) => pick !== null && pick === episode.drill[at].answer).length;
  const drillDone = drill.length > 0 && drill.every((pick) => pick !== null);
  const order = STEPS.filter((item) => (item !== "slip" || episode.slip) && (item !== "live" || hasLive));
  const position = order.indexOf(step);
  const go = (next: Step) => { tap(); setStep(next); };
  const after = option ? applyEffects(before, option.effects) : before;

  async function finish() {
    if (finishing.current || !episode || choice === null) return;
    finishing.current = true;
    if (xpBefore === null) setXpBefore(progress.xp);
    await app.finishEpisode(episode.id, choice, drillRight, beforeRef.current ?? undefined);
    setStep("done");
  }

  function pickDrill(at: number, pick: number, check: MiniCheck) {
    setDrill((current) => current.map((value, i) => (i === at ? pick : value)));
    if (pick !== check.answer) void app.mistake(episode?.topic);
  }

  return (
    <article className="stack episode" ref={topRef}>
      <header className="chapter navy-scene">
        <div className="row-between">
          <Link href="/journey" className="link"><ChevronLeft aria-hidden size={18} />{t("journey.backToMap")}</Link>
          <span className="faint num">{position + 1} / {order.length}</span>
        </div>
        <ol className="loop-dots" aria-label={t("journey.loopLabel")}>
          {order.map((item, at) => <li key={item} className={at < position ? "was" : at === position ? "on" : ""}><span className="visually-hidden">{t(`journey.step.${item}`)}</span></li>)}
        </ol>
        <div className="stack-xs">
          <p className="masthead">{stage?.title[code]} · {t("journey.age", { age: episode.age })}</p>
          <h1>{episode.title[code]}</h1>
          {replaying && <p className="faint">{t("journey.replayNote")}</p>}
        </div>
        <MissionPanel step={step} order={order} stars={step === "done" ? starsFor(episode, progress.journey[episode.id]) : null} />
      </header>

      {step === "story" && (
        <StoryPlayer episode={episode} look={look} name={journey.name[code]} onDone={() => go(episode.slip ? "slip" : "sim")} />
      )}

      {step === "slip" && episode.slip && (
        <section className="stack">
          <div className="card flat slip">
            <p className="kicker">{t("journey.slipTitle")}</p>
            <p>{episode.slip[code]}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => go("sim")}>{t("journey.tryIt")}<ArrowRight aria-hidden size={18} /></button>
        </section>
      )}

      {step === "sim" && (
        <section className="stack">
          <div className="card stack-sm">
            <p className="kicker">{t("journey.step.sim")}</p>
            <h2>{episode.sim.title[code]}</h2>
            <p className="muted">{episode.sim.hint[code]}</p>
            <SimBlock sim={episode.sim} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => go(hasLive ? "live" : "decide")}>{hasLive ? t("game.live.start") : t("journey.toDecision")}<ArrowRight aria-hidden size={18} /></button>
        </section>
      )}

      {step === "live" && walk && walk !== "missing" && (
        <section className="stack g-live">
          <div className="card stack-sm">
            <p className="kicker">{t("game.live.title")}</p>
            <h2>{walk.title[code]}</h2>
            <p className="muted">{t("game.live.lead")}</p>
            <WalkCard walk={walk} onOpen={() => { tap(); setSimOpen(true); }} />
            {simRan && <p className="note ok"><Check aria-hidden size={16} /> {t("game.live.done")}</p>}
          </div>
          {simRan ? (
            <button type="button" className="btn btn-primary" onClick={() => go("decide")} data-testid="live-next">{t("game.live.next")}<ArrowRight aria-hidden size={18} /></button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => { tap(); setSimOpen(true); }} data-testid="live-start">{t("game.live.start")}<ArrowRight aria-hidden size={18} /></button>
          )}
          {simRan ? (
            <button type="button" className="btn btn-ghost" onClick={() => { tap(); setSimOpen(true); }}>{t("game.live.again")}</button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => go("decide")} data-testid="live-skip">{t("game.live.skip")}</button>
          )}
          {simOpen && <WalkPlayer walk={walk} onClose={() => { setSimOpen(false); setSimRan(true); }} />}
        </section>
      )}

      {step === "decide" && (
        <section className="stack">
          <h2>{episode.question[code]}</h2>
          <div className="stack-sm" role="group" aria-label={episode.question[code]}>
            {episode.options.map((item, at) => (
              <button
                key={at}
                type="button"
                className={`option${choice === at ? " is-mine" : ""}`}
                aria-pressed={choice === at}
                onClick={() => { tap(); setChoice(at); }}
              >
                <span className="option-mark" aria-hidden>{choice === at ? <Check size={16} strokeWidth={3} /> : null}</span>
                <span>{item.text[code]}</span>
              </button>
            ))}
          </div>
          {replaying && already && <p className="faint">{t("journey.firstChoice", { choice: episode.options[already.choice]?.text[code] ?? "" })}</p>}
          <AskChips prompts={[t("aiask.decide"), t("aiask.real")]} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={choice === null}
            onClick={() => {
              if (choice === null) return;
              if (episode.options[choice].verdict === "costly") void app.mistake(episode.topic);
              // Seeing the outcome is living the chapter: it counts now, even if the questions are skipped.
              if (!replaying && !beforeRef.current && !(episode.id in progress.journey)) {
                setXpBefore(progress.xp);
                void app.recordEpisode(episode.id, choice).then((before) => { beforeRef.current = before; });
              }
              go("outcome");
            }}
          >
            {t("journey.decide")}
          </button>
        </section>
      )}

      {step === "outcome" && option && (
        <section className="stack">
          <div className={`consequence ${option.verdict} outcome-scene scene-in`} role="status">
            <div className="outcome-figure" aria-hidden>
              <Character look={{ ...look, place: episode.place }} age={episode.age} size={120} mood={option.verdict === "good" ? "happy" : option.verdict === "costly" ? "worried" : "neutral"} />
            </div>
            <p className="kicker">{t(`journey.verdict.${option.verdict}`)}</p>
            <p className="lead">{option.outcome[code]}</p>
            {option.verdict === "costly" && <p className="learning">{t("journey.learning", { name: journey.name[code] })}</p>}
          </div>
          <StatDeltas before={before} after={after} />
          <div className="stack-xs">
            <p className="faint">{t("journey.herMoneyNow")}</p>
            <MoneyStrip money={after} />
            <LifeState state={after} />
          </div>
          <AskChips prompts={[t("aiask.outcome"), t("aiask.real")]} />
          <button type="button" className="btn btn-primary" onClick={() => go("why")}>{t("journey.why")}<ArrowRight aria-hidden size={18} /></button>
        </section>
      )}

      {step === "why" && (
        <section className="stack">
          <div className="card flat stack-sm">
            <p className="kicker">{t("journey.step.why")}</p>
            <p>{episode.lesson[code]}</p>
          </div>
          <ListenButton text={episode.lesson[code]} />
          {episode.guides.length > 0 && (
            <div className="stack-xs">
              <p className="label">{t("journey.readMore")}</p>
              <ul className="cluster">
                {episode.guides.map((guideId) => {
                  const lesson = app.lessons.find((item) => item.id === guideId);
                  return lesson ? <li key={guideId}><Link className="chip" href={`/guide/${guideId}`}>{lesson.title[code]}</Link></li> : null;
                })}
              </ul>
            </div>
          )}
          {episode.guides[0] && !hasLive && <ChapterWalk guideId={episode.guides[0]} />}
          <AskChips prompts={[t("journey.askWhy"), t("journey.askReal"), t("aiask.guide3")]} />
          <button type="button" className="btn btn-primary" onClick={() => go("drill")}>{t("journey.toDrill")}<ArrowRight aria-hidden size={18} /></button>
        </section>
      )}

      {step === "drill" && (
        <section className="stack">
          <p className="kicker">{t("journey.step.drill")}</p>
          {episode.drill.map((check, at) => (
            <div key={at} className="card">
              <CheckCard check={check} picked={drill[at] ?? null} onPick={(pick) => pickDrill(at, pick, check)} />
            </div>
          ))}
          <button type="button" className="btn btn-primary" disabled={!drillDone} onClick={() => void finish()}>
            {t("journey.finish")}
          </button>
        </section>
      )}

      {step === "done" && option && (
        <section className="stack">
          <div className="finale navy-scene stack-sm scene-in">
            <div className="stage">
              <Character look={{ ...look, place: episode.place }} age={episode.age} size={130} mood="proud" />
            </div>
            <h2>{t("journey.doneTitle")}</h2>
            <p className="g-done-stars"><Stars value={starsFor(episode, progress.journey[episode.id])} size={30} label={t("game.starsEarned")} /></p>
            <p className="muted">{t("journey.drillScore", { right: drillRight, total: episode.drill.length })}</p>
            {xpBefore !== null && progress.xp > xpBefore ? (
              <p className="xp-pop" role="status"><Sparkles aria-hidden size={18} /> {t("journey.xpEarned", { xp: progress.xp - xpBefore })}</p>
            ) : (
              <p className="faint">{t("journey.replayNoXp")}</p>
            )}
            {app.fresh.length > 0 && (
              <div className="stack-xs">
                <p className="label">{t("rewards.title")}</p>
                <ul className="cluster">
                  {app.fresh.map((reward) => <li key={`${reward.kind}:${reward.id}`}><span className="chip">{rewardName(reward, t)}</span></li>)}
                </ul>
              </div>
            )}
            <ShareButton
              title="Saath"
              text={t("share.storyText", { name: journey.name[code], title: episode.title[code], done: Object.keys(progress.journey).length, total: journey.episodes.length })}
              path="/"
              label={t("share.storyButton")}
            />
          </div>
          {(() => {
            const following = journey.episodes[index + 1];
            if (index === journey.episodes.length - 1) {
              return <Link href="/journey" className="btn btn-primary" onClick={() => app.clearFresh()}>{t("journey.toRevision")}</Link>;
            }
            return (
              <>
                <p className="note">{following && !(following.id in progress.journey) ? t("journey.nextReady", { title: following.title[code] }) : t("journey.mapNext")}</p>
                {following && !(following.id in progress.journey) ? (
                  <Link href={`/journey/${following.id}`} className="btn btn-primary" onClick={() => app.clearFresh()} data-testid="next-chapter-button">{t("journey.continueNow")}<ChevronRight aria-hidden size={18} /></Link>
                ) : (
                  <Link href="/journey" className="btn btn-primary" onClick={() => app.clearFresh()}>{t("journey.backToMap")}</Link>
                )}
              </>
            );
          })()}
          <Link href="/progress" className="btn btn-ghost">{t("nav.progress")}<ChevronRight aria-hidden size={18} /></Link>
        </section>
      )}
    </article>
  );
}

export type { Episode };
