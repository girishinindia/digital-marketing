"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";

type Platform = { id: number; name: string };
type CT = { id: number; name: string };
type PostType = { id: number; platformId: number; name: string; slug: string; isActive: boolean; contentCount: number };
type Mapping = { id: number; contentTypeId: number; contentTypeName: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function PostTypesPage() {
  const toast = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [contentTypes, setContentTypes] = useState<CT[]>([]);
  const [platformId, setPlatformId] = useState<number | null>(null);
  const [rows, setRows] = useState<PostType[] | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PostType | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", isActive: true });
  const [busy, setBusy] = useState(false);

  const [mapFor, setMapFor] = useState<PostType | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);

  useEffect(() => {
    api.get<Platform[]>("/api/platforms").then((ps) => { setPlatforms(ps); if (ps[0]) setPlatformId(ps[0].id); }).catch((e) => toast.error(e.message));
    api.get<CT[]>("/api/content-types").then(setContentTypes).catch(() => {});
  }, []);

  const load = (pid: number) => api.get<PostType[]>(`/api/post-types?platformId=${pid}`).then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { if (platformId) { setRows(null); load(platformId); } }, [platformId]);

  const openNew = () => { setEditing(null); setForm({ name: "", slug: "", isActive: true }); setOpen(true); };
  const openEdit = (p: PostType) => { setEditing(p); setForm({ name: p.name, slug: p.slug, isActive: p.isActive }); setOpen(true); };

  async function save() {
    if (!platformId) return;
    setBusy(true);
    try {
      const payload = { platformId, name: form.name, slug: form.slug || slugify(form.name), isActive: form.isActive };
      if (editing) await api.patch(`/api/post-types/${editing.id}`, payload); else await api.post("/api/post-types", payload);
      toast.success("Saved"); setOpen(false); load(platformId);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggle = (p: PostType) => api.patch(`/api/post-types/${p.id}`, { isActive: !p.isActive }).then(() => { if (platformId) load(platformId); }).catch((e) => toast.error(e.message));
  async function remove(p: PostType) { if (!confirm(`Delete ${p.name}?`)) return; try { await api.del(`/api/post-types/${p.id}`); toast.success("Deleted"); platformId && load(platformId); } catch (e) { toast.error((e as Error).message); } }

  async function openMap(p: PostType) {
    setMapFor(p);
    const m = await api.get<Mapping[]>(`/api/post-type-content-types?postTypeId=${p.id}`);
    setMappings(m);
  }
  async function toggleMap(ctId: number) {
    if (!mapFor) return;
    const existing = mappings.find((m) => m.contentTypeId === ctId);
    try {
      if (existing) await api.del(`/api/post-type-content-types?id=${existing.id}`);
      else await api.post("/api/post-type-content-types", { postTypeId: mapFor.id, contentTypeId: ctId });
      const m = await api.get<Mapping[]>(`/api/post-type-content-types?postTypeId=${mapFor.id}`);
      setMappings(m);
      if (platformId) load(platformId);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Post Types" subtitle="Per-platform post types and their allowed content" action={<button className="btn-primary" onClick={openNew} disabled={!platformId}>+ New post type</button>} />
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-ink-muted">Platform</span>
        <select className="select max-w-xs" value={platformId ?? ""} onChange={(e) => setPlatformId(Number(e.target.value))}>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No post types for this platform yet." /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-royal-50/60"><tr><th className="th">Post type</th><th className="th">Slug</th><th className="th">Content types</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="td font-medium">{p.name}</td>
                  <td className="td"><code className="text-xs text-royal-600">{p.slug}</code></td>
                  <td className="td"><button className="badge-royal" onClick={() => openMap(p)}>{p.contentCount} types · manage</button></td>
                  <td className="td"><button onClick={() => toggle(p)} className={p.isActive ? "badge-green" : "badge-gray"}>{p.isActive ? "active" : "inactive"}</button></td>
                  <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(p)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit post type" : "New post type"}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>

      <Modal open={!!mapFor} onClose={() => setMapFor(null)} title={`Content types · ${mapFor?.name ?? ""}`}
        footer={<button className="btn-primary" onClick={() => setMapFor(null)}>Done</button>}>
        <p className="mb-3 text-sm text-ink-muted">Tick the content formats this post type supports.</p>
        <div className="grid grid-cols-2 gap-2">
          {contentTypes.map((ct) => {
            const on = mappings.some((m) => m.contentTypeId === ct.id);
            return (
              <label key={ct.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-royal-300 bg-royal-50 text-royal-700" : "border-surface-line text-ink-muted"}`}>
                <input type="checkbox" checked={on} onChange={() => toggleMap(ct.id)} className="accent-royal-600" />
                {ct.name}
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
