"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/ui/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/api/auth/login", { email, password });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-royal-600 text-xl text-white">◈</div>
          <h1 className="text-xl font-medium text-ink">{process.env.NEXT_PUBLIC_APP_NAME || "Marketing Suite"}</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to your workspace</p>
        </div>

        <form onSubmit={onSubmit} className="card-pad space-y-4">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <label className="block">
            <span className="label">Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" required placeholder="••••••••" />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-surface-line bg-white/70 px-4 py-3 text-xs text-ink-muted">
          <p className="mb-1 font-medium text-ink">Demo accounts</p>
          <p>Super Admin — girish@growupmore.in / SuperAdmin@123</p>
          <p>Company Admin — rahul@growupmore.in / Password@123</p>
          <p>User — priya@growupmore.in / Password@123</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-ink-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
