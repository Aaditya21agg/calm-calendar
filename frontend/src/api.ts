const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function authUrl() {
  return `${API_BASE}/auth/google`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data as T;
}
