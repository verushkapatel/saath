"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Mic, ScanLine } from "lucide-react";
import { LANGS } from "@/lib/catalog";
import { dayOfYear } from "@/lib/dates";
import { loadJson, type DailyQuestion, type GlossaryTerm, type Lesson, type MiniCheck, type Path } from "@/lib/content-types";
import { pathProgress } from "@/lib/progress";
import { canHear, hear, tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { Flame } from "./illustrations";
import { useI18n } from "./providers";
import { CheckCard, ContentIcon, ListenButton, PageSkeleton, Ring, Skeleton } from "./ui";

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "home.greetingMorning";
  if (hour < 17) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

export function HomeScreen() {
  const { t, code, setLang } = useI18n();
  const app = useApp();
  const { progress, today, streak, lessons } = app;
  const [questions, setQuestions] = useState<DailyQuestion[] | null>(null);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [failed, setFailed] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    loadJson<DailyQuestion[]>("/content/daily-questions.json").then(setQuestions).catch(() => setFailed(true));
    loadJson<GlossaryTerm[]>("/content/glossary.json").then(setGlossary).catch(() => undefined);
  }, []);

  const check = useMemo<MiniCheck | null>(() => {
    if (!questions?.length) return null;
    const question = questions[(dayOfYear() - 1) % questions.length];
    return { question: question.prompt, options: question.options, answer: question.answer, why: question.why };
  }, [questions]);

  const picked = today in progress.answers ? progress.answers[today] : null;
  const streakLabel = streak.count ? t("home.streak", { count: streak.count }) : t("home.streakZero");
  const lessonCount = progress.lessons.length;
  const caseCount = Object.keys(progress.cases).length;

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
      const term = glossary.find((item) => item.term[code].toLowerCase() === needle || needle.includes(item.term[code].toLowerCase()));
      if (term) {
        setAnswer(term.definition[code]);
        return;
      }
      const lesson = lessons.find((item: Lesson) =>
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
    <div className="stack-lg rise">
      <div className="stack greeting">
        <div className="row-between">
          <h1>{t(greetingKey())}</h1>
          <span className="streak-chip" role="img" aria-label={streakLabel}>
            <Flame lit={streak.count > 0} />
            <span aria-hidden>{streak.count}</span>
          </span>
        </div>
        <div className="lang-row" role="group" aria-label={t("profile.language")}>
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              className="chip"
              lang={lang}
              aria-pressed={code === lang}
              onClick={() => { tap(); setLang(lang); }}
            >
              {t(`lang.${lang}`)}
            </button>
          ))}
        </div>
        <Link href="/scan" className="btn btn-primary" onClick={tap}>
          <ScanLine aria-hidden size={20} />
          {t("home.scan")}
        </Link>
      </div>

      <section className="card tight" aria-labelledby="today-h">
        <div className="stack">
          <h2 id="today-h">{t("home.today")}</h2>
          {!check && !failed && <Skeleton height={180} />}
          {failed && <p className="note">{t("errors.generic")}</p>}
          {check && (
            <>
              <CheckCard check={check} picked={picked} onPick={(index) => void app.answer(index)} />
              <ListenButton text={`${check.question[code]} ${check.options.map((option) => option[code]).join(". ")}`} />
            </>
          )}
        </div>
      </section>

      <section className="card tight" aria-labelledby="progress-h">
        <h2 id="progress-h" className="visually-hidden">{t("home.progress")}</h2>
        <p className="muted">{t("home.progressLine", { streak: streak.count, lessons: lessonCount, cases: caseCount })}</p>
      </section>

      <section className="stack-sm">
        <button type="button" className="btn btn-secondary" onClick={() => void askVoice()} disabled={listening || !canHear()}>
          <Mic aria-hidden size={20} />
          {listening ? t("home.listening") : t("home.askVoice")}
        </button>
        {heard ? <p className="muted">{heard}</p> : null}
        {answer ? <p>{answer}</p> : null}
      </section>
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
