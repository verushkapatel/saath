"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ClipboardCheck, Siren, Sparkles, Target } from "lucide-react";
import { planDone, planFor } from "@/lib/challenges";
import { QUESTION_TOPIC } from "@/lib/catalog";
import { loadJson, type ChallengesFile, type DailyQuestion } from "@/lib/content-types";
import { XP } from "@/lib/progress";
import { tap } from "@/lib/speech";
import { useAi } from "./ai-context";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { CheckCard, ListenButton, Sheet } from "./ui";

type Open = "crisis" | "task" | "quiz" | null;

/**
 * Today's challenges on Home: a money crisis, a real-life task and a short quiz,
 * all on one of the topics this person finds hardest.
 */
export function TodayChallenges({ questions }: { questions: DailyQuestion[] | null }) {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const [file, setFile] = useState<ChallengesFile | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [crisisPick, setCrisisPick] = useState<number | null>(null);
  const [quizAt, setQuizAt] = useState(0);
  const [quizPicks, setQuizPicks] = useState<number[]>([]);

  useEffect(() => {
    loadJson<ChallengesFile>("/content/challenges.json").then(setFile).catch(() => undefined);
  }, []);

  const plan = useMemo(() => (file && questions ? planFor(file, questions, app.progress.focus, app.today) : null), [file, questions, app.progress.focus, app.today]);
  if (!plan) return null;
  const done = planDone(app.progress.challenges[app.today] ?? [], plan);
  const parts = [plan.crisis, plan.task, plan.quiz.length ? "quiz" : null].filter(Boolean).length;
  const finish = (id: string, xp: number) => app.finishChallenge(id, xp, parts);
  const question = plan.quiz[quizAt];
  const quizRight = quizPicks.filter((pick, index) => plan.quiz[index] && pick === plan.quiz[index].answer).length;

  const rows: { id: Open; icon: React.ReactNode; kicker: string; title: string; xp: number; finished: boolean }[] = [];
  if (plan.crisis) rows.push({ id: "crisis", icon: <Siren aria-hidden size={20} />, kicker: t("challenge.crisis"), title: plan.crisis.title[code], xp: XP.crisis, finished: done.crisis });
  if (plan.task) rows.push({ id: "task", icon: <Target aria-hidden size={20} />, kicker: t("challenge.task"), title: plan.task.text[code], xp: XP.realTask, finished: done.task });
  if (plan.quiz.length) rows.push({ id: "quiz", icon: <ClipboardCheck aria-hidden size={20} />, kicker: t("challenge.quiz"), title: t("challenge.quizTitle", { count: plan.quiz.length, topic: t(`topics.${plan.topic}`) }), xp: XP.quiz, finished: done.quiz });

  return (
    <section className="stack-sm" aria-labelledby="challenges-h">
      <div className="row-between">
        <h2 id="challenges-h">{t("challenge.title")}</h2>
        <span className="pill-count num" aria-label={t("challenge.doneOf", { done: done.count, total: rows.length })}>{done.count}/{rows.length}</span>
      </div>
      <p className="faint">
        {app.progress.focus.length ? t("challenge.lead", { topic: t(`topics.${plan.topic}`) }) : t("challenge.leadAll", { topic: t(`topics.${plan.topic}`) })}{" "}
        <Link href="/settings#focus-h" className="link inline">{t("challenge.change")}</Link>
      </p>
      <ul className="card tight list challenge-list">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className={`item challenge${row.finished ? " done" : ""}`} onClick={() => { tap(); setCrisisPick(null); setQuizAt(0); setQuizPicks([]); setOpen(row.id); }}>
              <span className="item-icon">{row.finished ? <Check aria-hidden size={20} strokeWidth={3} /> : row.icon}</span>
              <span className="item-body">
                <span className="item-sub">{row.kicker}</span>
                <span className="item-title two-lines">{row.title}</span>
              </span>
              <span className="item-end">{row.finished ? t("challenge.done") : `+${row.xp} XP`}<ChevronRight aria-hidden size={18} /></span>
            </button>
          </li>
        ))}
      </ul>
      {done.count === rows.length && rows.length > 0 && (
        <p className="challenge-all" role="status"><Sparkles aria-hidden size={16} /> {t("challenge.allDone", { xp: XP.allChallenges })}</p>
      )}

      {open === "crisis" && plan.crisis && (
        <Sheet title={t("challenge.crisis")} onClose={() => setOpen(null)}>
          <div className="stack">
            <div className="crisis-card navy-scene">
              <p className="kicker"><Siren aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t(`topics.${plan.crisis.topic}`)}</p>
              <h3>{plan.crisis.title[code]}</h3>
              <p>{plan.crisis.story[code]}</p>
            </div>
            <CheckCard
              check={{ question: plan.crisis.question, options: plan.crisis.options, answer: plan.crisis.answer, why: plan.crisis.why }}
              picked={done.crisis && crisisPick === null ? plan.crisis.answer : crisisPick}
              onPick={(index) => {
                setCrisisPick(index);
                if (index !== plan.crisis!.answer) void app.mistake(plan.crisis!.topic);
                void finish(plan.crisis!.id, index === plan.crisis!.answer ? XP.crisis : Math.round(XP.crisis / 2));
              }}
            />
            <ListenButton text={`${plan.crisis.story[code]} ${plan.crisis.question[code]} ${plan.crisis.options.map((option) => option[code]).join(". ")}`} />
            {(crisisPick !== null || done.crisis) && (
              <div className="stack-sm">
                <Link href={`/guide/${plan.crisis.guide}`} className="btn btn-secondary" onClick={() => setOpen(null)}>{t("challenge.readGuide")}</Link>
                <button type="button" className="btn btn-primary" onClick={() => setOpen(null)}>{t("common.done")}</button>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {open === "task" && plan.task && (
        <Sheet title={t("challenge.task")} onClose={() => setOpen(null)}>
          <div className="stack">
            <div className="task-card">
              <span className="task-icon" aria-hidden><Target size={26} /></span>
              <p className="lead">{plan.task.text[code]}</p>
            </div>
            <p className="faint">{t("challenge.taskNote")}</p>
            {done.task ? (
              <p className="note ok" role="status"><Check aria-hidden size={16} /> {t("challenge.taskDone")}</p>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => { tap(); void finish(plan.task!.id, XP.realTask); }}>
                <Check aria-hidden size={18} /> {t("challenge.didIt")}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => { setOpen(null); ai.openAsk(t("challenge.askHow", { task: plan.task!.text[code] })); }}>{t("challenge.askSaath")}</button>
          </div>
        </Sheet>
      )}

      {open === "quiz" && plan.quiz.length > 0 && (
        <Sheet title={t("challenge.quiz")} onClose={() => setOpen(null)}>
          <div className="stack">
            <ol className="loop-dots" aria-hidden>
              {plan.quiz.map((item, index) => <li key={item.id} className={index < quizAt ? "was" : index === quizAt ? "on" : undefined} />)}
            </ol>
            {quizAt < plan.quiz.length && question ? (
              <>
                <p className="faint">{t("challenge.quizStep", { n: quizAt + 1, total: plan.quiz.length })}</p>
                <CheckCard
                  key={question.id}
                  check={{ question: question.prompt, options: question.options, answer: question.answer, why: question.why }}
                  picked={quizPicks[quizAt] ?? null}
                  onPick={(index) => {
                    setQuizPicks((list) => { const next = [...list]; next[quizAt] = index; return next; });
                    if (index !== question.answer) void app.mistake(QUESTION_TOPIC[question.topic]);
                  }}
                />
                {quizPicks[quizAt] !== undefined && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      tap();
                      const next = quizAt + 1;
                      setQuizAt(next);
                      if (next >= plan.quiz.length) void finish("quiz", XP.quiz);
                    }}
                  >
                    {quizAt + 1 < plan.quiz.length ? t("common.next") : t("challenge.finishQuiz")}
                    <ChevronRight aria-hidden size={18} />
                  </button>
                )}
              </>
            ) : (
              <div className="stack center">
                <p className="hero-num md">{quizRight}/{plan.quiz.length}</p>
                <p className="lead">{quizRight === plan.quiz.length ? t("challenge.quizPerfect") : t("challenge.quizGood")}</p>
                <button type="button" className="btn btn-primary" onClick={() => setOpen(null)}>{t("common.done")}</button>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </section>
  );
}
