// frontend/lib/auth.ts
//
// Auth state lives in an httpOnly cookie set by the backend.
// The browser cannot read or clear it directly — call api.logout()
// (or the logout() helper below) and let the server clear the cookie.
import { api } from "./api";

export async function logout(): Promise<void> {
  try {
    await api.logout();
  } catch {
    // best-effort: even if the request fails the user is signing out
  }
}

export function isoWeek(date: Date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  const year = target.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function shiftIsoWeek(week: string, delta: number): string {
  const [yearStr, weekStr] = week.split("-W");
  const year = Number(yearStr);
  const weekNum = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day);
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setUTCDate(mondayWeek1.getUTCDate() + (weekNum - 1 + delta) * 7);
  return isoWeek(targetMonday);
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
