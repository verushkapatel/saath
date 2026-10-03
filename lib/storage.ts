import { todayISO } from "./dates";
import type { ScheduleRow } from "./finance";
import { answerQuestion, normalizeProgress, type Progress } from "./progress";

export type { Progress } from "./progress";

export type Entry = {
  id: string;
  kind: "in" | "out" | "save";
  category: string;
  amount: number;
  date: string;
};

export type Loan = {
  id: string;
  lender: string;
  principal: number;
  annualRate: number;
  rateType: "flat" | "reducing";
  tenureMonths: number;
  fee: number;
  emi: number;
  startDate: string;
  schedule: ScheduleRow[];
};

export type Goal = { id: "goal"; target: number };

export type Backup = {
  v: 1;
  entries: Entry[];
  loans: Loan[];
  goal: number;
  progress: Progress;
};

export type Tracker = { entries: Entry[]; loans: Loan[]; goal: number; progress: Progress };

let databaseName = "saath";

/** Each account has its own database. Call this when someone logs in. */
export function openDatabase(name: string): void {
  databaseName = name;
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("entries")) database.createObjectStore("entries", { keyPath: "id" });
      if (!database.objectStoreNames.contains("loans")) database.createObjectStore("loans", { keyPath: "id" });
      if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function all<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function put(store: IDBObjectStore, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function get<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function loadTracker(): Promise<Tracker> {
  const database = await db();
  const tx = database.transaction(["entries", "loans", "meta"], "readonly");
  const meta = tx.objectStore("meta");
  const [entries, loans, goalRow, progressRow] = await Promise.all([
    all<Entry>(tx.objectStore("entries")),
    all<Loan>(tx.objectStore("loans")),
    get<Goal>(meta, "goal"),
    get<Progress>(meta, "progress"),
  ]);
  return {
    entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
    loans,
    goal: goalRow?.target ?? 0,
    progress: normalizeProgress(progressRow),
  };
}

export async function addEntry(entry: Entry): Promise<void> {
  const database = await db();
  await put(database.transaction("entries", "readwrite").objectStore("entries"), entry);
}

export async function addLoan(loan: Loan): Promise<void> {
  const database = await db();
  await put(database.transaction("loans", "readwrite").objectStore("loans"), loan);
}

export async function saveGoal(target: number): Promise<void> {
  const database = await db();
  await put(database.transaction("meta", "readwrite").objectStore("meta"), { id: "goal", target } satisfies Goal);
}

export async function saveProgress(progress: Progress): Promise<void> {
  const database = await db();
  await put(database.transaction("meta", "readwrite").objectStore("meta"), progress);
}

export async function markAnswered(progress: Progress, choice = 0): Promise<Progress> {
  const next = answerQuestion(progress, choice, todayISO());
  if (next !== progress) await saveProgress(next);
  return next;
}

/** A small value kept beside the tracker, such as the key that locks synced data. */
export async function getMeta<T>(id: string): Promise<T | undefined> {
  const database = await db();
  const row = await get<{ id: string; value: T }>(database.transaction("meta", "readonly").objectStore("meta"), id);
  return row?.value;
}

export async function setMeta(id: string, value: unknown): Promise<void> {
  const database = await db();
  await put(database.transaction("meta", "readwrite").objectStore("meta"), { id, value });
}

export async function exportBackup(): Promise<Backup> {
  const data = await loadTracker();
  return { v: 1, entries: data.entries, loans: data.loans, goal: data.goal, progress: data.progress };
}

export async function importBackup(backup: Backup): Promise<void> {
  const database = await db();
  const tx = database.transaction(["entries", "loans", "meta"], "readwrite");
  const entries = tx.objectStore("entries");
  const loans = tx.objectStore("loans");
  const meta = tx.objectStore("meta");
  await Promise.all(backup.entries.map((entry) => put(entries, entry)));
  await Promise.all(backup.loans.map((loan) => put(loans, loan)));
  await put(meta, { id: "goal", target: backup.goal } satisfies Goal);
  await put(meta, { ...normalizeProgress(backup.progress), id: "progress" });
}

/** Writes the result of a sync merge. Loans are left alone: they never leave the phone. */
export async function writeSynced(entries: Entry[], goal: number, progress: Progress): Promise<void> {
  const database = await db();
  const tx = database.transaction(["entries", "meta"], "readwrite");
  const store = tx.objectStore("entries");
  const meta = tx.objectStore("meta");
  await Promise.all(entries.map((entry) => put(store, entry)));
  await put(meta, { id: "goal", target: goal } satisfies Goal);
  await put(meta, progress);
}

/** Removes everything Saath saved in this browser. */
export function eraseDevice(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export function entriesToCsv(entries: Entry[]): string {
  const lines = ["date,kind,category,amount", ...entries.map((entry) => `${entry.date},${entry.kind},${entry.category},${entry.amount}`)];
  return lines.join("\n");
}
