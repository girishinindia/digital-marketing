"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, StatusBadge } from "@/components/ui/primitives";

type Post = {
  id: number; title: string | null; body: string | null; hashtags: string | null; mediaUrl: string | null;
  status: string; platformName: string; postTypeName: string; contentTypeName: string | null;
  aiProvider: string | null; scheduledAt: string | null; createdAt: string; authorName: string;
};

const STATUSES = ["draft", "generated", "approved", "scheduled", "published", "archived"];

export default function PostsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Post[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", body: "", hashtags: "", mediaUrl: "", status: "draft", scheduledAt: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Post[]>(`/api/posts${filter ? `?status=${filter}` : ""}`).then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { setRows(null); load(); }, [filter]);

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

  return (
    <div>
      <PageHeader title="Posts" subtitle="Drafts, scheduled and published content"
        action={<select className="select max-w-[180px]" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No posts yet. Generate one in the AI Studio." /> : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="card-pad">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="badge-gray">{p.platformName}</span>
                    <span className="text-xs text-ink-soft">{p.postTypeName}{p.contentTypeName ? ` · ${p.contentTypeName}` : ""}</span>
                    {p.aiProvider && <span className="text-xs text-royal-600">AI: {p.aiProvider}</span>}
                  </div>
                  {p.title && <p className="font-medium text-ink">{p.title}</p>}
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm text-ink-muted">{p.body}</p>
                  {p.hashtags && <p className="mt-1 text-xs text-royal-600">{p.hashtags}</p>}
                  <p className="mt-1 text-xs text-ink-soft">by {p.authorName} · {new Date(p.createdAt).toLocaleString()}{p.scheduledAt ? ` · scheduled ${new Date(p.scheduledAt).toLocaleString()}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-2"><button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(p)}>Delete</button></div>
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
