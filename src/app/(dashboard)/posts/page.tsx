"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, StatusBadge } from "@/components/ui/primitives";
import type { AuthUser } from "@/types";

type Post = {
  id: number; title: string | null; body: string | null; hashtags: string | null; mediaUrl: string | null;
  status: string; platformName: string; postTypeName: string; contentTypeName: string | null;
  contentCategoryName: string | null; contentIdeaTitle: string | null;
  aiProvider: string | null; scheduledAt: string | null; createdAt: string; authorName: string;
};

const STATUSES = ["draft", "generated", "approved", "scheduled", "published", "archived"];

export default function PostsPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [rows, setRows] = useState<Post[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", body: "", hashtags: "", mediaUrl: "", status: "draft", scheduledAt: "" });
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [approving, setApproving] = useState(false);

  const isSuper = me?.roleSlug === "super_admin";
  const load = () => {
    if (isSuper && !companyId) return;
    const p = new URLSearchParams();
    if (filter) p.set("status", filter);
    if (isSuper && companyId) p.set("companyId", String(companyId));
    const qs = p.toString();
    api.get<Post[]>(`/api/posts${qs ? `?${qs}` : ""}`).then(setRows).catch((e) => toast.error(e.message));
  };
  useEffect(() => {
    api.get<{ user: AuthUser }>("/api/auth/me").then(({ user }) => {
      setMe(user);
      if (user.roleSlug === "super_admin") {
        api.get<{ id: number; name: string }[]>("/api/companies").then((cs) => {
          setCompanies(cs.map((c) => ({ id: c.id, name: c.name })));
          if (cs[0]) setCompanyId(cs[0].id);
        }).catch(() => {});
      }
    }).catch((e) => toast.error(e.message));
  }, []); // eslint-disable-line
  useEffect(() => { if (me) { setRows(null); load(); } }, [me, filter, companyId]); // eslint-disable-line

  function openEdit(p: Post) {
    setEditing(p);
    setForm({ title: p.title || "", body: p.body || "", hashtags: p.hashtags || "", mediaUrl: p.mediaUrl || "", status: p.status, scheduledAt: p.scheduledAt ? p.scheduledAt.slice(0, 16) : "" });
  }
  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await api.patch(`/api/posts/${editing.id}`, {
        title: form.title || null, body: form.body, hashtags: form.hashtags, mediaUrl: form.mediaUrl || null,
        status: form.status, scheduledAt: form.status === "scheduled" && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      });
      toast.success("Post updated"); setEditing(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function remove(p: Post) { if (!confirm("Delete this post?")) return; try { await api.del(`/api/posts/${p.id}`); toast.success("Deleted"); load(); } catch (e) { toast.error((e as Error).message); } }

  async function approveOne(p: Post) { try { await api.post(`/api/posts/${p.id}/approve`, {}); toast.success("Approved"); load(); } catch (e) { toast.error((e as Error).message); } }
  function toggleSel(id: number) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const pendingIds = (rows || []).filter((p) => p.status === "generated").map((p) => p.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  function toggleAllPending() { setSelected(allPendingSelected ? new Set() : new Set(pendingIds)); }
  async function approveSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    setApproving(true);
    try { const r = await api.post<{ approved: number }>("/api/posts/approve", { ids }); toast.success(`Approved ${r.approved}`); setSelected(new Set()); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setApproving(false); }
  }

  return (
    <div>
      <PageHeader title="Posts" subtitle="Drafts, scheduled and published content"
        action={
          <div className="flex items-center gap-2">
            {isSuper && (
              <select className="select max-w-[180px]" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select className="select max-w-[180px]" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        } />
      {pendingIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-royal-100 bg-royal-50/60 px-3 py-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-ink-muted">
            <input type="checkbox" className="h-4 w-4 accent-royal-600" checked={allPendingSelected} onChange={toggleAllPending} />
            {selected.size > 0 ? `${selected.size} selected` : `${pendingIds.length} awaiting approval`}
          </label>
          <button className="btn-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" onClick={approveSelected} disabled={approving || selected.size === 0}>{approving ? "Approving…" : `✓ Approve selected`}</button>
        </div>
      )}
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No posts here yet." /> : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="card-pad">
              <div className="flex items-start gap-3">
                {p.status === "generated" && <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-royal-600" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} />}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="badge-gray">{p.platformName}</span>
                      {p.contentCategoryName && <span className="badge-royal">{p.contentCategoryName}</span>}
                      <span className="text-xs text-ink-soft">{p.postTypeName}{p.contentTypeName ? ` · ${p.contentTypeName}` : ""}{p.contentIdeaTitle ? ` · 💡 ${p.contentIdeaTitle}` : ""}</span>
                      {p.aiProvider && <span className="text-xs text-royal-600">AI: {p.aiProvider}</span>}
                    </div>
                    {p.title && <p className="font-medium text-ink">{p.title}</p>}
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-ink-muted">{p.body}</p>
                    {p.hashtags && <p className="mt-1 text-xs text-royal-600">{p.hashtags}</p>}
                    <p className="mt-1 text-xs text-ink-soft">by {p.authorName} · {new Date(p.createdAt).toLocaleString()}{p.scheduledAt ? ` · scheduled ${new Date(p.scheduledAt).toLocaleString()}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {p.status === "generated" && <button className="btn-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100" onClick={() => approveOne(p)}>✓ Approve</button>}
                    <button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} wide title="Edit post"
        footer={<><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Title (optional)"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Body"><textarea className="textarea min-h-[160px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Field label="Hashtags"><input className="input" value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status"><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            {form.status === "scheduled" && <Field label="Schedule at"><input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>}
          </div>
          <Field label="Media URL (optional)"><input className="input" value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
