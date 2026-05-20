// frontend-owner/app/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { clearToken, setToken } from "@/lib/auth";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      const user = await api.me();
      if (user.role !== "owner") {
        clearToken();
        setError("this account is not a platform owner");
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            Owner console
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Kronos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with a platform owner account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          Bootstrap a first owner from the API container:
          <code className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">
            python -m scripts.create_owner --email … --password … --name …
          </code>
        </p>
      </div>
    </main>
  );
}
