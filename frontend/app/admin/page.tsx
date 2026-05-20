// frontend/app/admin/page.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => api.me() });
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: () => api.listUsers() });

  const createMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      setShowCreate(false);
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => {
      setCreateError(err instanceof ApiError ? err.message : "create failed");
    },
  });

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin · Employees</h1>
          <p className="text-sm text-slate-500">
            {meQuery.data?.full_name ?? "…"} — {meQuery.data?.email ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            My dashboard
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showCreate ? "Close" : "New employee"}
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {showCreate && (
        <CreateUserForm
          onSubmit={(payload) => createMutation.mutate(payload)}
          loading={createMutation.isPending}
          error={createError}
        />
      )}

      <section className="mt-8">
        {usersQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {usersQuery.data && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-700">{user.email}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{user.role}</td>
                    <td className="px-4 py-3">
                      {user.has_open_entry ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Clocked in
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/${user.id}`}
                        className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        View timesheet
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function CreateUserForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: "admin" | "employee";
  }) => void;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ email, password, full_name: fullName, role });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-5"
    >
      <input
        required
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        required
        type="password"
        placeholder="Initial password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "employee")}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "…" : "Create"}
      </button>
      {error && (
        <p className="md:col-span-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
