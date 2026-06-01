"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field } from "@/components/ui/primitives";

type Admin = { id: number; name: string; email: string; phone: string | null; isActive: boolean; companyId: number; companyName: string; lastLoginAt: string | null };
type Company = { id: number; name: string };

export default function AdminsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyId: "", name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);

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
                  <td className="td text-right"><button className="btn-danger btn-sm" onClick={() => remove(a)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New company admin"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={create} disabled={busy || !form.companyId || !form.email || form.password.length < 8}>{busy ? "Creating…" : "Create admin"}</button></>}>
        <div className="space-y-4">
          <Field label="Company"><select className="select" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">Select a company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></Field>
          <Field label="Full name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Temporary password" hint="min 8 characters"><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Phone (optional)"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
