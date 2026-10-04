"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lock, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import type { MiniCheck } from "@/lib/content-types";
import { dayLabel, inr } from "@/lib/format";
import { grownValue, loanCost, moneyAfter, type Episode, type Sim } from "@/lib/journey";
import { recommend, weakTopics } from "@/lib/recommend";
import { safeLook } from "@/lib/rewards";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { Character, type Mood } from "./character";
import { ShareButton } from "./share-button";
import { useI18n } from "./providers";
import { rewardName } from "./reward-sheet";
import { CheckCard, ListenButton, PageSkeleton } from "./ui";

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

/** The story map: every life stage, what Verena chose in it, and what opens next. */
export function JourneyScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const { journey, story, progress, streak, lessons, today } = app;
  const recs = useMemo(() => recommend({ progress, lessons, journey: story, today }).filter((rec) => rec.kind !== "episode").slice(0, 3), [progress, lessons, story, today]);

  useAiContext(journey && story ? {
    screen: t("nav.journey"),
    kind: "episode",
    title: t("journey.title", { name: journey.name[code] }),
    text: journey.intro[code],
    suggestions: [t("journey.askWhatNext"), t("ai.s1")],
  } : null);

  if (!app.ready || !journey || !story) return <PageSkeleton />;
  const look = safeLook({ progress, streak: streak.count });
  const next = story.next;

  return (
    <div className="stack-lg rise">
      <div className="stack-sm">
        <p className="masthead">{t("journey.kicker")}</p>
        <h1>{t("journey.title", { name: journey.name[code] })}</h1>
        <p className="lead">{journey.intro[code]}</p>
      </div>

      <section className="card hero journey-hero">
        <div className="stage">
          <Character look={look} age={story.age || 19} size={160} label={t("journey.figure", { name: journey.name[code], age: story.age })} />
        </div>
        <div className="stack-sm">
          <p className="kicker">{story.stage?.title[code]} · {t("journey.age", { age: story.age })}</p>
          <p className="faint">{t("journey.herMoney")}</p>
          <MoneyStrip money={story.money} />
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
          <h2 id="revision-h">{t("journey.revisionTitle")}</h2>
          <p className="lead">{t("journey.revisionLead")}</p>
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
        <h2 id="map-h">{t("journey.map")}</h2>
        <ol className="stage-map">
          {journey.episodes.map((episode, index) => {
            const result = progress.journey[episode.id];
            const isNext = next?.id === episode.id;
            const stage = journey.stages.find((item) => item.id === episode.stage);
            const state = result ? "done" : isNext ? (story.open ? "open" : "waiting") : "locked";
            const body = (
              <>
                <span className={`stage-mark ${state}`} aria-hidden>
                  {state === "done" ? <Check size={16} strokeWidth={3} /> : state === "locked" ? <Lock size={14} /> : index + 1}
                </span>
                <span className="stack-xs">
                  <span className="kicker">{stage?.title[code]} · {t("journey.age", { age: episode.age })}</span>
                  <strong>{state === "locked" ? t("journey.locked") : episode.title[code]}</strong>
                  {result && <span className="faint">{t(`journey.verdict.${episode.options[result.choice]?.verdict ?? "okay"}`)} · {t("journey.drillScore", { right: result.drill, total: episode.drill.length })}</span>}
                  {state === "waiting" && <span className="faint">{t("journey.tomorrow", { date: story.opensOn ? dayLabel(story.opensOn, code) : "" })}</span>}
                </span>
              </>
            );
            return (
              <li key={episode.id} className={`stage-row ${state}`}>
                {state === "done" || state === "open" ? (
                  <Link href={`/journey/${episode.id}`} onClick={tap} aria-label={`${episode.title[code]}${result ? `. ${t("journey.replay")}` : ""}`}>{body}<ChevronRight aria-hidden size={18} /></Link>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
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
        <Character look={{ ...look, place: episode.place }} age={episode.age} size={230} mood={mood} label={t("journey.figure", { name, age: episode.age })} />
        <button type="button" className="story-tap back" onClick={back} aria-label={t("common.back")} disabled={at === 0} />
        <button type="button" className="story-tap fwd" onClick={next} aria-label={t("common.next")} />
      </div>
      <div className="story-caption" key={at} aria-live="polite">
        <p>{lines[at][code]}</p>
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

const STEPS = ["story", "slip", "sim", "decide", "outcome", "why", "drill", "done"] as const;
type Step = (typeof STEPS)[number];

/** One episode, played as a loop: story, slip, try it, decide, see what follows, why, two questions, XP. */
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
  const topRef = useRef<HTMLDivElement | null>(null);

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
  const look = safeLook({ progress, streak: streak.count });
  const index = journey.episodes.findIndex((item) => item.id === episode.id);
  const before = moneyAfter(journey, Object.fromEntries(Object.entries(progress.journey).filter(([key]) => journey.episodes.findIndex((item) => item.id === key) < index)));
  const option = choice !== null ? episode.options[choice] : null;
  const drillRight = drill.filter((pick, at) => pick !== null && pick === episode.drill[at].answer).length;
  const drillDone = drill.length > 0 && drill.every((pick) => pick !== null);
  const order = STEPS.filter((item) => item !== "slip" || episode.slip);
  const position = order.indexOf(step);
  const go = (next: Step) => { tap(); setStep(next); };
  const after = option
    ? (() => {
        const money = { cash: before.cash + (option.effects.cash ?? 0), savings: before.savings + (option.effects.savings ?? 0), debt: before.debt + (option.effects.debt ?? 0) };
        if (money.savings < 0) { money.cash += money.savings; money.savings = 0; }
        if (money.cash < 0) { money.debt += -money.cash; money.cash = 0; }
        if (money.debt < 0) money.debt = 0;
        return money;
      })()
    : before;

  async function finish() {
    if (finishing.current || !episode || choice === null) return;
    finishing.current = true;
    setXpBefore(progress.xp);
    await app.finishEpisode(episode.id, choice, drillRight);
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
          <button type="button" className="btn btn-primary" onClick={() => go("decide")}>{t("journey.toDecision")}<ArrowRight aria-hidden size={18} /></button>
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={choice === null}
            onClick={() => {
              if (choice === null) return;
              if (episode.options[choice].verdict === "costly") void app.mistake(episode.topic);
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
          <div className="stack-xs">
            <p className="faint">{t("journey.herMoneyNow")}</p>
            <MoneyStrip money={after} />
          </div>
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
          <button type="button" className="btn btn-ghost" onClick={() => { tap(); ai.openAsk(t("journey.askWhy")); }}>
            <MessageCircle aria-hidden size={18} />{t("journey.askSaath")}
          </button>
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
                <p className="note">{following && !(following.id in progress.journey) ? t("journey.nextTomorrow", { title: following.title[code] }) : t("journey.mapNext")}</p>
                <Link href="/journey" className="btn btn-primary" onClick={() => app.clearFresh()}>{t("journey.backToMap")}</Link>
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
