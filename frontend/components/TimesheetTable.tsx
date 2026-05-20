// frontend/components/TimesheetTable.tsx
"use client";

import { FormEvent, useState } from "react";

import { TimeEntry } from "@/lib/api";
import { formatMinutes } from "@/lib/auth";

type Props = {
  entries: TimeEntry[];
  editable?: boolean;
  onUpdate?: (
    entryId: string,
    payload: { clocked_in_at?: string; clocked_out_at?: string; note?: string },
  ) => Promise<void>;
};

function formatDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TimesheetTable({ entries, editable = false, onUpdate }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        No time entries for this week.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Day</th>
            <th className="px-4 py-3">Clock in</th>
            <th className="px-4 py-3">Clock out</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Note</th>
            {editable && <th className="px-4 py-3 text-right">Edit</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <Row
              key={entry.id}
              entry={entry}
              editable={editable}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  entry,
  editable,
  onUpdate,
}: {
  entry: TimeEntry;
  editable: boolean;
  onUpdate?: Props["onUpdate"];
}) {
  const [editing, setEditing] = useState(false);
  const [clockIn, setClockIn] = useState(formatDateTimeLocal(entry.clocked_in_at));
  const [clockOut, setClockOut] = useState(formatDateTimeLocal(entry.clocked_out_at));
  const [note, setNote] = useState(entry.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = new Date(entry.clocked_in_at).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onUpdate) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<NonNullable<Props["onUpdate"]>>[1] = {
        clocked_in_at: clockIn ? new Date(clockIn).toISOString() : undefined,
        clocked_out_at: clockOut ? new Date(clockOut).toISOString() : undefined,
        note: note || undefined,
      };
      await onUpdate(entry.id, payload);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "update failed");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50/50">
        <td className="px-4 py-3 font-medium text-slate-900">{day}</td>
        <td className="px-4 py-3">
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-3 text-slate-500">—</td>
        <td className="px-4 py-3" colSpan={editable ? 2 : 1}>
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
              placeholder="Note"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium text-slate-900">{day}</td>
      <td className="px-4 py-3 text-slate-700">
        {new Date(entry.clocked_in_at).toLocaleTimeString()}
      </td>
      <td className="px-4 py-3 text-slate-700">
        {entry.clocked_out_at
          ? new Date(entry.clocked_out_at).toLocaleTimeString()
          : <span className="text-emerald-600 font-medium">In progress</span>}
      </td>
      <td className="px-4 py-3 text-slate-700">
        {entry.duration_minutes != null ? formatMinutes(entry.duration_minutes) : "—"}
      </td>
      <td className="px-4 py-3 text-slate-500">{entry.note ?? "—"}</td>
      {editable && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
        </td>
      )}
    </tr>
  );
}
