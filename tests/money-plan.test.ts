import { describe, expect, it } from "vitest";
import { monthView, parseBankSms, suggestBudgets, type MoneyPlan } from "@/lib/money-plan";

describe("bank SMS reading", () => {
  it("reads a UPI debit with the shop and a category", () => {
    const guess = parseBankSms("Rs.450.00 debited from A/c XX2741 to SWIGGY on 12-10-26. UPI Ref 4021. Not you? Call 1800");
    expect(guess).toMatchObject({ kind: "out", amount: 450, category: "food" });
    expect(guess?.merchant.toLowerCase()).toContain("swiggy");
  });
  it("reads a salary credit", () => {
    expect(parseBankSms("INR 28,000.00 credited to A/c XX2741 on 30-10-26 by NEFT SALARY OCT")).toMatchObject({ kind: "in", amount: 28000, category: "salary" });
  });
  it("returns nothing without an amount", () => {
    expect(parseBankSms("Your OTP is 482913. Do not share it.")).toBeNull();
  });
});

describe("the month plan", () => {
  const plan: MoneyPlan = {
    income: 30000, payday: 1, setAt: "2026-10-01",
    budgets: { food: 5000 },
    bills: [{ id: "rent", name: "Rent", amount: 9000, day: 5, category: "rent", paid: [] }],
    pots: [],
  };
  it("subtracts unpaid bills and spending to give a safe amount per day", () => {
    const view = monthView(plan, [{ id: "a", kind: "out", category: "food", amount: 1000, date: "2026-10-10" }], "2026-10-11");
    expect(view.spent.food).toBe(1000);
    expect(view.safeLeft).toBe(30000 - 1000 - 9000);
    expect(view.safePerDay).toBe(Math.floor(20000 / 21));
    expect(view.billsDue[0].daysLeft).toBe(-6);
  });
  it("suggests budgets that fit inside income after bills and saving", () => {
    const budgets = suggestBudgets(30000, plan.bills);
    const total = Object.values(budgets).reduce((sum, value) => sum + value, 0);
    expect(total).toBeLessThanOrEqual(30000 - 9000 - 3000 + 500);
    expect(budgets.food).toBeGreaterThan(0);
  });
});
