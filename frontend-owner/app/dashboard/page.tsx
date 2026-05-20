// frontend-owner/app/dashboard/page.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { api, ApiError, Company, User } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const meQuery = useQuery({ queryKey: ["owner-me"], queryFn: () => api.me() });
  const companiesQuery = useQuery({
    queryKey: ["owner-companies"],
    queryFn: () => api.listCompanies(),
  });

  const createCompanyMutation = useMutation({
    mutationFn: api.createCompany,
    onSuccess: () => {
      setShowCreate(false);
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ["owner-companies"] });
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
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            Owner console
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-slate-500">
            {meQuery.data?.full_name ?? "…"} · {meQuery.data?.email ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showCreate ? "Close" : "New company"}
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
        <CreateCompanyForm
          onSubmit={(payload) => createCompanyMutation.mutate(payload)}
          loading={createCompanyMutation.isPending}
          error={createError}
        />
      )}

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Companies
          </h2>
          <div className="space-y-2">
            {companiesQuery.isLoading && (
              <p className="text-sm text-slate-500">Loading…</p>
            )}
            {companiesQuery.data?.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No companies yet.
              </p>
            )}
            {companiesQuery.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${
                  selected?.id === c.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.slug}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <CompanyPanel company={selected} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
              Select a company to view its users or add a new admin.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function CreateCompanyForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (payload: {
    company_name: string;
    company_slug: string;
    admin_email: string;
    admin_password: string;
    admin_full_name: string;
  }) => void;
  loading: boolean;
  error: string | null;
}) {
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      company_name: companyName,
      company_slug: companySlug,
      admin_email: adminEmail,
      admin_password: adminPassword,
      admin_full_name: adminFullName,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Create a new company</h2>
      <p className="mt-1 text-sm text-slate-500">
        Provisions the company and its first admin account.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Company name" value={companyName} onChange={setCompanyName} required />
        <Field
          label="Company slug"
          value={companySlug}
          onChange={(v) => setCompanySlug(v.toLowerCase())}
          placeholder="acme-corp"
          required
        />
        <Field
          label="Admin full name"
          value={adminFullName}
          onChange={setAdminFullName}
          required
        />
        <Field
          label="Admin email"
          value={adminEmail}
          onChange={setAdminEmail}
          type="email"
          required
        />
        <Field
          label="Admin password"
          value={adminPassword}
          onChange={setAdminPassword}
          type="password"
          required
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create company"}
        </button>
      </div>
    </form>
  );
}

function CompanyPanel({ company }: { company: Company }) {
  const queryClient = useQueryClient();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["owner-company-users", company.id],
    queryFn: () => api.listCompanyUsers(company.id),
  });

  const createAdminMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; full_name: string }) =>
      api.createCompanyAdmin(company.id, payload),
    onSuccess: () => {
      setShowAdminForm(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["owner-company-users", company.id] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "create failed");
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{company.name}</h2>
            <p className="text-xs text-slate-500">slug: {company.slug}</p>
            <p className="text-xs text-slate-500">
              created {new Date(company.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setShowAdminForm((v) => !v)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showAdminForm ? "Close" : "Add admin"}
          </button>
        </div>
      </div>

      {showAdminForm && (
        <AdminForm
          onSubmit={(payload) => createAdminMutation.mutate(payload)}
          loading={createAdminMutation.isPending}
          error={error}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  No users yet in this company.
                </td>
              </tr>
            )}
            {usersQuery.data?.map((u: User) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{u.full_name}</td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3 text-slate-700 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-slate-700">{u.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (payload: { email: string; password: string; full_name: string }) => void;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ email, password, full_name: fullName });
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4"
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
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "…" : "Create admin"}
      </button>
      {error && (
        <p className="md:col-span-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
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
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </label>
  );
}
