import { z } from "zod";
import { normalizeProgress } from "./progress";
import type { Backup } from "./storage";

const scheduleRow = z.object({
  month: z.number(),
  due: z.string(),
  payment: z.number(),
  interest: z.number(),
  principal: z.number(),
  balance: z.number(),
});

export const backupSchema = z.object({
  v: z.literal(1),
  entries: z.array(z.object({
    id: z.string(),
    kind: z.enum(["in", "out", "save"]),
    category: z.string(),
    amount: z.number().positive(),
    date: z.string(),
  })),
  loans: z.array(z.object({
    id: z.string(),
    lender: z.string(),
    principal: z.number(),
    annualRate: z.number(),
    rateType: z.enum(["flat", "reducing"]),
    tenureMonths: z.number(),
    fee: z.number(),
    emi: z.number(),
    startDate: z.string(),
    schedule: z.array(scheduleRow),
  })),
  goal: z.number().nonnegative(),
  progress: z.object({
    id: z.literal("progress"),
    streak: z.number().nonnegative(),
    lastAnswerDate: z.string().nullable(),
    cases: z.record(z.number()),
    lessons: z.array(z.string()),
    days: z.array(z.string()).optional(),
    tasks: z.record(z.array(z.string())).optional(),
    answers: z.record(z.number()).optional(),
    paths: z.record(z.array(z.string())).optional(),
    milestones: z.record(z.string()).optional(),
    activePath: z.string().nullable().optional(),
    offered: z.boolean().optional(),
  }),
});

export function parseBackup(input: unknown): Backup | null {
  const parsed = backupSchema.safeParse(input);
  return parsed.success ? { ...parsed.data, progress: normalizeProgress(parsed.data.progress) } : null;
}
