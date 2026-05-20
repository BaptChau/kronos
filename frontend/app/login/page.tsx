// frontend/app/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        setToken(res.access_token);
      } else {
        const res = await api.register({
          company_name: companyName,
          company_slug: companySlug,
          admin_email: email,
          admin_password: password,
          admin_full_name: fullName,
        });
        setToken(res.access_token);
      }
      const user = await api.me();
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Kronos</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login" ? "Sign in to your account" : "Create a new company"}
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {mode === "register" && (
            <>
              <Field
                label="Company name"
                value={companyName}
                onChange={setCompanyName}
                required
              />
              <Field
                label="Company slug"
                value={companySlug}
                onChange={(v) => setCompanySlug(v.toLowerCase())}
                placeholder="acme-corp"
                required
              />
              <Field label="Your full name" value={fullName} onChange={setFullName} required />
            </>
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create company"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          {mode === "login"
            ? "No account yet? Register a new company"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </label>
  );
}
