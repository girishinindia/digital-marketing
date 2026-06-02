"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GrantMatrix } from "@/components/GrantMatrix";
import type { AuthUser } from "@/types";

type User = {
  id: number; name: string; email: string; phone: string | null;
  isActive: boolean; effectivelyActive: boolean;
  activeFrom: string | null; activeTo: string | null; postTypeCount: number; lastLoginAt: string | null;
};
type PostType = { id: number; platformId: number; platformName: string; name: string };
type CT = { id: number; name: string };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function UsersPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [rows, setRows] = useState<User[] | null>(null);
  const [catalog, setCatalog] = useState<PostType[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", isActive: true, activeFrom: "", activeTo: "" });
  const [busy, setBusy] = useState(false);
  const [grantUser, setGrantUser] = useState<User | null>(null);
  const [companyEntity, setCompanyEntity] = useState<{ id: number; name: string } | null>(null);

  const isSuper = me?.roleSlug === "super_admin";
  const scopeQS = isSuper && companyId ? `?companyId=${companyId}` : "";

  const effCompanyId = isSuper ? companyId : me?.companyId ?? null;
  const load = () => {
    if (isSuper && !companyId) return;
    api.get<User[]>(`/api/users${scopeQS}`).then(setRows).catch((e) => toast.error(e.message));
    api.get<{ id: number; name: string; isCompany: boolean }[]>(`/api/posting-entities${scopeQS}`)
      .then((es) => setCompanyEntity(es.find((e) => e.isCompany) ?? null)).catch(() => {});
    // Grant editor catalog = only what this company is ENTITLED to (not the full catalog).
    if (effCompanyId) api.get<PostType[]>(`/api/companies/${effCompanyId}/entitled-catalog`).then(setCatalog).catch(() => {});
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
  useEffect(() => { if (me) { setRows(null); load(); } }, [me, companyId]); // eslint-disable-line

  function openNew() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", phone: "", isActive: true, activeFrom: "", activeTo: "" });
    setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone || "", isActive: u.isActive, activeFrom: u.activeFrom?.slice(0, 10) || "", activeTo: u.activeTo?.slice(0, 10) || "" });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const base = { name: form.name, phone: form.phone || null, isActive: form.isActive, activeFrom: form.activeFrom || null, activeTo: form.activeTo || null };
      if (editing) {
        await api.patch(`/api/users/${editing.id}`, { ...base, ...(form.password ? { password: form.password } : {}) });
      } else {
        await api.post("/api/users", { ...base, email: form.email, password: form.password, ...(isSuper && companyId ? { companyId } : {}) });
      }
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggle = (u: User) => api.patch(`/api/users/${u.id}`, { isActive: !u.isActive }).then(load).catch((e) => toast.error(e.message));
  async function remove(u: User) { if (!confirm(`Remove ${u.name}?`)) return; try { await api.del(`/api/users/${u.id}`); toast.success("Removed"); load(); } catch (e) { toast.error((e as Error).message); } }

  return (
    <div>
      <PageHeader title="Team" subtitle={isSuper ? "Manage any company's users" : "People in your company who create content"} action={<button className="btn-primary" onClick={openNew} disabled={isSuper && !companyId}>+ Add user</button>} />
      {isSuper && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-ink-muted">Company</span>
          <select className="select max-w-xs" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      {companyEntity && (
        <div className="card-pad mb-4 flex items-center justify-between border-l-4 border-royal-500">
          <div>
            <div className="font-medium text-ink">🏢 {companyEntity.name}</div>
            <div className="text-xs text-ink-muted">The company&apos;s own posting profile — set its platforms &amp; types (broad/official channels) here</div>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setGrantUser({ id: companyEntity.id, name: companyEntity.name } as unknown as User)}>Grants</button>
        </div>
      )}
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No employees yet. Add your first team member." /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-royal-50/60"><tr><th className="th">User</th><th className="th">Access window</th><th className="th">Grants</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-line">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="td"><div className="font-medium text-ink">{u.name}</div><div className="text-xs text-ink-muted">{u.email}</div></td>
                  <td className="td text-xs">{fmt(u.activeFrom)} → {fmt(u.activeTo)}</td>
                  <td className="td"><button className="badge-royal" onClick={() => setGrantUser(u)}>{u.postTypeCount} post types</button></td>
                  <td className="td">
                    {u.effectivelyActive ? <span className="badge-green">active</span> : <span className="badge-amber" title="Off, or outside the date window">inactive</span>}
                    <button onClick={() => toggle(u)} className="ml-2 text-xs text-royal-600 underline">{u.isActive ? "disable" : "enable"}</button>
                  </td>
                  <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(u)}>Remove</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit user" : "Add user"}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !form.name || (!editing && (!form.email || form.password.length < 8)) || (form.phone.length > 0 && form.phone.length !== 10)}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Full name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          {!editing && <Field label="Email" hint="lowercase only"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().replace(/\s/g, "") })} placeholder="name@example.com" /></Field>}
          <Field label={editing ? "Reset password (optional)" : "Temporary password"} hint="min 8 characters"><PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" placeholder="••••••••" /></Field>
          <Field label="Mobile (optional)" hint="exactly 10 digits"><input className="input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9876543210" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Active from" hint="leave blank = immediately"><input className="input" type="date" value={form.activeFrom} onChange={(e) => setForm({ ...form, activeFrom: e.target.value })} /></Field>
            <Field label="Active to" hint="leave blank = no expiry"><input className="input" type="date" value={form.activeTo} onChange={(e) => setForm({ ...form, activeTo: e.target.value })} /></Field>
          </div>
          <div className="flex items-center gap-3"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /><span className="text-sm text-ink-muted">Account enabled</span></div>
        </div>
      </Modal>

      {grantUser && (
        <GrantMatrix
          title={`Grants · ${grantUser.name}`}
          helpText="Choose which post types this entity can use — only the company's entitled items appear. Expand a checked post type to fine-tune its content formats."
          catalog={catalog}
          loadInitial={() => api.get(`/api/users/${grantUser.id}/grants`)}
          loadContentTypes={(pt) => api.get<{ contentTypeId: number; contentTypeName: string }[]>(`/api/post-type-content-types?postTypeId=${pt}${effCompanyId ? `&companyId=${effCompanyId}` : ""}`).then((m) => m.map((x) => ({ id: x.contentTypeId, name: x.contentTypeName })))}
          onSave={(p) => api.post(`/api/users/${grantUser.id}/grants`, p)}
          onClose={(changed) => { setGrantUser(null); if (changed) load(); }}
        />
      )}
    </div>
  );
}

