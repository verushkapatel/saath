"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Mic, MessageCircle, Newspaper, Plus } from "lucide-react";
import { QUESTION_TOPIC } from "@/lib/catalog";
import { loadJson, type DailyQuestion, type MiniCheck, type StoriesFile } from "@/lib/content-types";
import { nextAction, pickByDay } from "@/lib/daily";
import { dayLabel } from "@/lib/format";
import { recommend, topLesson } from "@/lib/recommend";
import { safeLook } from "@/lib/rewards";
import { verenaAt } from "@/lib/verena";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { Character } from "./character";
import { TodayChallenges } from "./challenges";
import { Flame } from "./illustrations";
import { FeedbackPanel } from "./feedback-panel";
import { InstallCard } from "./install";
import { SkywardBadge } from "./logo";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { CheckCard, ListenButton, PageSkeleton, Sheet, Skeleton } from "./ui";

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 17) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

/**
 * Verena on Home, like a game's character screen: she walks along, and the bar shows the XP to the next level and how
 * close her next change is. She is exactly as the person's progress has made her.
 */
function VerenaHud() {
  const { t } = useI18n();
  const app = useApp();
  const { verena, level, progress, totalSteps } = app;
  return (
    <Link href="/progress" className="verena-hud" onClick={tap} data-testid="verena-hud" aria-label={t("hud.label", { age: verena.age, level: level.level })}>
      <div className="walk-strip" aria-hidden>
        <span className="hud-sky" />
        <div className="walker"><div className="walker-flip"><div className="walker-bob"><Character look={verena} age={verena.age} size={96} bare alive /></div></div></div>
      </div>
      <div className="hud-stats">
        <span className="hud-name">{t("hud.name", { age: verena.age })} · {t(`hud.era.${verena.era}`)}</span>
        <span className="hud-level"><b>{t("prog.level", { level: level.level })}</b><span className="num">{progress.xp} XP</span></span>
        <span className="xp-mini" aria-hidden><span style={{ width: `${Math.max(4, level.ratio * 100)}%` }} /></span>
        <span className="faint hud-next">{verena.step >= totalSteps ? t("hud.done") : t("hud.next", { left: totalSteps - verena.step })}</span>
      </div>
    </Link>
  );
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

  const look = app.verena;
  const streakLabel = streak.count ? t("home.streak", { count: streak.count }) : t("home.streakZero");
  const name = account?.display ?? "";

  function heroBody() {
    switch (action.kind) {
      case "episode": {
        const episode = story?.next;
        return (
          <div className="home-quest">
            {episode && <div className="home-quest-character stage" aria-hidden><Character look={{ ...app.verena, place: episode.place }} age={episode.age} size={148} mood="neutral" alive /></div>}
            <div className="home-quest-copy stack-sm">
              <p className="masthead">{t("home.todayStory")}</p>
              <div className="quest-progress">
                <span>{t("journey.progress", { done: story?.done ?? 0, total: story?.total ?? 45 })}</span>
                <span>{t("prog.level", { level: level.level })} · {progress.xp} XP</span>
              </div>
              <div className="bar" aria-hidden><span style={{ width: `${Math.max(3, ((story?.done ?? 0) / Math.max(1, story?.total ?? 45)) * 100)}%` }} /></div>
              <p className="quest-next">{t("home.nextQuest")}</p>
              <h2>{episode?.title[code]}</h2>
              <p className="muted">{t("home.todayStoryLead", { stage: story?.stage?.title[code] ?? "", age: episode?.age ?? "" })}</p>
              <Link href={`/journey/${action.id}`} className="btn btn-primary" onClick={tap} data-testid="home-start-journey-button">
                {story?.done ? t("home.continueStory") : t("home.startStory")}
                <ChevronRight aria-hidden size={20} />
              </Link>
            </div>
          </div>
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
      <header className="stack-sm greeting home-hero">
        <span className="home-aurora" aria-hidden><i /><i /><i /></span>
        <div className="row-between">
          <h1>{t(greetingKey())}{name ? `, ${name}` : ""}</h1>
          <span className="streak-chip" role="img" aria-label={streakLabel}>
            <Flame lit={streak.count > 0} />
            <span aria-hidden>{streak.count}</span>
          </span>
        </div>
        <SkywardBadge size={46} label={t("home.initiative")} />
      </header>

      <VerenaHud />

      <button type="button" className="home-ask" onClick={() => { tap(); ai.openAsk(); }} data-testid="home-ask-bar">
        <Plus aria-hidden size={18} className="home-ask-plus" />
        <span>{t("home.askBar")}</span>
        <Mic aria-hidden size={18} />
      </button>

      <section className="card hero today-card stack-sm scene-in" aria-labelledby="today-saath">
        <h2 id="today-saath" className="visually-hidden">{t("home.todaySaath")}</h2>
        {heroBody()}
      </section>

      <InstallCard />

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

      {realStory && action.kind !== "story" && (
        <Link href="/stories" className="card tight" onClick={tap}>
          <span className="stack-xs">
            <span className="kicker"><Newspaper aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("home.todayReal")} · {t(`stories.kind.${realStory.kind}`)}</span>
            <strong>{realStory.title[code]}</strong>
            <span className="faint">{progress.stories.includes(realStory.id) ? t("stories.read") : t("home.readStory")}</span>
          </span>
        </Link>
      )}


      <details className="home-feedback">
        <summary>{t("feedback.open")}</summary>
        <FeedbackPanel />
      </details>

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
