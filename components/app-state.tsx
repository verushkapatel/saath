"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadJson, type Lesson, type Path } from "@/lib/content-types";
import { todayISO } from "@/lib/dates";
import { journeyState, type JourneyFile, type JourneyState } from "@/lib/journey";
import { completeJourney, type ChaptersFile } from "@/lib/journey-complete";
import {
  answerCase,
  answerQuestion,
  completeEpisode,
  completeLesson,
  completeStep,
  completeWalk,
  emptyProgress,
  finishChallenge as completeChallenge,
  finishGame as completeGame,
  levelFor,
  markTask,
  noteMistake,
  openForm,
  readStory,
  setFocus,
  setLook,
  type Look,
  type Progress,
  type TaskId,
} from "@/lib/progress";
import { newlyUnlocked, type Reward } from "@/lib/rewards";
import { chime } from "@/lib/sound";
import { buzz } from "@/lib/speech";
import {
  addEntry,
  addLoan as storeLoan,
  removeEntry,
  importBackup,
  loadTracker,
  saveGoal,
  saveProgress,
  type Backup,
  type Entry,
  type Loan,
} from "@/lib/storage";
import { computeStreak, type StreakView } from "@/lib/streak";
import { share } from "@/lib/impact";
import { currentProfile } from "@/lib/profile";
import { stepsDone, verenaAt, type VerenaLook } from "@/lib/verena";

/** One finished thing, played back as XP, then Verena's change, then a postcard. */
export type Celebration = {
  id: number;
  kind: "lesson" | "chapter" | "walk" | "resume";
  title: string;
  /** Where the finished thing lives, for the share link. */
  path: string;
  xpBefore: number;
  xpAfter: number;
  before: VerenaLook;
  after: VerenaLook;
};

