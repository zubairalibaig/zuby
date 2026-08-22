"use client";

import { WEEKDAYS, type Timings, type Weekday } from "@/types/schemas";
import { inputClass } from "@/components/admin/Field";

const DAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/**
 * Weekly schedule editor producing the Phase 0 `timings` shape. Each day is
 * either closed, or open with a close time and optional order cutoff
 * ("take orders until 9 PM for next-day delivery").
 */
export function TimingsEditor({
  value,
  onChange,
}: {
  value: Timings;
  onChange: (next: Timings) => void;
}) {
  function updateDay(
    day: Weekday,
    patch: Partial<{ closed: boolean; open: string; close: string; cutoff: string }>,
  ) {
    const current = value.days[day];
    const isClosed = !current || "closed" in current;
    const base = isClosed
      ? { open: "10:00", close: "21:00", order_cutoff: undefined as string | undefined }
      : {
          open: current.open,
          close: current.close,
          order_cutoff: current.order_cutoff,
        };

    if (patch.closed === true) {
      onChange({ ...value, days: { ...value.days, [day]: { closed: true } } });
      return;
    }
    const next = {
      open: patch.open ?? base.open,
      close: patch.close ?? base.close,
      order_cutoff: patch.cutoff !== undefined ? patch.cutoff || undefined : base.order_cutoff,
    };
    onChange({ ...value, days: { ...value.days, [day]: next } });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input
          type="checkbox"
          checked={value.vacation}
          onChange={(e) => onChange({ ...value, vacation: e.target.checked })}
          className="h-4 w-4 rounded border-neutral-300 text-zuby-500"
        />
        On a break (vacation mode — hides ordering on the public page)
      </label>

      <div className="space-y-2">
        {WEEKDAYS.map((day) => {
          const schedule = value.days[day];
          const closed = !schedule || "closed" in schedule;
          return (
            <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-10 font-medium text-neutral-600">{DAY_LABEL[day]}</span>
              <label className="flex items-center gap-1 text-xs text-neutral-500">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => updateDay(day, { closed: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-neutral-300"
                />
                Closed
              </label>
              {!closed && (
                <>
                  <input
                    type="time"
                    className={`${inputClass} w-28`}
                    value={schedule.open}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                  />
                  <span className="text-neutral-400">to</span>
                  <input
                    type="time"
                    className={`${inputClass} w-28`}
                    value={schedule.close}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                  />
                  <span className="text-xs text-neutral-400">order by</span>
                  <input
                    type="time"
                    className={`${inputClass} w-28`}
                    value={schedule.order_cutoff ?? ""}
                    onChange={(e) => updateDay(day, { cutoff: e.target.value })}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A sensible empty week for a new listing. */
export function defaultTimings(): Timings {
  return {
    vacation: false,
    days: Object.fromEntries(
      WEEKDAYS.map((d) => [d, { open: "10:00", close: "21:00", order_cutoff: "20:00" }]),
    ) as Timings["days"],
  };
}
