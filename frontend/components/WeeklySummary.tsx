// frontend/components/WeeklySummary.tsx
"use client";

import { WeeklySummary as WeeklySummaryType } from "@/lib/api";
import { formatMinutes } from "@/lib/auth";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function WeeklySummary({ summary }: { summary: WeeklySummaryType }) {
  const max = Math.max(1, ...Object.values(summary.minutes_by_day));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Week {summary.week}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatMinutes(summary.total_minutes)}
          </p>
        </div>
        <p className="text-xs text-slate-500">total</p>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const value = summary.minutes_by_day[day] ?? 0;
          const heightPct = (value / max) * 100;
          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-slate-100">
                <div
                  className="w-full bg-brand-500 transition-all"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{day}</span>
              <span className="text-xs font-medium text-slate-700">
                {value > 0 ? formatMinutes(value) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
