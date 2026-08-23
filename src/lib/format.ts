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

const WEEKDAY_FROM_INTL_SHORT: Record<string, Weekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/**
 * "Today" for a chef's own weekly schedule, resolved in the chef's CITY
 * timezone — never the server's. Vercel functions run in UTC, and Bangalore
 * is UTC+5:30: for roughly 5.5 hours every night (00:00-05:30 IST) the UTC
 * calendar day is still "yesterday", so a server-local getDay() shows the
 * wrong day's hours to exactly the buyers checking late at night or first
 * thing in the morning. CLAUDE.md forbids hardcoding IST — the fix isn't a
 * hardcoded offset either, it's using the city's own timezone column via
 * Intl, so this is correct in Singapore (UTC+8) with no code change.
 */
function todayKey(timezone: string): Weekday {
  try {
    const short = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
      new Date(),
    );
    const key = WEEKDAY_FROM_INTL_SHORT[short];
    if (key) return key;
  } catch {
    /* invalid/unknown IANA name — fall through to server-local as a last resort */
  }
  const jsDay = new Date().getDay();
  return WEEKDAY_ORDER[(jsDay + 6) % 7]!;
}

/** "Order by 9 PM for tomorrow" / "Open until 9 PM today" / "Closed today". */
export function describeToday(timings: Timings | null, timezone: string): string {
  if (!timings) return "Timings not listed yet";
  if (timings.vacation) return "Currently on a break";

  const today = timings.days[todayKey(timezone)];
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