type AppState = {
  ready: boolean;
  failed: boolean;
  today: string;
  entries: Entry[];
  loans: Loan[];
  goal: number;
  progress: Progress;
  lessons: Lesson[];
  paths: Path[];
  streak: StreakView;
  /** Goes up by one each time something is finished, so a screen can replay its small celebration. */
  cheer: number;
  answer: (choice: number) => Promise<void>;
  finishTask: (task: TaskId) => Promise<void>;
  finishLesson: (lessonId: string) => Promise<void>;
  finishStep: (pathId: string, stepId: string) => Promise<void>;
  finishCase: (caseId: string, choice: number) => Promise<void>;
  setActivePath: (pathId: string) => Promise<void>;
  dismissOffer: () => Promise<void>;
  logEntry: (entry: Entry) => Promise<void>;
  setGoal: (target: number) => Promise<void>;
  addLoan: (loan: Loan) => Promise<void>;
  restore: (backup: Backup) => Promise<void>;
  /** The life story, once its file has loaded. */
  journey: JourneyFile | null;
  story: JourneyState | null;
  level: ReturnType<typeof levelFor>;
  /** Rewards that opened since they were last shown. */
  fresh: Reward[];
  clearFresh: () => void;
  finishEpisode: (episodeId: string, choice: number, drillRight: number) => Promise<void>;
  mistake: (topic: string | null | undefined) => Promise<void>;
  markStory: (storyId: string) => Promise<void>;
  markForm: (formId: string) => Promise<void>;
  saveFocus: (topics: string[]) => Promise<void>;
  saveLook: (look: Partial<Look>) => Promise<void>;
  finishMoneyIntro: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  finishChallenge: (id: string, xp: number, parts?: number) => Promise<void>;
  finishGame: (game: string, score: number) => Promise<void>;
  /** A walkthrough lived to the end: finishes its guide and plays the celebration. */
  finishWalk: (walkId: string, lessonId: string, goodChoices: number) => Promise<void>;
  /** Steps a person can take in all: every guide plus every chapter. */
  totalSteps: number;
  /** Verena as she is now. */
  verena: VerenaLook;
  celebration: Celebration | null;
  endCelebration: () => void;
  /** Plays the celebration for something finished outside the usual calls (a walkthrough, the resume). */
  celebrate: (kind: Celebration["kind"], title: string, path: string, xpBefore: number) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [today, setToday] = useState(() => todayISO());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [goal, setGoalState] = useState(0);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [cheer, setCheer] = useState(0);
  const [journey, setJourney] = useState<JourneyFile | null>(null);
  const [fresh, setFresh] = useState<Reward[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const celebrationId = useRef(0);

  const progressRef = useRef(progress);
  const pathsRef = useRef(paths);
  progressRef.current = progress;
  pathsRef.current = paths;

  useEffect(() => {
    let live = true;
    loadTracker()
      .then((data) => {
        if (!live) return;
        setEntries(data.entries);
        setLoans(data.loans);
        setGoalState(data.goal);
        setProgress(data.progress);
        setReady(true);
      })
      .catch(() => {
        if (!live) return;
        setFailed(true);
        setReady(true);
      });
    loadJson<Lesson[]>("/content/guide.json").then((data) => live && setLessons(data)).catch(() => undefined);
    loadJson<Path[]>("/content/paths.json").then((data) => live && setPaths(data)).catch(() => undefined);
    Promise.all([
      loadJson<JourneyFile>("/content/journey.json"),
      loadJson<ChaptersFile>("/content/journey-chapters.json"),
    ]).then(([base, chapters]) => live && setJourney(completeJourney(base, chapters))).catch(() => undefined);
    const onVisible = () => {
      if (document.visibilityState === "visible") setToday(todayISO());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /** Applies a change to progress, saves it, and celebrates when something new was finished. */
  const change = useCallback(async (fn: (current: Progress) => Progress, celebrate = true) => {
    const current = progressRef.current;
    const next = fn(current);
    if (next === current) return;
    progressRef.current = next;
    setProgress(next);
    const day = todayISO();
    const opened = newlyUnlocked(
      { progress: current, streak: computeStreak(current.days, day).count },
      { progress: next, streak: computeStreak(next.days, day).count },
    );
    if (opened.length) setFresh((list) => [...list, ...opened.filter((reward) => !list.some((item) => item.id === reward.id && item.kind === reward.kind))]);
    if (celebrate) {
      buzz();
      chime();
      setCheer((count) => count + 1);
    }
    await saveProgress(next).catch(() => undefined);
  }, []);

  const finishTask = useCallback(async (task: TaskId) => {
    const day = todayISO();
    const already = (progressRef.current.tasks[day] ?? []).includes(task);
    await change((current) => markTask(current, task, day), !already);
  }, [change]);

  const answer = useCallback((choice: number) => change((current) => answerQuestion(current, choice, todayISO())), [change]);
  /** Tells the cohort counter that something was finished. Sends nothing unless the student opted in. */
  const note = useCallback((before: Progress) => {
    const profile = currentProfile();
    if (!profile) return;
    const after = progressRef.current;
    const lessonsNew = after.lessons.length - before.lessons.length;
    const pathsNew = Object.keys(after.milestones).length - Object.keys(before.milestones).length;
    if (lessonsNew > 0) share(profile, "lesson", { count: lessonsNew });
    if (pathsNew > 0) share(profile, "path", { count: pathsNew });
  }, []);

  const totalRef = useRef(1);

  const play = useCallback((kind: Celebration["kind"], title: string, path: string, before: Progress, xpBefore = before.xp) => {
    const after = progressRef.current;
    const total = totalRef.current;
    celebrationId.current += 1;
    setCelebration({
      id: celebrationId.current,
      kind,
      title,
      path,
      xpBefore,
      xpAfter: after.xp,
      before: verenaAt(stepsDone(before), total),
      after: verenaAt(stepsDone(after), total),
    });
  }, []);

  const celebrate = useCallback((kind: Celebration["kind"], title: string, path: string, xpBefore: number) => {
    play(kind, title, path, progressRef.current, xpBefore);
  }, [play]);

  const finishLesson = useCallback(async (lessonId: string) => {
    const before = progressRef.current;
    const fresh = !before.lessons.includes(lessonId);
    await change((current) => completeLesson(current, lessonId, pathsRef.current, todayISO()), fresh);
    note(before);
    if (fresh) {
      // The title is the lesson id; the celebration looks up the words in the person's language.
      play("lesson", lessonId, `/guide/${lessonId}`, before);
    }
  }, [change, note, play]);
  const finishStep = useCallback(async (pathId: string, stepId: string) => {
    const before = progressRef.current;
    await change((current) => completeStep(current, pathId, stepId, pathsRef.current, todayISO()));
    note(before);
  }, [change, note]);
  const finishCase = useCallback(
    (caseId: string, choice: number) => change((current) => answerCase(current, caseId, choice, todayISO())),
    [change],
  );
  const setActivePath = useCallback(
    (pathId: string) => change((current) => (current.activePath === pathId ? current : { ...current, activePath: pathId }), false),
    [change],
  );
  const dismissOffer = useCallback(
    () => change((current) => (current.offered ? current : { ...current, offered: true }), false),
    [change],
  );

  const finishEpisode = useCallback(async (episodeId: string, choice: number, drillRight: number) => {
    const before = progressRef.current;
    const fresh = !(episodeId in before.journey);
    await change((current) => completeEpisode(current, episodeId, choice, drillRight, todayISO()));
    if (fresh) play("chapter", episodeId, `/journey/${episodeId}`, before);
  }, [change, play]);
  const endCelebration = useCallback(() => setCelebration(null), []);
  const finishWalk = useCallback(async (walkId: string, lessonId: string, goodChoices: number) => {
    const before = progressRef.current;
    await change((current) => completeWalk(current, walkId, lessonId, goodChoices, pathsRef.current, todayISO()));
    note(before);
    play("lesson", lessonId, `/guide/${lessonId}`, before);
  }, [change, note, play]);
  const mistake = useCallback((topic: string | null | undefined) => change((current) => noteMistake(current, topic), false), [change]);
  const markStory = useCallback((storyId: string) => change((current) => readStory(current, storyId, todayISO())), [change]);
  const markForm = useCallback((formId: string) => change((current) => openForm(current, formId), false), [change]);
  const saveFocus = useCallback((topics: string[]) => change((current) => setFocus(current, topics), false), [change]);
  const saveLook = useCallback((look: Partial<Look>) => change((current) => setLook(current, look), false), [change]);
  const finishMoneyIntro = useCallback(() => change((current) => (current.moneyIntro ? current : { ...current, moneyIntro: true }), false), [change]);
  const clearFresh = useCallback(() => setFresh([]), []);
  const finishChallenge = useCallback(
    (id: string, xp: number, parts?: number) => change((current) => completeChallenge(current, id, xp, todayISO(), parts)),
    [change],
  );
  const finishGame = useCallback((game: string, score: number) => change((current) => completeGame(current, game, score, todayISO())), [change]);
  const deleteEntry = useCallback(async (id: string) => {
    await removeEntry(id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const logEntry = useCallback(async (entry: Entry) => {
    await addEntry(entry);
    setEntries((current) => [entry, ...current].sort((a, b) => b.date.localeCompare(a.date)));
    await finishTask("log");
  }, [finishTask]);

  const setGoal = useCallback(async (target: number) => {
    await saveGoal(target);
    setGoalState(target);
  }, []);

  const addLoan = useCallback(async (loan: Loan) => {
    await storeLoan(loan);
    setLoans((current) => [...current, loan]);
  }, []);

  const reload = useCallback(async () => {
    const data = await loadTracker();
    setEntries(data.entries);
    setLoans(data.loans);
    setGoalState(data.goal);
    progressRef.current = data.progress;
    setProgress(data.progress);
  }, []);

  const restore = useCallback(async (backup: Backup) => {
    await importBackup(backup);
    await reload();
  }, [reload]);

  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today]);
  const story = useMemo(() => (journey ? journeyState(journey, progress, today) : null), [journey, progress, today]);
  const level = useMemo(() => levelFor(progress.xp), [progress.xp]);
  const totalSteps = Math.max(1, lessons.length + (journey?.episodes.length ?? 0));
  totalRef.current = totalSteps;
  const verena = useMemo(() => verenaAt(stepsDone(progress), totalSteps), [progress, totalSteps]);

  const value = useMemo<AppState>(() => ({
    ready, failed, today, entries, loans, goal, progress, lessons, paths, streak, cheer,
    answer, finishTask, finishLesson, finishStep, finishCase, setActivePath, dismissOffer,
    logEntry, setGoal, addLoan, restore,
    journey, story, level, fresh, clearFresh, finishEpisode, mistake, markStory, markForm, saveFocus, saveLook, finishMoneyIntro, deleteEntry, finishChallenge, finishGame,
    totalSteps, verena, celebration, endCelebration, celebrate, finishWalk,
  }), [
    ready, failed, today, entries, loans, goal, progress, lessons, paths, streak, cheer,
    answer, finishTask, finishLesson, finishStep, finishCase, setActivePath, dismissOffer,
    logEntry, setGoal, addLoan, restore,
    journey, story, level, fresh, clearFresh, finishEpisode, mistake, markStory, markForm, saveFocus, saveLook, finishMoneyIntro, deleteEntry, finishChallenge, finishGame,
    totalSteps, verena, celebration, endCelebration, celebrate, finishWalk,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("app-state");
  return value;
}
