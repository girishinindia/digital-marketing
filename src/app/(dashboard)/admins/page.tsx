"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Admin = { id: number; name: string; email: string; phone: string | null; isActive: boolean; companyId: number; companyName: string; lastLoginAt: string | null };
type Company = { id: number; name: string };

export default function AdminsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Admin | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", password: "", isActive: true });

  const load = () => api.get<Admin[]>("/api/admins").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
    api.get<Company[]>("/api/companies").then((cs) => setCompanies(cs.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, []);

  async function create() {
    setBusy(true);
    try {
      await api.post("/api/admins", { companyId: Number(form.companyId), name: form.name, email: form.email, password: form.password, phone: form.phone || null });
      toast.success("Admin created");
      setOpen(false);
      setForm({ companyId: "", name: "", email: "", password: "", phone: "" });
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function openEdit(a: Admin) {
    setEditing(a);
    setEditForm({ name: a.name, phone: a.phone || "", password: "", isActive: a.isActive });
  }
  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { name: editForm.name, phone: editForm.phone || null, isActive: editForm.isActive };
      if (editForm.password) payload.password = editForm.password;
      await api.patch(`/api/admins/${editing.id}`, payload);
      toast.success("Admin updated");
      setEditing(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(a: Admin) {
    try { await api.patch(`/api/admins/${a.id}`, { isActive: !a.isActive }); load(); } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(a: Admin) {
    if (!confirm(`Remove admin ${a.name}?`)) return;
    try { await api.del(`/api/admins/${a.id}`); toast.success("Admin removed"); load(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Company Admins" subtitle="Assign an administrator to manage each company" action={<button className="btn-primary" onClick={() => setOpen(true)}>+ New admin</button>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No company admins yet." /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-royal-50/60"><tr><th className="th">Admin</th><th className="th">Company</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-line">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="td"><div className="font-medium text-ink">{a.name}</div><div className="text-xs text-ink-muted">{a.email}</div></td>
                  <td className="td">{a.companyName || <span className="text-ink-soft">—</span>}</td>
                  <td className="td"><button onClick={() => toggle(a)} className={a.isActive ? "badge-green" : "badge-gray"}>{a.isActive ? "active" : "inactive"}</button></td>
                  <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(a)}>Remove</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New admin */}
      <Modal open={open} onClose={() => setOpen(false)} title="New company admin"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={create} disabled={busy || !form.companyId || !form.email || form.password.length < 8 || (form.phone.length > 0 && form.phone.length !== 10)}>{busy ? "Creating…" : "Create admin"}</button></>}>
        <div className="space-y-4">
          <Field label="Company"><select className="select" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">Select a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></Field>
          <Field label="Full name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" hint="lowercase only"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().replace(/\s/g, "") })} placeholder="name@example.com" /></Field>
          <Field label="Temporary password" hint="min 8 characters"><PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" /></Field>
          <Field label="Mobile (optional)" hint="exactly 10 digits"><input className="input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9876543210" /></Field>
        </div>
      </Modal>

      {/* Edit admin */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit admin${editing ? ` · ${editing.name}` : ""}`}
        footer={<><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit} disabled={busy || !editForm.name || (editForm.password !== "" && editForm.password.length < 8) || (editForm.phone.length > 0 && editForm.phone.length !== 10)}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <div className="rounded-lg border border-surface-line bg-royal-50/40 px-3 py-2 text-xs text-ink-muted">
            {editing?.email} · {editing?.companyName} <span className="text-ink-soft">(email &amp; company can’t be changed)</span>
          </div>
          <Field label="Full name"><input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
          <Field label="Mobile (optional)" hint="exactly 10 digits"><input className="input" inputMode="numeric" maxLength={10} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9876543210" /></Field>
          <Field label="Reset password (optional)" hint="leave blank to keep current · min 8 characters"><PasswordInput value={editForm.password} onChange={(v) => setEditForm({ ...editForm, password: v })} autoComplete="new-password" placeholder="••••••••" /></Field>
          <div className="flex items-center gap-3"><Toggle checked={editForm.isActive} onChange={(v) => setEditForm({ ...editForm, isActive: v })} /><span className="text-sm text-ink-muted">Account enabled</span></div>
        </div>
      </Modal>
    </div>
  );
}
