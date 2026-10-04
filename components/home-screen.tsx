"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, FileText, LineChart, MessageCircle, Newspaper, RotateCcw, Snowflake, Wallet } from "lucide-react";
import { QUESTION_TOPIC } from "@/lib/catalog";
import { loadJson, type DailyQuestion, type MiniCheck, type StoriesFile } from "@/lib/content-types";
import { nextAction, pickByDay } from "@/lib/daily";
import { dayLabel, weekdayLetter } from "@/lib/format";
import { recommend, topLesson } from "@/lib/recommend";
import { safeLook } from "@/lib/rewards";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { Character } from "./character";
import { TodayChallenges } from "./challenges";
import { Flame } from "./illustrations";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { CheckCard, ListenButton, PageSkeleton, Sheet, Skeleton } from "./ui";

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 17) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

export function HomeScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const { account } = useSession();
  const { progress, today, streak, lessons, story, level } = app;
  const [questions, setQuestions] = useState<DailyQuestion[] | null>(null);
  const [stories, setStories] = useState<StoriesFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    loadJson<DailyQuestion[]>("/content/daily-questions.json").then(setQuestions).catch(() => setFailed(true));
    loadJson<StoriesFile>("/content/stories.json").then(setStories).catch(() => undefined);
  }, []);

  const question = useMemo(() => (questions ? pickByDay(questions, today) : null), [questions, today]);
  const check = useMemo<MiniCheck | null>(
    () => (question ? { question: question.prompt, options: question.options, answer: question.answer, why: question.why } : null),
    [question],
  );
  const realStory = useMemo(() => (stories ? pickByDay(stories.stories, today) : null), [stories, today]);
  const recs = useMemo(() => recommend({ progress, lessons, journey: story, today }), [progress, lessons, story, today]);
  const best = topLesson(recs);
  const bestLesson = best ? lessons.find((lesson) => lesson.id === best.id) ?? null : null;
  const picked = today in progress.answers ? progress.answers[today] : null;

  const action = nextAction({
    episode: story?.next ? { id: story.next.id, open: story.open } : null,
    answeredToday: picked !== null,
    lesson: best ? { id: best.id, revise: best.kind === "revise" } : null,
    story: realStory ? { id: realStory.id, read: progress.stories.includes(realStory.id) } : null,
  });

  useAiContext({
    screen: t("nav.home"),
    kind: "home",
    title: t("nav.home"),
    suggestions: [t("ai.s1"), t("ai.s2"), t("ai.s3")],
  });

  if (!app.ready) return <PageSkeleton />;

  const look = safeLook({ progress, streak: streak.count });
  const frozen = streak.week.some((day) => day.state === "frozen");
  const streakLabel = streak.count ? t("home.streak", { count: streak.count }) : t("home.streakZero");
  const name = account?.display ?? "";

  function heroBody() {
    switch (action.kind) {
      case "episode": {
        const episode = story?.next;
        return (
          <>
            {episode && (
              <div className="today-figure" aria-hidden>
                <Character look={{ ...look, place: episode.place }} age={episode.age} size={96} />
              </div>
            )}
            <p className="masthead">{t("home.todayStory")}</p>
            <h2>{episode?.title[code]}</h2>
            <p className="muted">{t("home.todayStoryLead", { stage: story?.stage?.title[code] ?? "", age: episode?.age ?? "" })}</p>
            <Link href={`/journey/${action.id}`} className="btn btn-primary" onClick={tap}>
              {story?.done ? t("home.continueStory") : t("home.startStory")}
              <ChevronRight aria-hidden size={20} />
            </Link>
          </>
        );
      }
      case "question":
        return (
          <>
            <p className="kicker">{t("home.todayQuestion")}</p>
            <h2>{question ? question.prompt[code] : t("common.loading")}</h2>
            <button type="button" className="btn btn-primary" onClick={() => { tap(); setAsking(true); }}>
              {t("home.answer")}
              <ChevronRight aria-hidden size={20} />
            </button>
          </>
        );
      case "story":
        return (
          <>
            <p className="kicker">{t("home.todayReal")}</p>
            <h2>{realStory?.title[code]}</h2>
            <Link href="/stories" className="btn btn-primary" onClick={tap}>
              {t("home.readStory")}
              <ChevronRight aria-hidden size={20} />
            </Link>
          </>
        );
      case "lesson":
        return (
          <>
            <p className="kicker">{action.revise ? t("home.reviseNow") : t("home.readNow")}</p>
            <h2>{bestLesson?.title[code]}</h2>
            {best && <p className="muted">{t(`home.reason.${best.reason}`)}</p>}
            <Link href={`/guide/${action.id}`} className="btn btn-primary" onClick={tap}>
              {action.revise ? t("home.revise") : t("home.read")}
              <ChevronRight aria-hidden size={20} />
            </Link>
          </>
        );
      default:
        return (
          <>
            <p className="kicker">{t("home.todaySaath")}</p>
            <h2>{t("home.allDone")}</h2>
            <p className="muted">{t("home.allDoneLead")}</p>
          </>
        );
    }
  }

  return (
    <div className="stack-lg rise">
      <div className="stack-sm greeting">
        <p className="masthead">{t("home.masthead")}</p>
        <div className="row-between">
          <h1>{t(greetingKey())}{name ? `, ${name}` : ""}</h1>
          <span className="streak-chip" role="img" aria-label={streakLabel}>
            <Flame lit={streak.count > 0} />
            <span aria-hidden>{streak.count}</span>
          </span>
        </div>
      </div>

      <section className="card hero today-card stack-sm scene-in" aria-labelledby="today-saath">
        <h2 id="today-saath" className="visually-hidden">{t("home.todaySaath")}</h2>
        {heroBody()}
      </section>

      <TodayChallenges questions={questions} />

      {story && action.kind !== "episode" && (
        <Link href="/journey" className="card tight story-card" onClick={tap}>
          <span className="stage mini" aria-hidden>
            <Character look={look} age={story.age || 19} size={76} />
          </span>
          <span className="stack-xs">
            <span className="kicker">{t("home.continueStory")}</span>
            <strong>{story.finished ? t("journey.finishedTitle") : story.next?.title[code]}</strong>
            <span className="faint">
              {story.finished
                ? t("journey.revisionTitle")
                : story.open
                  ? t("journey.progress", { done: story.done, total: story.total })
                  : t("journey.opensOn", { date: story.opensOn ? dayLabel(story.opensOn, code) : "" })}
            </span>
          </span>
          <ChevronRight aria-hidden size={20} />
        </Link>
      )}

      <section className="stack-sm" aria-labelledby="streak-h">
        <div className="row-between">
          <h2 id="streak-h">{t("home.yourWeek")}</h2>
          <Link href="/progress" className="link">{t("prog.level", { level: level.level })}<ChevronRight aria-hidden size={18} /></Link>
        </div>
        <div className="card tight stack-sm">
          <ol className="week" aria-label={streakLabel}>
            {streak.week.map((day) => (
              <li key={day.date}>
                <span className={`dot ${day.state}`}>
                  {day.state === "done" ? <Check aria-hidden size={14} strokeWidth={3} /> : null}
                  {day.state === "frozen" ? <Snowflake aria-hidden size={14} /> : null}
                  <span className="visually-hidden">{t(`home.day${day.state.charAt(0).toUpperCase()}${day.state.slice(1)}`)}</span>
                </span>
                <span aria-hidden>{weekdayLetter(day.date, code)}</span>
              </li>
            ))}
          </ol>
          {frozen && <p className="faint">{t("home.freezeUsed")}</p>}
          <div className="row-between">
            <span className="faint">{streakLabel}</span>
            <span className="num faint">{level.into} / {level.need} XP</span>
          </div>
          <div className="bar" aria-hidden><span style={{ width: `${Math.max(3, level.ratio * 100)}%` }} /></div>
        </div>
      </section>

      {action.kind !== "question" && check && (
        <section className="card tight stack-sm" aria-labelledby="q-h">
          <p className="kicker" id="q-h">{t("home.todayQuestion")}</p>
          <p>{check.question[code]}</p>
          <button type="button" className="link" onClick={() => { tap(); setAsking(true); }}>
            {picked !== null ? t("home.seeAnswer") : t("home.answer")}
            <ChevronRight aria-hidden size={18} />
          </button>
        </section>
      )}

      {realStory && action.kind !== "story" && (
        <Link href="/stories" className="card tight" onClick={tap}>
          <span className="stack-xs">
            <span className="kicker"><Newspaper aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("home.todayReal")} · {t(`stories.kind.${realStory.kind}`)}</span>
            <strong>{realStory.title[code]}</strong>
            <span className="faint">{progress.stories.includes(realStory.id) ? t("stories.read") : t("home.readStory")}</span>
          </span>
        </Link>
      )}

      {best && bestLesson && action.kind !== "lesson" && (
        <section className="stack-sm" aria-labelledby="rev-h">
          <h2 id="rev-h">{t("home.recommended")}</h2>
          <Link href={`/guide/${bestLesson.id}`} className="card tight" onClick={tap}>
            <span className="item" style={{ padding: 0, minHeight: 0 }}>
              <span className="item-icon">{best.kind === "revise" ? <RotateCcw aria-hidden size={20} /> : <BookOpen aria-hidden size={20} />}</span>
              <span className="item-body">
                <span className="item-title">{bestLesson.title[code]}</span>
                <span className="item-sub">{t(`home.reason.${best.reason}`)}</span>
              </span>
              <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
            </span>
          </Link>
        </section>
      )}

      <section className="stack-sm" aria-labelledby="quick-h">
        <h2 id="quick-h">{t("home.quick")}</h2>
        <div className="quick-grid">
          <Link href="/guide" className="tile card tight" onClick={tap}><BookOpen aria-hidden size={22} /><span className="item-title">{t("nav.guide")}</span></Link>
          <Link href="/forms" className="tile card tight" onClick={tap}><FileText aria-hidden size={22} /><span className="item-title">{t("nav.forms")}</span></Link>
          <Link href="/money-lab" className="tile card tight" onClick={tap}><Wallet aria-hidden size={22} /><span className="item-title">{t("nav.money")}</span></Link>
          <button type="button" className="tile card tight" onClick={() => { tap(); ai.openAsk(); }}><MessageCircle aria-hidden size={22} /><span className="item-title">{t("ai.ask")}</span></button>
          <Link href="/progress" className="tile card tight" onClick={tap}><LineChart aria-hidden size={22} /><span className="item-title">{t("nav.progress")}</span></Link>
          <Link href="/stories" className="tile card tight" onClick={tap}><Newspaper aria-hidden size={22} /><span className="item-title">{t("nav.stories")}</span></Link>
        </div>
      </section>

      {asking && (
        <Sheet title={t("home.todayQuestion")} onClose={() => setAsking(false)}>
          <div className="stack">
            {!check && !failed && <Skeleton height={220} />}
            {failed && <p className="note">{t("errors.generic")}</p>}
            {check && question && (
              <>
                <CheckCard
                  check={check}
                  picked={picked}
                  onPick={(index) => {
                    void app.answer(index);
                    if (index !== check.answer) void app.mistake(QUESTION_TOPIC[question.topic]);
                  }}
                />
                <ListenButton text={`${check.question[code]} ${check.options.map((option) => option[code]).join(". ")}`} />
                {picked !== null && picked !== check.answer && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setAsking(false);
                      ai.openAsk(t("ai.whyWrong", { question: check.question[code] }));
                    }}
                  >
                    <MessageCircle aria-hidden size={18} />
                    {t("ai.askWhy")}
                  </button>
                )}
              </>
            )}
            {picked !== null && <button type="button" className="btn btn-primary" onClick={() => setAsking(false)}>{t("common.done")}</button>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
