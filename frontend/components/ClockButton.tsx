// frontend/components/ClockButton.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ClockStatus } from "@/lib/api";

export function ClockButton() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<ClockStatus>({
    queryKey: ["clock-status"],
    queryFn: () => api.clockStatus(),
    refetchInterval: 30_000,
  });

  const clockInMutation = useMutation({
    mutationFn: () => api.clockIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["my-summary"] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => api.clockOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["my-summary"] });
    },
  });

  const open = statusQuery.data?.open_entry;
  const pending = clockInMutation.isPending || clockOutMutation.isPending;
  const error = clockInMutation.error || clockOutMutation.error;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Current status</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {statusQuery.isLoading
              ? "Loading…"
              : open
                ? `Clocked in since ${new Date(open.clocked_in_at).toLocaleTimeString()}`
                : "Not clocked in"}
          </p>
        </div>

        {open ? (
          <button
            disabled={pending}
            onClick={() => clockOutMutation.mutate()}
            className="rounded-xl bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "…" : "Clock out"}
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => clockInMutation.mutate()}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "…" : "Clock in"}
          </button>
        )}
      </div>
      {error instanceof Error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
    </div>
  );
}
