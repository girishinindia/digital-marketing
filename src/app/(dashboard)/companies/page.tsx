"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";
import { GrantMatrix } from "@/components/GrantMatrix";

type Company = { id: number; name: string; slug: string; legalName: string | null; website: string | null; isActive: boolean; userCount: number };
type PostType = { id: number; platformId: number; platformName: string; name: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CompaniesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Company[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", legalName: "", website: "", isActive: true });
  const [busy, setBusy] = useState(false);
  const [entitleCompany, setEntitleCompany] = useState<Company | null>(null);
  const [fullCatalog, setFullCatalog] = useState<PostType[]>([]);

  const load = () => api.get<Company[]>("/api/companies").then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); api.get<PostType[]>("/api/post-types").then(setFullCatalog).catch(() => {}); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", slug: "", legalName: "", website: "", isActive: true });
    setOpen(true);
  }
  function openEdit(c: Company) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, legalName: c.legalName || "", website: c.website || "", isActive: c.isActive });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { name: form.name, slug: form.slug || slugify(form.name), legalName: form.legalName || null, website: form.website || null, isActive: form.isActive };
      if (editing) await api.patch(`/api/companies/${editing.id}`, payload);
      else await api.post("/api/companies", payload);
      toast.success(editing ? "Company updated" : "Company created");
      setOpen(false);
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(c: Company) {
    try { await api.patch(`/api/companies/${c.id}`, { isActive: !c.isActive }); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function remove(c: Company) {
    if (!confirm(`Delete "${c.name}" and all its users/posts? This cannot be undone.`)) return;
    try { await api.del(`/api/companies/${c.id}`); toast.success("Company deleted"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Companies" subtitle="Tenants on the platform" action={<button className="btn-primary" onClick={openNew}>+ New company</button>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty label="No companies yet. Create your first one." /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-royal-50/60"><tr><th className="th">Company</th><th className="th">Slug</th><th className="th">Users</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-line">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="td"><div className="font-medium text-ink">{c.name}</div>{c.website && <a href={c.website} className="text-xs text-royal-600" target="_blank">{c.website}</a>}</td>
                  <td className="td"><code className="rounded bg-royal-50 px-1.5 py-0.5 text-xs text-royal-700">{c.slug}</code></td>
                  <td className="td">{c.userCount}</td>
                  <td className="td"><button onClick={() => toggle(c)} className={c.isActive ? "badge-green" : "badge-gray"}>{c.isActive ? "active" : "inactive"}</button></td>
                  <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => setEntitleCompany(c)}>Grants</button><button className="btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(c)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit company" : "New company"}
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Company name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug" hint="lowercase, used in URLs"><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Legal name (optional)"><input className="input" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></Field>
          <Field label="Website (optional)"><input className="input" placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>

      {entitleCompany && (
        <GrantMatrix
          title={`Entitlement · ${entitleCompany.name}`}
          helpText="Choose everything this company is allowed to use. Company Admins can only assign to users/the company account from within this set. Removing items here also revokes them from any user that had them."
          catalog={fullCatalog}
          loadInitial={() => api.get(`/api/companies/${entitleCompany.id}/entitlements`)}
          loadContentTypes={(pt) => api.get<{ contentTypeId: number; contentTypeName: string }[]>(`/api/post-type-content-types?postTypeId=${pt}`).then((m) => m.map((x) => ({ id: x.contentTypeId, name: x.contentTypeName })))}
          onSave={(p) => api.post(`/api/companies/${entitleCompany.id}/entitlements`, p)}
          onClose={() => setEntitleCompany(null)}
        />
      )}
    </div>
  );
}
