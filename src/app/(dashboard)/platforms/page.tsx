"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";

type Platform = { id: number; name: string; slug: string; iconUrl: string | null; isActive: boolean; postTypeCount: number };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function PlatformsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Platform[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", iconUrl: "", isActive: true });
  const [busy, setBusy] = useState(false);

  const load = () => api.get<Platform[]>("/api/platforms").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", slug: "", iconUrl: "", isActive: true }); setOpen(true); };
  const openEdit = (p: Platform) => { setEditing(p); setForm({ name: p.name, slug: p.slug, iconUrl: p.iconUrl || "", isActive: p.isActive }); setOpen(true); };

  async function save() {
    setBusy(true);
    try {
      const payload = { name: form.name, slug: form.slug || slugify(form.name), iconUrl: form.iconUrl || null, isActive: form.isActive };
      if (editing) await api.patch(`/api/platforms/${editing.id}`, payload); else await api.post("/api/platforms", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggle = (p: Platform) => api.patch(`/api/platforms/${p.id}`, { isActive: !p.isActive }).then(load).catch((e) => toast.error(e.message));
  async function remove(p: Platform) { if (!confirm(`Delete ${p.name} and its post types?`)) return; try { await api.del(`/api/platforms/${p.id}`); toast.success("Deleted"); load(); } catch (e) { toast.error((e as Error).message); } }

  return (
    <div>
      <PageHeader title="Social Platforms" subtitle="The global catalog of platforms" action={<button className="btn-primary" onClick={openNew}>+ New platform</button>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No platforms yet." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="card-pad flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-ink">{p.name}</span>{!p.isActive && <span className="badge-gray">off</span>}</div>
                <code className="text-xs text-royal-600">{p.slug}</code>
                <p className="mt-1 text-xs text-ink-muted">{p.postTypeCount} post types</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Toggle checked={p.isActive} onChange={() => toggle(p)} />
                <div className="flex gap-1"><button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button><button className="btn-ghost btn-sm text-rose-600" onClick={() => remove(p)}>Del</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit platform" : "New platform"}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Icon URL (optional)"><input className="input" value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>
    </div>
  );
}
