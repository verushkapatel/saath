import { describe, expect, it } from "vitest";
import { aggregate, buildEvent, canShare, MIN_COHORT, type ImpactEvent } from "@/lib/impact";

function cohort(code: string, grade: string, students: number, before: number[], after?: number[]): ImpactEvent[] {
  const events: ImpactEvent[] = [];
  for (let i = 0; i < students; i += 1) {
    events.push({ cohort: code, grade, kind: "join" });
    events.push({ cohort: code, grade, kind: "check-before", units: before });
    if (after) events.push({ cohort: code, grade, kind: "check-after", units: after });
    events.push({ cohort: code, grade, kind: "lesson", count: 2 });
  }
  events.push({ cohort: code, grade, kind: "path" });
  return events;
}

describe("cohort aggregation", () => {
  it("adds up students, lessons and paths for a school and grade", () => {
    const { rows, hidden } = aggregate(cohort("PUNE01", "9", 12, [0.5, 0.25, 0.25, 0.5], [0.75, 0.75, 0.5, 0.5]));
    expect(hidden).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ cohort: "PUNE01", grade: "9", students: 12, lessons: 24, paths: 1, beforeCount: 12, afterCount: 12 });
  });

  it("averages each unit before and after, and reports the change in points", () => {
    const { rows } = aggregate(cohort("PUNE01", "9", 10, [0.5, 0.25, 0.25, 0.5], [0.75, 0.75, 0.5, 0.5]));
    expect(rows[0].before).toEqual({ "own-money": 0.5, "bank-paper": 0.25, "borrow-safe": 0.25, "how-money": 0.5 });
    expect(rows[0].after?.["bank-paper"]).toBe(0.75);
    expect(rows[0].change).toEqual({ "own-money": 25, "bank-paper": 50, "borrow-safe": 25, "how-money": 0 });
  });

  it("hides any group with fewer than ten students", () => {
    expect(MIN_COHORT).toBe(10);
    const events = [...cohort("PUNE01", "9", 10, [0.5, 0.5, 0.5, 0.5]), ...cohort("PUNE01", "10", 9, [0.2, 0.2, 0.2, 0.2]), ...cohort("TINY", "9", 1, [1, 1, 1, 1])];
    const { rows, hidden } = aggregate(events);
    expect(rows.map((row) => `${row.cohort}-${row.grade}`)).toEqual(["PUNE01-9"]);
    expect(hidden).toBe(2);
    expect(JSON.stringify(rows)).not.toContain("TINY");
  });

  it("does not let lesson or check events stand in for students", () => {
    const events: ImpactEvent[] = Array.from({ length: 40 }, () => ({ cohort: "X1", grade: "9", kind: "lesson" as const }));
    expect(aggregate(events).rows).toHaveLength(0);
  });

  it("treats school codes without regard to case and ignores broken events", () => {
    const events = [...cohort("pune01", "9", 6, [0.5, 0.5, 0.5, 0.5]), ...cohort("PUNE01", "9", 6, [0.5, 0.5, 0.5, 0.5]), { cohort: "", grade: "9", kind: "join" } as ImpactEvent];
    const { rows } = aggregate(events);
    expect(rows).toHaveLength(1);
    expect(rows[0].students).toBe(12);
  });

  it("ignores scores that are not four numbers", () => {
    const events = [...cohort("PUNE01", "9", 10, [0.5, 0.5, 0.5, 0.5]), { cohort: "PUNE01", grade: "9", kind: "check-before", units: [9, 9] } as ImpactEvent];
    expect(aggregate(events).rows[0].before?.["own-money"]).toBe(0.5);
  });
});

describe("what leaves the phone", () => {
  const joined = { schoolCode: "PUNE01", grade: "9", shareAggregates: true };

  it("sends nothing unless the student joined, said yes, and an endpoint exists", () => {
    expect(canShare(joined, "https://example.org/impact")).toBe(true);
    expect(canShare(joined, "")).toBe(false);
    expect(canShare({ ...joined, shareAggregates: false }, "https://example.org/impact")).toBe(false);
    expect(canShare({ ...joined, schoolCode: null }, "https://example.org/impact")).toBe(false);
  });

  it("builds an event with only the cohort, the grade, the kind and four scores", () => {
    const profile = { ...joined, nickname: "Asha", id: "device-123", db: "saath" };
    const event = buildEvent(profile, "check-before", { units: [0.333333, 0.666667, 1, 0] });
    expect(Object.keys(event ?? {}).sort()).toEqual(["cohort", "grade", "kind", "units"]);
    expect(event).toEqual({ cohort: "PUNE01", grade: "9", kind: "check-before", units: [0.33, 0.67, 1, 0] });
    expect(JSON.stringify(event)).not.toContain("Asha");
    expect(JSON.stringify(event)).not.toContain("device-123");
  });

  it("builds nothing for a guest", () => {
    expect(buildEvent({ schoolCode: null, grade: null, shareAggregates: true }, "join")).toBeNull();
  });
});
