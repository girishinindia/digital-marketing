"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";
import { PasswordInput } from "@/components/ui/PasswordInput";
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

  const isSuper = me?.roleSlug === "super_admin";
  const scopeQS = isSuper && companyId ? `?companyId=${companyId}` : "";

  const load = () => {
    if (isSuper && !companyId) return;
    api.get<User[]>(`/api/users${scopeQS}`).then(setRows).catch((e) => toast.error(e.message));
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
    api.get<PostType[]>("/api/post-types").then(setCatalog).catch(() => {});
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
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No users yet. Add your first team member." /> : (
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

      {grantUser && <GrantsEditor user={grantUser} catalog={catalog} onClose={(changed) => { setGrantUser(null); if (changed) load(); }} />}
    </div>
  );
}

function GrantsEditor({ user, catalog, onClose }: { user: User; catalog: PostType[]; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [contentByPt, setContentByPt] = useState<Record<number, { allowed: CT[]; selected: Set<number> }>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, PostType[]>();
    catalog.forEach((p) => { (m.get(p.platformName) ?? m.set(p.platformName, []).get(p.platformName)!).push(p); });
    return [...m.entries()];
  }, [catalog]);

  useEffect(() => {
    api.get<{ postTypeIds: number[]; contentTypeIdsByPostType: Record<string, number[]> }>(`/api/users/${user.id}/grants`).then((g) => {
      setSelected(new Set(g.postTypeIds));
      const cbp: Record<number, { allowed: CT[]; selected: Set<number> }> = {};
      for (const [pt, ids] of Object.entries(g.contentTypeIdsByPostType)) cbp[Number(pt)] = { allowed: [], selected: new Set(ids) };
      setContentByPt(cbp);
      setLoaded(true);
    }).catch((e) => { toast.error(e.message); setLoaded(true); });
  }, [user.id]);

  async function ensureContent(ptId: number) {
    if (contentByPt[ptId]?.allowed.length) return;
    const m = await api.get<{ contentTypeId: number; contentTypeName: string }[]>(`/api/post-type-content-types?postTypeId=${ptId}`);
    const allowed = m.map((x) => ({ id: x.contentTypeId, name: x.contentTypeName }));
    setContentByPt((prev) => {
      const cur = prev[ptId];
      const sel = cur?.selected ?? new Set(allowed.map((a) => a.id)); // default: all
      return { ...prev, [ptId]: { allowed, selected: sel } };
    });
  }
  async function togglePt(ptId: number) {
    const next = new Set(selected);
    if (next.has(ptId)) { next.delete(ptId); }
    else { next.add(ptId); await ensureContent(ptId); }
    setSelected(next);
  }
  async function toggleExpand(ptId: number) {
    const n = new Set(expanded);
    if (n.has(ptId)) n.delete(ptId); else { n.add(ptId); await ensureContent(ptId); }
    setExpanded(n);
  }
  function toggleContent(ptId: number, ctId: number) {
    setContentByPt((prev) => {
      const cur = prev[ptId]; if (!cur) return prev;
      const sel = new Set(cur.selected);
      sel.has(ctId) ? sel.delete(ctId) : sel.add(ctId);
      return { ...prev, [ptId]: { ...cur, selected: sel } };
    });
  }

  async function save() {
    setBusy(true);
    try {
      const postTypeIds = [...selected];
      const contentTypeIdsByPostType: Record<string, number[]> = {};
      for (const pt of postTypeIds) {
        const c = contentByPt[pt];
        if (c && c.selected.size) contentTypeIdsByPostType[String(pt)] = [...c.selected];
      }
      await api.post(`/api/users/${user.id}/grants`, { postTypeIds, contentTypeIdsByPostType });
      toast.success("Grants updated");
      onClose(true);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={() => onClose(false)} wide title={`Grants · ${user.name}`}
      footer={<><button className="btn-ghost" onClick={() => onClose(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !loaded}>{busy ? "Saving…" : "Save grants"}</button></>}>
      {!loaded ? <Spinner /> : (
        <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
          <p className="text-sm text-ink-muted">Choose which post types this user can create. Expand a checked post type to fine-tune its content formats.</p>
          {groups.map(([platform, pts]) => (
            <div key={platform}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{platform}</p>
              <div className="space-y-1.5">
                {pts.map((pt) => {
                  const on = selected.has(pt.id);
                  const content = contentByPt[pt.id];
                  return (
                    <div key={pt.id} className={`rounded-lg border px-3 py-2 ${on ? "border-royal-200 bg-royal-50/50" : "border-surface-line"}`}>
                      <div className="flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="checkbox" className="accent-royal-600" checked={on} onChange={() => togglePt(pt.id)} />
                          <span className={on ? "font-medium text-royal-800" : "text-ink"}>{pt.name}</span>
                        </label>
                        {on && <button className="text-xs text-royal-600 underline" onClick={() => toggleExpand(pt.id)}>{expanded.has(pt.id) ? "hide" : "content types"}</button>}
                      </div>
                      {on && expanded.has(pt.id) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-royal-100 pt-2">
                          {(content?.allowed ?? []).map((ct) => {
                            const csel = content?.selected.has(ct.id);
                            return (
                              <button key={ct.id} onClick={() => toggleContent(pt.id, ct.id)} className={`rounded-full px-2.5 py-0.5 text-xs ${csel ? "bg-royal-600 text-white" : "bg-white text-ink-muted ring-1 ring-surface-line"}`}>{ct.name}</button>
                            );
                          })}
                          {!content?.allowed.length && <span className="text-xs text-ink-soft">No content types mapped.</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
