import type { DaySchedule, Timings, Weekday } from "@/types/schemas";

/**
 * The one place a price is turned into display text. Every phase (this one,
 * and later Singapore in Phase 6) must go through this — never interpolate a
 * currency symbol inline (CLAUDE.md: never hardcode "₹").
 */
export function formatPrice(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function todayKey(): Weekday {
  // getDay(): 0=Sun..6=Sat; rotate to our mon-first order.
  const jsDay = new Date().getDay();
  return WEEKDAY_ORDER[(jsDay + 6) % 7]!;
}

/** "Order by 9 PM for tomorrow" / "Open until 9 PM today" / "Closed today". */
export function describeToday(timings: Timings | null): string {
  if (!timings) return "Timings not listed yet";
  if (timings.vacation) return "Currently on a break";

  const today = timings.days[todayKey()];
  if (!today || "closed" in today) return "Closed today";

  const schedule = today as Extract<DaySchedule, { open: string }>;
  const cutoff = schedule.order_cutoff
    ? ` · order by ${formatTime(schedule.order_cutoff)} today`
    : "";
  return `Open ${formatTime(schedule.open)}–${formatTime(schedule.close)}${cutoff}`;
}

/** Full weekly schedule, Mon → Sun, for the profile page. */
export function describeWeek(timings: Timings | null): { day: string; text: string }[] {
  if (!timings) return [];
  return WEEKDAY_ORDER.map((day) => {
    const schedule = timings.days[day];
    if (!schedule || "closed" in schedule) {
      return { day: WEEKDAY_LABEL[day], text: "Closed" };
    }
    const s = schedule as Extract<DaySchedule, { open: string }>;
    const cutoff = s.order_cutoff ? ` (order by ${formatTime(s.order_cutoff)})` : "";
    return {
      day: WEEKDAY_LABEL[day],
      text: `${formatTime(s.open)}–${formatTime(s.close)}${cutoff}`,
    };
  });
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
