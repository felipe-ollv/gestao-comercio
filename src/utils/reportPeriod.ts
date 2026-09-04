export type BillingPeriod = "day" | "week" | "month" | "year";

export const billingPeriodInput: Record<BillingPeriod, { label: string; type: string }> = {
  day: { label: "Dia", type: "date" },
  week: { label: "Semana", type: "week" },
  month: { label: "Mês", type: "month" },
  year: { label: "Ano", type: "number" },
};

const pad = (value: number) => String(value).padStart(2, "0");

export function formatDateInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatWeekInput(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${target.getUTCFullYear()}-W${pad(week)}`;
}

export function getDefaultBillingValue(period: BillingPeriod) {
  const now = new Date();

  if (period === "day") return formatDateInput(now);
  if (period === "week") return formatWeekInput(now);
  if (period === "month") return formatMonthInput(now);
  return String(now.getFullYear());
}

function getWeekStart(year: number, week: number) {
  const januaryFourth = new Date(year, 0, 4);
  const weekday = januaryFourth.getDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setDate(januaryFourth.getDate() - weekday + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getBillingRange(period: BillingPeriod, value: string) {
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "day") {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) {
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    }
  }

  if (period === "week") {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      start = getWeekStart(Number(match[1]), Number(match[2]));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }
  }

  if (period === "month") {
    const [year, month] = value.split("-").map(Number);
    if (year && month) {
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    }
  }

  if (period === "year") {
    const year = Number(value);
    if (year) {
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }
  }

  return { start, end };
}

export function getBillingLabel(period: BillingPeriod, value: string) {
  if (period === "day") {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "Dia";
  }

  if (period === "week") {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    return match ? `Semana ${match[2]}/${match[1]}` : "Semana";
  }

  if (period === "month") {
    const [year, month] = value.split("-");
    return year && month ? `${month}/${year}` : "Mês";
  }

  return value || "Ano";
}
