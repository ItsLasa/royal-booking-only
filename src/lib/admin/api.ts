"use client";

export const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api/v1" : (process.env.API_URL ? `${process.env.API_URL}/api/v1` : "http://localhost:3000/api/v1"));

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type ApiResponse<T> = { success: boolean; data: T; error?: { code: string; message: string; fieldErrors?: Record<string, string> } };

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${ADMIN_API_BASE}${path}`, { ...init, headers, credentials: "include" });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return json.data;
}

export async function adminGet<T>(path: string) {
  return adminApi<T>(path);
}

export async function adminPost<T>(path: string, body?: unknown) {
  return adminApi<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export async function adminPatch<T>(path: string, body?: unknown) {
  return adminApi<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
}

export async function adminDelete<T>(path: string) {
  return adminApi<T>(path, { method: "DELETE" });
}
