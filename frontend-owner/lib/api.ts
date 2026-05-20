// frontend-owner/lib/api.ts
import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearToken();
    }
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : `request failed with status ${response.status}`;
    throw new ApiError(detail, response.status, payload);
  }

  return payload as T;
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type User = {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "employee";
  is_active: boolean;
  created_at: string;
};

export const api = {
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  me: () => apiFetch<User>("/api/v1/auth/me"),

  listCompanies: () => apiFetch<Company[]>("/api/v1/owner/companies"),
  createCompany: (payload: {
    company_name: string;
    company_slug: string;
    admin_email: string;
    admin_password: string;
    admin_full_name: string;
  }) =>
    apiFetch<Company>("/api/v1/owner/companies", { method: "POST", body: payload }),

  listCompanyUsers: (companyId: string) =>
    apiFetch<User[]>(`/api/v1/owner/companies/${companyId}/users`),

  createCompanyAdmin: (
    companyId: string,
    payload: { email: string; password: string; full_name: string },
  ) =>
    apiFetch<User>(`/api/v1/owner/companies/${companyId}/admins`, {
      method: "POST",
      body: payload,
    }),

  createOwner: (payload: { email: string; password: string; full_name: string }) =>
    apiFetch<User>("/api/v1/owner/owners", { method: "POST", body: payload }),
};
