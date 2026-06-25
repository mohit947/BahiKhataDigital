import { User } from "./types";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bahikhatadigital_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("bahikhatadigital_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: User) {
  localStorage.setItem("bahikhatadigital_token", token);
  localStorage.setItem("bahikhatadigital_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("bahikhatadigital_token");
  localStorage.removeItem("bahikhatadigital_user");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
