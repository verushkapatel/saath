import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { computeStreak, weekStart } from "@/lib/streak";

// 2026-10-05 is a Monday.
const MON = "2026-10-05";
const day = (offset: number) => addDays(MON, offset);

describe("streak", () => {
  it("is zero with no finished tasks", () => {
    const view = computeStreak([], MON);
    expect(view.count).toBe(0);
    expect(view.frozen).toEqual([]);
    expect(view.freezeLeft).toBe(true);
  });

  it("counts a day once at least one task is finished", () => {
    expect(computeStreak([MON], MON).count).toBe(1);
  });

  it("counts consecutive days", () => {
    expect(computeStreak([day(0), day(1), day(2)], day(2)).count).toBe(3);
  });

  it("keeps yesterday's streak alive while today is still open", () => {
    const view = computeStreak([day(0), day(1)], day(2));
    expect(view.count).toBe(2);
    expect(view.week[2]).toEqual({ date: day(2), state: "today" });
  });

  it("forgives one missed day in a week without counting it", () => {
    // Monday and Tuesday done, Wednesday missed, Thursday done.
    const view = computeStreak([day(0), day(1), day(3)], day(3));
    expect(view.count).toBe(3);
    expect(view.frozen).toEqual([day(2)]);
    expect(view.freezeLeft).toBe(false);
    expect(view.week.map((item) => item.state)).toEqual(["done", "done", "frozen", "done", "future", "future", "future"]);
  });

  it("does not forgive two missed days in the same week", () => {
    // Monday done, Tuesday missed, Wednesday done, Thursday missed, Friday done.
    const view = computeStreak([day(0), day(2), day(4)], day(4));
    expect(view.count).toBe(2);
    expect(view.frozen).toEqual([day(3)]);
  });

  it("does not forgive two missed days in a row", () => {
    const view = computeStreak([day(0), day(3)], day(3));
    expect(view.count).toBe(1);
    expect(view.frozen).toEqual([]);
  });

  it("gives a fresh freeze each week", () => {
    // Last week: Wednesday missed. This week: Tuesday missed.
    const days = [day(-7), day(-6), day(-4), day(-3), day(-2), day(-1), day(0), day(2)];
    const view = computeStreak(days, day(2));
    expect(view.frozen).toEqual([day(1), day(-5)]);
    expect(view.count).toBe(8);
  });

  it("forgives yesterday when today is still open", () => {
    const view = computeStreak([day(0), day(1)], day(3));
    expect(view.count).toBe(2);
    expect(view.frozen).toEqual([day(2)]);
  });

  it("starts weeks on Monday", () => {
    expect(weekStart("2026-10-11")).toBe(MON);
    expect(weekStart(MON)).toBe(MON);
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
  });
});
