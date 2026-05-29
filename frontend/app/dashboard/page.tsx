// frontend/app/dashboard/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ClockButton } from "@/components/ClockButton";
import { TimesheetTable } from "@/components/TimesheetTable";
import { WeeklySummary } from "@/components/WeeklySummary";
import { api, ApiError } from "@/lib/api";
import { isoWeek, logout as serverLogout, shiftIsoWeek } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [week, setWeek] = useState(() => isoWeek());

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => api.me() });

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      router.replace("/login");
    }
  }, [meQuery.error, router]);
  const entriesQuery = useQuery({
    queryKey: ["my-entries", week],
    queryFn: () => api.myEntries(week),
  });
  const summaryQuery = useQuery({
    queryKey: ["my-summary", week],
    queryFn: () => api.mySummary(week),
  });

  async function logout() {
    await serverLogout();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kronos</h1>
          <p className="text-sm text-slate-500">
            Hello {meQuery.data?.full_name ?? "…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meQuery.data?.role === "admin" && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-8">
        <ClockButton />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">This week</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeek(shiftIsoWeek(week, -1))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
            >
              ← Previous
            </button>
            <span className="text-sm font-medium text-slate-700">{week}</span>
            <button
              onClick={() => setWeek(shiftIsoWeek(week, 1))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
            >
              Next →
            </button>
          </div>
        </div>

        {summaryQuery.data && (
          <div className="mb-6">
            <WeeklySummary summary={summaryQuery.data} />
          </div>
        )}

        {entriesQuery.data && <TimesheetTable entries={entriesQuery.data} />}
      </section>
    </main>
  );
}
