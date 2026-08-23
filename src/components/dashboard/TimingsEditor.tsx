"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chefSaveTimings } from "@/lib/chef/actions";
import { WEEKDAYS, type Timings, type DaySchedule } from "@/types/schemas";
import { copy } from "@/lib/copy/en";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

interface Props {
  chefId: string;
  timings: Timings | null;
}

function defaultTimings(): Timings {
  return {
    vacation: false,
    days: Object.fromEntries(
      WEEKDAYS.map((d) => [d, { open: "09:00", close: "21:00" }]),
    ) as Timings["days"],
  };
}

export function DashboardTimingsEditor({ chefId, timings: initial }: Props) {
  const [timings, setTimings] = useState<Timings>(initial ?? defaultTimings());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updateDay(day: string, schedule: DaySchedule) {
    setTimings((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: schedule },
    }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await chefSaveTimings(chefId, timings);
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Vacation mode */}
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="font-medium text-neutral-900">{copy.dashboard.vacationMode}</p>
          <p className="text-sm text-neutral-500">{copy.dashboard.vacationHelp}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={timings.vacation}
            onChange={(e) => setTimings({ ...timings, vacation: e.target.checked })}
            className="sr-only peer"
          />
          <div className="h-6 w-11 rounded-full bg-neutral-200 peer-checked:bg-zuby-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      {/* Weekly grid */}
      <div className="space-y-3">
        {WEEKDAYS.map((day) => {
          const schedule = timings.days[day];
          const isClosed = !schedule || ("closed" in schedule && schedule.closed === true);
          const openSchedule = !isClosed
            ? (schedule as { open: string; close: string; order_cutoff?: string })
            : null;

          return (
            <div key={day} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-900">{DAY_LABELS[day]}</p>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={!isClosed}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateDay(day, { open: "09:00", close: "21:00" });
                      } else {
                        updateDay(day, { closed: true });
                      }
                    }}
                  />
                  Open
                </label>
              </div>
              {openSchedule && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-500">Open</label>
                    <input
                      type="time"
                      value={openSchedule.open}
                      onChange={(e) => updateDay(day, { ...openSchedule, open: e.target.value })}
                      className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500">Close</label>
                    <input
                      type="time"
                      value={openSchedule.close}
                      onChange={(e) => updateDay(day, { ...openSchedule, close: e.target.value })}
                      className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500">Order by</label>
                    <input
                      type="time"
                      value={openSchedule.order_cutoff ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          updateDay(day, { ...openSchedule, order_cutoff: val });
                        } else {
                          // Clearing the cutoff drops the key entirely — the
                          // schema treats it as optional, not nullable.
                          const rest = { ...openSchedule };
                          delete rest.order_cutoff;
                          updateDay(day, rest as DaySchedule);
                        }
                      }}
                      className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-lg bg-zuby-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save timings"}
      </button>
    </div>
  );
}
