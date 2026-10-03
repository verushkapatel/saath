"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadJson, type Lesson, type Path } from "@/lib/content-types";
import { todayISO } from "@/lib/dates";
import {
  answerCase,
  answerQuestion,
  completeLesson,
  completeStep,
  emptyProgress,
  markTask,
  type Progress,
  type TaskId,
} from "@/lib/progress";
import { chime } from "@/lib/sound";
import { buzz } from "@/lib/speech";
import {
  addEntry,
  addLoan as storeLoan,
  getMeta,
  importBackup,
  loadTracker,
  saveGoal,
  saveProgress,
  setMeta,
  writeSynced,
  type Backup,
  type Entry,
  type Loan,
} from "@/lib/storage";
import { computeStreak, type StreakView } from "@/lib/streak";
import { getProvider, localOnly, mayHaveSession, SYNC_CONFIGURED, type SyncProvider, type SyncUser } from "@/lib/sync/provider";
import { syncOnce, unlock, type Keyring, type VaultData } from "@/lib/sync/vault";

export type SyncStatus = "guest" | "needs-secret" | "saving" | "saved" | "offline";

type StoredKeyring = Keyring & { userId: string };

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
  sync: {
    configured: boolean;
    user: SyncUser | null;
    status: SyncStatus;
    /** True when another phone already saved data for this account. */
    hasRemote: boolean;
    signInWithEmail: (email: string) => Promise<boolean>;
    signInWithGoogle: () => Promise<boolean>;
    unlock: (secret: string) => Promise<"ok" | "wrong" | "offline">;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<boolean>;
  };
};

const Ctx = createContext<AppState | null>(null);

function returnUrl(): string {
  return window.location.origin + window.location.pathname;
}

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

  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>("guest");
  const [hasRemote, setHasRemote] = useState(false);
  const provider = useRef<SyncProvider>(localOnly);
  const keyring = useRef<StoredKeyring | null>(null);
  const lastSynced = useRef("");
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
  const finishLesson = useCallback(async (lessonId: string) => {
    const fresh = !progressRef.current.lessons.includes(lessonId);
    await change((current) => completeLesson(current, lessonId, pathsRef.current, todayISO()), fresh);
  }, [change]);
  const finishStep = useCallback(
    (pathId: string, stepId: string) => change((current) => completeStep(current, pathId, stepId, pathsRef.current, todayISO())),
    [change],
  );
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

  // Sign-in and sync. Nothing here runs unless Supabase keys are set.

  const runSync = useCallback(async (local: VaultData) => {
    const ring = keyring.current;
    if (!ring || !provider.current.available) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("saving");
    const merged = await syncOnce(provider.current, ring, local, todayISO());
    if (!merged) {
      setStatus("offline");
      return;
    }
    lastSynced.current = JSON.stringify(merged);
    if (lastSynced.current !== JSON.stringify(local)) {
      await writeSynced(merged.entries as Entry[], merged.goal, merged.progress);
      setEntries(merged.entries as Entry[]);
      setGoalState(merged.goal);
      progressRef.current = merged.progress;
      setProgress(merged.progress);
    }
    setStatus("saved");
  }, []);

  const attach = useCallback(async (next: SyncProvider) => {
    provider.current = next;
    const apply = async (found: SyncUser | null) => {
      setUser(found);
      if (!found) {
        keyring.current = null;
        setStatus("guest");
        return;
      }
      const stored = await getMeta<StoredKeyring>("keyring").catch(() => undefined);
      if (stored && stored.userId === found.id) {
        keyring.current = stored;
        setStatus("saved");
        lastSynced.current = "";
      } else {
        keyring.current = null;
        setStatus("needs-secret");
        next.pull().then((row) => setHasRemote(Boolean(row))).catch(() => undefined);
      }
    };
    await apply(await next.getUser());
    return next.onUser((found) => void apply(found));
  }, []);

  useEffect(() => {
    if (!mayHaveSession()) return;
    let stop: (() => void) | undefined;
    getProvider().then(attach).then((off) => {
      stop = off;
    });
    return () => stop?.();
  }, [attach]);

  const ensureProvider = useCallback(async () => {
    if (provider.current.available) return provider.current;
    const next = await getProvider();
    if (next.available) await attach(next);
    return next;
  }, [attach]);

  // Save a little after each change, and once when the app opens.
  useEffect(() => {
    if (!ready || !user || !keyring.current || status === "needs-secret") return;
    const local: VaultData = { v: 1, entries, goal, progress };
    if (JSON.stringify(local) === lastSynced.current) return;
    const timer = window.setTimeout(() => void runSync(local), lastSynced.current ? 2500 : 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, entries, goal, progress, runSync]);

  const sync = useMemo<AppState["sync"]>(() => ({
    configured: SYNC_CONFIGURED,
    user,
    status,
    hasRemote,
    signInWithEmail: async (email) => (await ensureProvider()).signInWithEmail(email, returnUrl()),
    signInWithGoogle: async () => (await ensureProvider()).signInWithGoogle(returnUrl()),
    unlock: async (secret) => {
      const current = await ensureProvider();
      const found = await current.getUser();
      if (!found) return "offline";
      const result = await unlock(current, secret);
      if (!result.ok) return result.reason;
      const stored: StoredKeyring = { ...result.keyring, userId: found.id };
      keyring.current = stored;
      await setMeta("keyring", stored).catch(() => undefined);
      lastSynced.current = "";
      setStatus("saving");
      await runSync({ v: 1, entries, goal, progress: progressRef.current });
      return "ok";
    },
    signOut: async () => {
      await provider.current.signOut();
      keyring.current = null;
      await setMeta("keyring", null).catch(() => undefined);
      setUser(null);
      setStatus("guest");
    },
    deleteAccount: async () => {
      const done = await provider.current.deleteAccount();
      if (done) {
        keyring.current = null;
        await setMeta("keyring", null).catch(() => undefined);
        setUser(null);
        setStatus("guest");
      }
      return done;
    },
  }), [user, status, hasRemote, ensureProvider, runSync, entries, goal]);

  const streak = useMemo(() => computeStreak(progress.days, today), [progress.days, today]);

  const value = useMemo<AppState>(() => ({
    ready, failed, today, entries, loans, goal, progress, lessons, paths, streak, cheer,
    answer, finishTask, finishLesson, finishStep, finishCase, setActivePath, dismissOffer,
    logEntry, setGoal, addLoan, restore, sync,
  }), [
    ready, failed, today, entries, loans, goal, progress, lessons, paths, streak, cheer,
    answer, finishTask, finishLesson, finishStep, finishCase, setActivePath, dismissOffer,
    logEntry, setGoal, addLoan, restore, sync,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("app-state");
  return value;
}
