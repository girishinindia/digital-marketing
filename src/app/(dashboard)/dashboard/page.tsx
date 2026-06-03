"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { PageHeader, StatCard, Spinner, StatusBadge } from "@/components/ui/primitives";

type Dash = { role: string; stats: Record<string, number>; recent: any[] };

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<Dash>("/api/dashboard").then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm text-rose-600">{err}</p>;
  if (!data) return <Spinner />;
  const s = data.stats;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your workspace at a glance" />

      {data.role === "super_admin" && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Companies" value={s.companies} hint={`${s.activeCompanies} active`} />
            <StatCard label="Company Admins" value={s.admins} />
            <StatCard label="Users" value={s.users} />
            <StatCard label="Posts" value={s.posts} />
            <StatCard label="Platforms" value={s.platforms} />
            <StatCard label="Post Types" value={s.postTypes} />
            <StatCard label="Content Types" value={s.contentTypes} />
          </div>
          <h2 className="mb-3 mt-8 text-lg font-medium">Recent companies</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-royal-50/60"><tr><th className="th">Company</th><th className="th">Users</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-surface-line">
                {data.recent.map((c) => (
                  <tr key={c.id}><td className="td font-medium">{c.name}</td><td className="td">{c.userCount}</td>
                    <td className="td">{c.isActive ? <span className="badge-green">active</span> : <span className="badge-gray">inactive</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/companies" className="btn-secondary mt-4 inline-flex">Manage companies →</Link>
        </>
      )}

      {data.role === "company_admin" && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Team members" value={s.users} />
            <StatCard label="Active today" value={s.activeUsers} hint="within date window" />
            <StatCard label="Posts" value={s.posts} />
            <StatCard label="Scheduled / published" value={s.publishedOrScheduled} />
          </div>
          <h2 className="mb-3 mt-8 text-lg font-medium">Recent team members</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-royal-50/60"><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-surface-line">
                {data.recent.map((u) => (
                  <tr key={u.id}><td className="td font-medium">{u.name}</td><td className="td">{u.email}</td>
                    <td className="td">{u.effectivelyActive ? <span className="badge-green">active</span> : <span className="badge-amber">inactive</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2"><Link href="/users" className="btn-secondary">Manage team →</Link><Link href="/studio" className="btn-primary">Open AI Studio</Link></div>
        </>
      )}

      {data.role === "user" && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="My posts" value={s.posts} />
            <StatCard label="To publish" value={s.toPublish} hint="approved, ready to post" />
            <StatCard label="Posted" value={s.posted} />
            <StatCard label="Granted post types" value={s.grantedPostTypes} />
          </div>
          <h2 className="mb-3 mt-8 text-lg font-medium">Up next on your schedule</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-royal-50/60"><tr><th className="th">Platform</th><th className="th">Post type</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-surface-line">
                {data.recent.length ? data.recent.map((p) => (
                  <tr key={p.id}><td className="td">{p.platformName}</td><td className="td">{p.postTypeName}</td><td className="td"><StatusBadge status={p.status} /></td></tr>
                )) : <tr><td className="td text-ink-muted" colSpan={3}>Nothing to publish yet — your admin will approve posts for you.</td></tr>}
              </tbody>
            </table>
          </div>
          <Link href="/schedule" className="btn-primary mt-4 inline-flex">Open My Schedule →</Link>
        </>
      )}
    </div>
  );
}
