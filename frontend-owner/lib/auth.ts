// frontend-owner/lib/auth.ts
//
// Auth state lives in an httpOnly cookie set by the backend.
// Call logout() to ask the server to clear it.
import { api } from "./api";

export async function logout(): Promise<void> {
  try {
    await api.logout();
  } catch {
    // best-effort
  }
}
