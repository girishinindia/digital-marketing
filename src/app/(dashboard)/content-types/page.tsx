"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";

type CT = { id: number; name: string; slug: string; isActive: boolean };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ContentTypesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<CT[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CT | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", isActive: true });
  const [busy, setBusy] = useState(false);

  const load = () => api.get<CT[]>("/api/content-types").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const openNew = () => { setEditing(null); setForm({ name: "", slug: "", isActive: true }); setOpen(true); };
  const openEdit = (c: CT) => { setEditing(c); setForm({ name: c.name, slug: c.slug, isActive: c.isActive }); setOpen(true); };

  async function save() {
    setBusy(true);
    try {
      const payload = { name: form.name, slug: form.slug || slugify(form.name), isActive: form.isActive };
      if (editing) await api.patch(`/api/content-types/${editing.id}`, payload); else await api.post("/api/content-types", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggle = (c: CT) => api.patch(`/api/content-types/${c.id}`, { isActive: !c.isActive }).then(load).catch((e) => toast.error(e.message));
  async function remove(c: CT) { if (!confirm(`Delete ${c.name}?`)) return; try { await api.del(`/api/content-types/${c.id}`); toast.success("Deleted"); load(); } catch (e) { toast.error((e as Error).message); } }

  return (
    <div>
      <PageHeader title="Content Types" subtitle="Formats a post can take (text, image, video…)" action={<button className="btn-primary" onClick={openNew}>+ New content type</button>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No content types yet." /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-royal-50/60"><tr><th className="th">Name</th><th className="th">Slug</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-line">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="td font-medium">{c.name}</td>
                  <td className="td"><code className="text-xs text-royal-600">{c.slug}</code></td>
                  <td className="td"><button onClick={() => toggle(c)} className={c.isActive ? "badge-green" : "badge-gray"}>{c.isActive ? "active" : "inactive"}</button></td>
                  <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(c)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit content type" : "New content type"}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>
    </div>
  );
}
