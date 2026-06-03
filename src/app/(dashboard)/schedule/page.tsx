"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner, Empty, StatusBadge } from "@/components/ui/primitives";
import type { AuthUser } from "@/types";

type Post = {
  id: number; title: string | null; body: string | null; hashtags: string | null; mediaUrl: string | null;
  status: string; platformName: string; postTypeName: string; contentTypeName: string | null;
  ideaTitle: string | null; authorName: string; scheduledAt: string | null; publishedAt: string | null;
};

const dayKey = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : "Unscheduled");
const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

export default function SchedulePage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [rows, setRows] = useState<Post[] | null>(null);

  const isSuper = me?.roleSlug === "super_admin";
  const isUser = me?.roleSlug === "user";

  useEffect(() => {
    api.get<{ user: AuthUser }>("/api/auth/me").then(({ user }) => {
      setMe(user);
      if (user.roleSlug === "super_admin") {
        api.get<{ id: number; name: string }[]>("/api/companies").then((cs) => { setCompanies(cs.map((c) => ({ id: c.id, name: c.name }))); if (cs[0]) setCompanyId(cs[0].id); }).catch(() => {});
      }
    }).catch((e) => toast.error(e.message));
  }, []); // eslint-disable-line

  const load = () => {
    if (isSuper && !companyId) return;
    api.get<Post[]>(`/api/schedule${isSuper && companyId ? `?companyId=${companyId}` : ""}`).then(setRows).catch((e) => toast.error(e.message));
  };
  useEffect(() => { if (me) { setRows(null); load(); } }, [me, companyId]); // eslint-disable-line

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); }
    catch { toast.error("Copy failed — select and copy manually"); }
  }
  async function markPosted(p: Post) {
    try { await api.post(`/api/posts/${p.id}/mark-posted`, {}); toast.success("Marked as posted"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const groups = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, Post[]>();
    rows.forEach((p) => { const k = dayKey(p.scheduledAt); (m.get(k) ?? m.set(k, []).get(k)!).push(p); });
    return [...m.entries()];
  }, [rows]);

  return (
    <div>
      <PageHeader title="My Schedule" subtitle={isUser ? "Your approved posts — copy and publish to your socials" : "Approved posts ready to publish"}
        action={isSuper ? (
          <select className="select max-w-xs" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : undefined} />

      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="Nothing scheduled yet. Your admin will approve posts for you to publish." /> : (
        <div className="space-y-6">
          {groups.map(([day, posts]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-medium text-ink-muted">{day}</h2>
              <div className="space-y-3">
                {posts.map((p) => (
                  <div key={p.id} className="card-pad">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="badge-royal">{p.platformName}</span>
                      <span className="text-xs text-ink-soft">{p.postTypeName}{p.contentTypeName ? ` · ${p.contentTypeName}` : ""}</span>
                      {p.scheduledAt && <span className="text-xs text-amber-700">{timeOf(p.scheduledAt)}</span>}
                      <StatusBadge status={p.status} />
                      {!isUser && <span className="text-xs text-ink-soft">· {p.authorName}</span>}
                    </div>
                    {p.title && <p className="font-medium text-ink">{p.title}</p>}
                    <p className="whitespace-pre-wrap text-sm text-ink">{p.body}</p>
                    {p.hashtags && <p className="mt-1 text-xs text-royal-600">{p.hashtags}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-primary btn-sm" onClick={() => copy([p.body, p.hashtags].filter(Boolean).join("\n\n"), "Post")}>Copy text + #</button>
                      <button className="btn-secondary btn-sm" onClick={() => copy(p.body || "", "Text")}>Copy text</button>
                      {p.hashtags && <button className="btn-secondary btn-sm" onClick={() => copy(p.hashtags || "", "Hashtags")}>Copy #</button>}
                      {p.mediaUrl && <a className="btn-secondary btn-sm" href={p.mediaUrl} target="_blank" rel="noreferrer" download>⬇ Media</a>}
                      {p.status !== "published" ? (
                        <button className="btn-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100" onClick={() => markPosted(p)}>✓ Mark posted</button>
                      ) : (
                        <span className="badge-green">posted{p.publishedAt ? ` · ${new Date(p.publishedAt).toLocaleDateString()}` : ""}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
