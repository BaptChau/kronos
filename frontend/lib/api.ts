// frontend/lib/api.ts
import { getToken, clearToken } from "./auth";

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
  query?: Record<string, string | number | undefined>;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const response = await fetch(url, {
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

export type TimeEntry = {
  id: string;
  user_id: string;
  company_id: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  duration_minutes: number | null;
  note: string | null;
};

export type ClockStatus = { open_entry: TimeEntry | null };

export type WeeklySummary = {
  week: string;
  total_minutes: number;
  minutes_by_day: Record<string, number>;
};

export type User = {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
};

export type UserWithStatus = User & {
  has_open_entry: boolean;
  current_clock_in: string | null;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export const api = {
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  register: (payload: {
    company_name: string;
    company_slug: string;
    admin_email: string;
    admin_password: string;
    admin_full_name: string;
  }) =>
    apiFetch<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  me: () => apiFetch<User>("/api/v1/auth/me"),

  clockStatus: () => apiFetch<ClockStatus>("/api/v1/clock/status"),
  clockIn: (note?: string) =>
    apiFetch<TimeEntry>("/api/v1/clock/in", { method: "POST", body: { note: note ?? null } }),
  clockOut: (note?: string) =>
    apiFetch<TimeEntry>("/api/v1/clock/out", { method: "POST", body: { note: note ?? null } }),

  myEntries: (week: string) =>
    apiFetch<TimeEntry[]>("/api/v1/timesheet/me", { query: { week } }),
  mySummary: (week: string) =>
    apiFetch<WeeklySummary>("/api/v1/timesheet/me/summary", { query: { week } }),

  listUsers: () => apiFetch<UserWithStatus[]>("/api/v1/admin/users"),
  createUser: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: "admin" | "employee";
  }) => apiFetch<User>("/api/v1/admin/users", { method: "POST", body: payload }),
  userTimesheet: (userId: string, week: string) =>
    apiFetch<TimeEntry[]>(`/api/v1/admin/users/${userId}/timesheet`, { query: { week } }),
  userSummary: (userId: string, week: string) =>
    apiFetch<WeeklySummary>(`/api/v1/admin/users/${userId}/summary`, { query: { week } }),
  updateEntry: (
    entryId: string,
    payload: { clocked_in_at?: string; clocked_out_at?: string; note?: string },
  ) =>
    apiFetch<TimeEntry>(`/api/v1/admin/time-entries/${entryId}`, {
      method: "PATCH",
      body: payload,
    }),
};
