// Tiny browser fetch helper used by client components.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "same-origin",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    // Session no longer valid (logged out, expired, or company/account deleted) →
    // bounce to login with a reason. Don't redirect while on the login page itself.
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const reason = json.code === "ACCOUNT_REMOVED" ? "removed" : "ended";
      window.location.replace(`/login?reason=${reason}`);
    }
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
