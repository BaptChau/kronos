// frontend/app/admin/[userId]/page.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TimesheetTable } from "@/components/TimesheetTable";
import { WeeklySummary } from "@/components/WeeklySummary";
import { api } from "@/lib/api";
import { getToken, isoWeek, shiftIsoWeek } from "@/lib/auth";

export default function UserTimesheetPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(() => isoWeek());

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.listUsers(),
  });
  const entriesQuery = useQuery({
    queryKey: ["admin-entries", userId, week],
    queryFn: () => api.userTimesheet(userId, week),
  });
  const summaryQuery = useQuery({
    queryKey: ["admin-summary", userId, week],
    queryFn: () => api.userSummary(userId, week),
  });

  const employee = usersQuery.data?.find((u) => u.id === userId);

  async function handleUpdate(
    entryId: string,
    payload: { clocked_in_at?: string; clocked_out_at?: string; note?: string },
  ) {
    await api.updateEntry(entryId, payload);
    queryClient.invalidateQueries({ queryKey: ["admin-entries", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-summary", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-xs uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            ← Back to employees
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {employee?.full_name ?? "Employee"}
          </h1>
          <p className="text-sm text-slate-500">{employee?.email ?? ""}</p>
        </div>
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
      </header>

      <section className="mt-8 space-y-6">
        {summaryQuery.data && <WeeklySummary summary={summaryQuery.data} />}
        {entriesQuery.data && (
          <TimesheetTable
            entries={entriesQuery.data}
            editable
            onUpdate={handleUpdate}
          />
        )}
      </section>
    </main>
  );
}
