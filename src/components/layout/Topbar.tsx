"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  user: "User",
};

export function Topbar({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-line bg-white px-5">
      <div className="text-sm text-ink-muted">
        Welcome back, <span className="font-medium text-ink">{user.name.split(" ")[0]}</span>
      </div>
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-royal-50">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-100 text-xs font-medium text-royal-700">{initials}</span>
          <span className="hidden text-left text-sm leading-tight sm:block">
            <span className="block font-medium text-ink">{user.name}</span>
            <span className="block text-xs text-ink-soft">{ROLE_LABEL[user.roleSlug]}</span>
          </span>
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border border-surface-line bg-white p-1.5 shadow-soft">
            <div className="border-b border-surface-line px-3 py-2 text-xs text-ink-muted">{user.email}</div>
            <button onClick={logout} disabled={busy} className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
