"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Mic, ScanLine } from "lucide-react";
import { dayOfYear } from "@/lib/dates";
import { loadJson, type DailyQuestion, type GlossaryTerm, type Lesson, type MiniCheck, type Path } from "@/lib/content-types";
import { pathProgress } from "@/lib/progress";
import { pickTasks } from "@/lib/tasks";
import { canHear, hear, tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { CaseSimulations } from "./case-sim";
import { LeoCompanion, useContinuePath } from "./leo-companion";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { CheckCard, ContentIcon, ListenButton, PageSkeleton, Ring, Skeleton } from "./ui";

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 17) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

export function HomeScreen() {
  const { t, code } = useI18n();
  const { account } = useSession();
  const app = useApp();
  const { progress, today, lessons, paths } = app;
  const continueTo = useContinuePath();
  const [questions, setQuestions] = useState<DailyQuestion[] | null>(null);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [failed, setFailed] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    loadJson<DailyQuestion[]>("/content/daily-questions.json").then(setQuestions).catch(() => setFailed(true));
    loadJson<GlossaryTerm[]>("/content/glossary.json").then(setGlossary).catch(() => undefined);
  }, []);

  const check = useMemo<MiniCheck | null>(() => {
    if (!questions?.length) return null;
    const question = questions[(dayOfYear() - 1) % questions.length];
    return { question: question.prompt, options: question.options, answer: question.answer, why: question.why };
  }, [questions]);

  const tasks = useMemo(
    () => (app.ready ? pickTasks(today, progress, lessons, paths) : []),
    [app.ready, today, progress, lessons, paths],
  );
  const extraTasks = tasks.filter((task) => task.id !== "question");
  const picked = today in progress.answers ? progress.answers[today] : null;

  async function askVoice() {
    if (!canHear() || listening) return;
    tap();
    setListening(true);
    setHeard("");
    setAnswer("");
    try {
      const spoken = await hear(code);
      setHeard(spoken);
      const needle = spoken.toLowerCase();
      const term = glossary.find(
        (item) => item.term[code].toLowerCase() === needle || needle.includes(item.term[code].toLowerCase()),
      );
      if (term) {
        setAnswer(term.definition[code]);
        return;
      }
      const lesson = lessons.find(
        (item: Lesson) =>
          item.title[code].toLowerCase().includes(needle) ||
          needle.split(/\s+/).some((word) => word.length > 3 && item.title[code].toLowerCase().includes(word)),
      );
      if (lesson) {
        setAnswer(lesson.summary[code]);
        return;
      }
      setAnswer(t("ask.unknown"));
    } catch {
      setAnswer(t("errors.generic"));
    } finally {
      setListening(false);
    }
  }

  if (!app.ready) return <PageSkeleton />;

  return (
    <div className="stack-lg rise home-calm">
      <div className="stack greeting">
        <h1>
          {t(greetingKey())}
          {account.name ? `, ${account.name}` : ""}
        </h1>
        <p className="lead home-lead">{t("home.lead")}</p>

        <Link href="/scan" className="btn btn-primary home-hero-cta" onClick={tap}>
          <ScanLine aria-hidden size={22} />
          {t("home.scan")}
        </Link>
        <p className="faint home-scan-hint">{t("home.scanHint")}</p>

        {continueTo && (
          <Link href={`/paths/${continueTo.id}`} className="btn btn-secondary saath-primary-continue" onClick={tap}>
            {t("practice.continuePath", { path: continueTo.title[code] })}
            <ChevronRight aria-hidden size={20} />
          </Link>
        )}
      </div>

      <LeoCompanion />
      <CaseSimulations />

      <section className="card tight" aria-labelledby="today-h" id="question">
        <div className="stack">
          <h2 id="today-h">{t("home.today")}</h2>
          {!check && !failed && <Skeleton height={160} />}
          {failed && <p className="note">{t("errors.generic")}</p>}
          {check && (
            <>
              <CheckCard check={check} picked={picked} onPick={(index) => void app.answer(index)} />
              <ListenButton text={`${check.question[code]} ${check.options.map((option) => option[code]).join(". ")}`} />
            </>
          )}
        </div>
      </section>

      <details
        className="home-more"
        open={showMore}
        onToggle={(event) => setShowMore((event.target as HTMLDetailsElement).open)}
      >
        <summary className="saath-task-toggle">{showMore ? t("practice.showLess") : t("home.moreHelp")}</summary>
        <div className="stack-sm home-more-body">
          {extraTasks.map((task) => (
            <Link key={task.id} href={task.href} className="card tight" onClick={tap}>
              <span className="row-between">
                <span>
                  {task.id === "lesson" && task.lessonId
                    ? lessons.find((lesson) => lesson.id === task.lessonId)?.title[code] ?? t(`task.${task.id}`)
                    : t(`task.${task.id}`)}
                </span>
                <span className="faint">{task.done ? t("task.done") : t("task.todo")}</span>
              </span>
            </Link>
          ))}
          <button type="button" className="btn btn-secondary" onClick={() => void askVoice()} disabled={listening || !canHear()}>
            <Mic aria-hidden size={20} />
            {listening ? t("home.listening") : t("home.askVoice")}
          </button>
          {heard ? <p className="muted">{heard}</p> : null}
          {answer ? <p>{answer}</p> : null}
        </div>
      </details>
    </div>
  );
}

export function PathCard({ path }: { path: Path }) {
  const { t, code } = useI18n();
  const { progress } = useApp();
  const state = pathProgress(path, progress);
  const label = state.complete ? t("path.complete") : t("path.steps", { done: state.done, total: state.total });
  return (
    <Link href={`/paths/${path.id}`} className="card tight" onClick={tap}>
      <span className="row-between">
        <span className="stack-xs">
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
