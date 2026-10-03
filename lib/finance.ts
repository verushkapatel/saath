export type RateType = "flat" | "reducing";

export type ScheduleRow = {
  month: number;
  due: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

export type MethodFigures = {
  emi: number;
  totalRepayment: number;
  totalInterest: number;
};

export type Figures = {
  method: RateType;
  emi: number;
  totalRepayment: number;
  totalInterest: number;
  fee: number;
  received: number;
  effectiveAnnualRate: number | null;
  comparison: { flat: MethodFigures; reducing: MethodFigures };
  schedule: ScheduleRow[];
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function paise(rupees: number): number {
  return Math.round(rupees * 100);
}

function rupees(paiseAmount: number): number {
  return round2(paiseAmount / 100);
}

export function emiReducing(principal: number, annualPercent: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const monthly = annualPercent / 100 / 12;
  if (monthly === 0) return round2(principal / months);
  const growth = (1 + monthly) ** months;
  return round2((principal * monthly * growth) / (growth - 1));
}

export function emiFlat(principal: number, annualPercent: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const interest = principal * (annualPercent / 100) * (months / 12);
  return round2((principal + interest) / months);
}

export function totalRepayment(emi: number, months: number): number {
  return round2(emi * months);
}

export function totalInterest(repayment: number, principal: number): number {
  return round2(repayment - principal);
}

function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, last);
  const next = new Date(date.getFullYear(), date.getMonth(), safeDay);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildSchedule(
  principal: number,
  annualPercent: number,
  months: number,
  method: RateType,
  startDate: string,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  if (!(principal > 0) || !(months > 0)) return rows;

  if (method === "flat") {
    const interestPaise = Math.round(principal * (annualPercent / 100) * (months / 12) * 100);
    const principalPaise = paise(principal);
    let interestLeft = interestPaise;
    let principalLeft = principalPaise;
    const interestEach = Math.round(interestPaise / months);
    const principalEach = Math.round(principalPaise / months);
    for (let month = 1; month <= months; month += 1) {
      const interest = month === months ? interestLeft : Math.min(interestEach, interestLeft);
      const principalPart = month === months ? principalLeft : Math.min(principalEach, principalLeft);
      interestLeft -= interest;
      principalLeft -= principalPart;
      rows.push({
        month,
        due: addMonths(startDate, month),
        payment: rupees(interest + principalPart),
        interest: rupees(interest),
        principal: rupees(principalPart),
        balance: rupees(principalLeft),
      });
    }
    return rows;
  }

  const monthly = annualPercent / 100 / 12;
  const emiPaise = paise(emiReducing(principal, annualPercent, months));
  let balance = paise(principal);
  for (let month = 1; month <= months; month += 1) {
    const interest = Math.round(balance * monthly);
    let principalPart = emiPaise - interest;
    let payment = emiPaise;
    if (month === months || principalPart >= balance) {
      principalPart = balance;
      payment = principalPart + interest;
    }
    if (principalPart < 0) principalPart = 0;
    balance -= principalPart;
    if (balance < 0) balance = 0;
    rows.push({
      month,
      due: addMonths(startDate, month),
      payment: rupees(payment),
      interest: rupees(interest),
      principal: rupees(principalPart),
      balance: rupees(balance),
    });
  }
  return rows;
}

export function effectiveAnnualRate(netReceived: number, payments: number[]): number | null {
  if (!(netReceived > 0) || payments.length === 0) return null;
  if (payments.every((payment) => payment === 0)) return 0;
  let rate = 0.01;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    let value = -netReceived;
    let slope = 0;
    for (let k = 1; k <= payments.length; k += 1) {
      const discount = (1 + rate) ** k;
      value += payments[k - 1] / discount;
      slope += (-k * payments[k - 1]) / (1 + rate) ** (k + 1);
    }
    if (!Number.isFinite(value) || !Number.isFinite(slope) || slope === 0) return null;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.99) return null;
    if (Math.abs(next - rate) < 1e-10) {
      rate = next;
      break;
    }
    rate = next;
  }
  if (rate <= -0.99) return null;
  return round2(((1 + rate) ** 12 - 1) * 100);
}

function sumPayments(rows: ScheduleRow[]): number {
  return round2(rows.reduce((sum, row) => sum + row.payment, 0));
}

function methodFigures(
  principal: number,
  annualPercent: number,
  months: number,
  method: RateType,
  startDate: string,
): MethodFigures {
  const schedule = buildSchedule(principal, annualPercent, months, method, startDate);
  const repayment = sumPayments(schedule);
  return {
    emi: method === "flat" ? emiFlat(principal, annualPercent, months) : emiReducing(principal, annualPercent, months),
    totalRepayment: repayment,
    totalInterest: totalInterest(repayment, principal),
  };
}

export function loanFigures(input: {
  principal: number;
  annualPercent: number;
  months: number;
  method: RateType;
  fee: number;
  startDate: string;
}): Figures {
  const schedule = buildSchedule(
    input.principal,
    input.annualPercent,
    input.months,
    input.method,
    input.startDate,
  );
  const repayment = sumPayments(schedule);
  const fee = Math.max(0, input.fee);
  const received = round2(input.principal - fee);
  return {
    method: input.method,
    emi: input.method === "flat"
      ? emiFlat(input.principal, input.annualPercent, input.months)
      : emiReducing(input.principal, input.annualPercent, input.months),
    totalRepayment: repayment,
    totalInterest: totalInterest(repayment, input.principal),
    fee,
    received,
    effectiveAnnualRate: effectiveAnnualRate(
      received,
      schedule.map((row) => row.payment),
    ),
    comparison: {
      flat: methodFigures(input.principal, input.annualPercent, input.months, "flat", input.startDate),
      reducing: methodFigures(input.principal, input.annualPercent, input.months, "reducing", input.startDate),
    },
    schedule,
  };
}
