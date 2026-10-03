"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, MessageCircleQuestion, Receipt, ScanLine, School, Snowflake, Target, Wallet, type LucideIcon } from "lucide-react";
import { dayOfYear } from "@/lib/dates";
import { loadJson, type DailyQuestion, type MiniCheck, type Path } from "@/lib/content-types";
import { checkDue, readFinLit, type FinLitStore } from "@/lib/finlit";
import { weekdayLetter } from "@/lib/format";
import { continuePath } from "@/lib/practice";
import { pathProgress } from "@/lib/progress";
import { tap } from "@/lib/speech";
import { pickTasks, type TodayTask } from "@/lib/tasks";
import { useApp } from "./app-state";
import { Flame } from "./illustrations";
import { LeoCompanion } from "./leo-companion";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { UnitBadge } from "./unit-badge";
import { CheckCard, ContentIcon, ListenButton, PageSkeleton, Ring, Sheet, Skeleton } from "./ui";

const TASK_ICONS: Record<TodayTask["id"], LucideIcon> = {
  question: MessageCircleQuestion,
  log: Wallet,
  lesson: BookOpen,
  fee: Receipt,
  sample: ScanLine,
  drill: Target,
};

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 17) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

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

export function HomeScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const { profile, openProfile } = useSession();
  const { progress, today, streak, lessons, paths } = app;
  const [questions, setQuestions] = useState<DailyQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [finlit, setFinlit] = useState<FinLitStore | null>(null);

  useEffect(() => {
    loadJson<DailyQuestion[]>("/content/daily-questions.json").then(setQuestions).catch(() => setFailed(true));
    setFinlit(readFinLit());
  }, []);

  const question = useMemo(() => (questions?.length ? questions[(dayOfYear() - 1) % questions.length] : null), [questions]);
  const check = useMemo<MiniCheck | null>(
    () => (question ? { question: question.prompt, options: question.options, answer: question.answer, why: question.why } : null),
    [question],
  );
  const tasks = useMemo(
    () => pickTasks(today, progress, lessons, paths, question?.topic),
    [today, progress, lessons, paths, question],
  );
  const picked = today in progress.answers ? progress.answers[today] : null;
  const next = useMemo(() => continuePath(progress, paths), [progress, paths]);

  if (!app.ready) return <PageSkeleton />;

  const due = finlit ? checkDue(finlit, Object.keys(progress.milestones).length) : null;
  const frozen = streak.week.some((day) => day.state === "frozen");
  const streakLabel = streak.count ? t("home.streak", { count: streak.count }) : t("home.streakZero");

  return (
    <div className="stack-lg rise">
      <div className="stack greeting">
        <p className="masthead">{t("home.masthead")}</p>
        <div className="row-between">
          <h1>{t(greetingKey())}{profile.nickname ? `, ${profile.nickname}` : ""}</h1>
          <span className="streak-chip" role="img" aria-label={streakLabel}>
            <Flame lit={streak.count > 0} />
            <span aria-hidden>{streak.count}</span>
          </span>
        </div>

        {due ? (
          <section className="card hero stack-sm">
            <p className="kicker">{t("check.name")}</p>
            <h2>{due === "before" ? t("check.beforeTitle") : t("check.afterTitle")}</h2>
            <p className="muted">{due === "before" ? t("check.homeBefore") : t("check.afterLead")}</p>
            <Link href="/check" className="btn btn-primary" onClick={tap}>{t("check.start")}</Link>
          </section>
        ) : next ? (
          <Link href={`/paths/${next.id}`} className="btn btn-primary" onClick={tap}>
            {t("home.continue", { path: next.title[code] })}
            <ChevronRight aria-hidden size={20} />
          </Link>
        ) : null}
      </div>

      <hr className="rule-double" />

      <section className="stack-sm" aria-labelledby="today-h">
        <h2 id="today-h">{t("home.todayTitle")}</h2>
        <div className="card tight">
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
          {frozen && <p className="faint" style={{ marginTop: 12 }}>{t("home.freezeUsed")}</p>}
          <hr className="divider" style={{ margin: "16px 0 4px" }} />
          <ul className="list">
            {tasks.map((task) => {
              const Icon = TASK_ICONS[task.id];
              const lesson = task.lessonId ? lessons.find((item) => item.id === task.lessonId) : null;
              const sub = task.id === "lesson" && lesson ? lesson.title[code] : task.drillId ? t(`drills.${task.drillId}.title`) : null;
              const body = (
                <>
                  <span className={`item-icon round${task.done ? " done" : ""}`}>
                    {task.done ? <Check className="draw" aria-hidden size={20} strokeWidth={3} /> : <Icon aria-hidden size={20} />}
                  </span>
                  <span className="item-body">
                    <UnitBadge unit={task.unit} />
                    <span className="item-title">{t(`task.${task.id}`)}</span>
                    {sub ? <span className="item-sub">{sub}</span> : null}
                  </span>
                  <span className="item-end">
                    {task.done ? <span className="visually-hidden">{t("task.done")}</span> : <ChevronRight aria-hidden size={20} />}
                  </span>
                </>
              );
              return (
                <li key={task.id}>
                  {task.id === "question" ? (
                    <button type="button" className={`item${task.done ? " is-done" : ""}`} onClick={() => { tap(); setAsking(true); }}>{body}</button>
                  ) : (
                    <Link href={task.href} className={`item${task.done ? " is-done" : ""}`} onClick={tap}>{body}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="paths-h">
        <div className="row-between">
          <h2 id="paths-h">{t("home.pathsTitle")}</h2>
          <Link href="/paths" className="link">
            {t("home.allPaths")}
            <ChevronRight aria-hidden size={18} />
          </Link>
        </div>
        {paths.length === 0 ? <Skeleton height={96} /> : next ? <PathCard path={next} /> : <p className="muted">{t("home.pathsDone")}</p>}
      </section>

      <LeoCompanion />

      {!profile.schoolCode && (
        <button type="button" className="card flat tight" onClick={() => { tap(); openProfile("join"); }}>
          <span className="item" style={{ padding: 0, minHeight: 0 }}>
            <span className="item-icon" style={{ background: "var(--surface-1)" }}><School aria-hidden size={20} /></span>
            <span className="item-body"><span className="item-title">{t("onboard.homeJoin")}</span></span>
            <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
          </span>
        </button>
      )}

      {asking && (
        <Sheet title={t("home.today")} onClose={() => setAsking(false)}>
          <div className="stack">
            {!check && !failed && <Skeleton height={220} />}
            {failed && <p className="note">{t("errors.generic")}</p>}
            {check && (
              <>
                <CheckCard check={check} picked={picked} onPick={(index) => void app.answer(index)} />
                <ListenButton text={`${check.question[code]} ${check.options.map((option) => option[code]).join(". ")}`} />
              </>
            )}
            {picked !== null && <button type="button" className="btn btn-primary" onClick={() => setAsking(false)}>{t("common.done")}</button>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
