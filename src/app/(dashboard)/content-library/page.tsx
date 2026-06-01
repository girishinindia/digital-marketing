"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field, Toggle } from "@/components/ui/primitives";
import type { AuthUser } from "@/types";

type Category = { id: number; name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean; ideaCount: number };
type Detail = {
  id: number; categoryId: number; categoryName: string; title: string; slug: string; description: string | null;
  defaultPrompt: string | null; suggestedContentTypeId: number | null; suggestedFormatName: string | null; isActive: boolean;
};
type Format = { id: number; name: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);

export default function ContentLibraryPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [formats, setFormats] = useState<Format[]>([]);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [details, setDetails] = useState<Detail[] | null>(null);
  const [activeCat, setActiveCat] = useState<number | "all">("all");

  const [catModal, setCatModal] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "", isActive: true });

  const [ideaModal, setIdeaModal] = useState(false);
  const [ideaEdit, setIdeaEdit] = useState<Detail | null>(null);
  const [ideaForm, setIdeaForm] = useState({ categoryId: 0, title: "", slug: "", description: "", suggestedContentTypeId: "", defaultPrompt: "", isActive: true });
  const [busy, setBusy] = useState(false);

  const isSuper = me?.roleSlug === "super_admin";
  const cidQS = useCallback((extra?: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (isSuper && companyId) p.set("companyId", String(companyId));
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [isSuper, companyId]);

  // bootstrap
  useEffect(() => {
    api.get<{ user: AuthUser }>("/api/auth/me").then(({ user }) => {
      setMe(user);
      if (user.roleSlug === "super_admin") {
        api.get<{ id: number; name: string }[]>("/api/companies").then((cs) => {
          setCompanies(cs.map((c) => ({ id: c.id, name: c.name })));
          if (cs[0]) setCompanyId(cs[0].id);
        });
      }
    }).catch((e) => toast.error(e.message));
    api.get<Format[]>("/api/content-types").then((f) => setFormats(f.map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
  }, []); // eslint-disable-line

  const loadCategories = useCallback(() => {
    if (isSuper && !companyId) return;
    api.get<Category[]>(`/api/content-categories${cidQS()}`).then(setCategories).catch((e) => toast.error(e.message));
  }, [cidQS, isSuper, companyId]); // eslint-disable-line
  const loadDetails = useCallback(() => {
    if (isSuper && !companyId) return;
    const qs = activeCat === "all" ? cidQS() : cidQS({ categoryId: activeCat });
    api.get<Detail[]>(`/api/content-details${qs}`).then(setDetails).catch((e) => toast.error(e.message));
  }, [cidQS, activeCat, isSuper, companyId]); // eslint-disable-line

  useEffect(() => { if (me) { setCategories(null); loadCategories(); } }, [me, companyId, loadCategories]);
  useEffect(() => { if (me) { setDetails(null); loadDetails(); } }, [me, companyId, activeCat, loadDetails]);

  // category actions
  function openNewCat() { setCatEdit(null); setCatForm({ name: "", slug: "", description: "", isActive: true }); setCatModal(true); }
  function openEditCat(c: Category) { setCatEdit(c); setCatForm({ name: c.name, slug: c.slug, description: c.description || "", isActive: c.isActive }); setCatModal(true); }
  async function saveCat() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { name: catForm.name, slug: catForm.slug || slugify(catForm.name), description: catForm.description || null, isActive: catForm.isActive };
      if (isSuper && companyId) payload.companyId = companyId;
      if (catEdit) await api.patch(`/api/content-categories/${catEdit.id}`, payload);
      else await api.post("/api/content-categories", payload);
      toast.success("Saved"); setCatModal(false); loadCategories(); loadDetails();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggleCat = (c: Category) => api.patch(`/api/content-categories/${c.id}`, { isActive: !c.isActive }).then(loadCategories).catch((e) => toast.error(e.message));
  async function removeCat(c: Category) {
    if (!confirm(`Delete category "${c.name}" and its ${c.ideaCount} ideas?`)) return;
    try { await api.del(`/api/content-categories/${c.id}`); toast.success("Deleted"); if (activeCat === c.id) setActiveCat("all"); loadCategories(); loadDetails(); }
    catch (e) { toast.error((e as Error).message); }
  }

  // idea actions
  function openNewIdea() {
    const firstCat = categories?.[0]?.id ?? 0;
    setIdeaEdit(null);
    setIdeaForm({ categoryId: activeCat === "all" ? firstCat : activeCat, title: "", slug: "", description: "", suggestedContentTypeId: "", defaultPrompt: "", isActive: true });
    setIdeaModal(true);
  }
  function openEditIdea(d: Detail) {
    setIdeaEdit(d);
    setIdeaForm({ categoryId: d.categoryId, title: d.title, slug: d.slug, description: d.description || "", suggestedContentTypeId: d.suggestedContentTypeId ? String(d.suggestedContentTypeId) : "", defaultPrompt: d.defaultPrompt || "", isActive: d.isActive });
    setIdeaModal(true);
  }
  async function saveIdea() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        categoryId: Number(ideaForm.categoryId), title: ideaForm.title, slug: ideaForm.slug || slugify(ideaForm.title),
        description: ideaForm.description || null, defaultPrompt: ideaForm.defaultPrompt || null,
        suggestedContentTypeId: ideaForm.suggestedContentTypeId ? Number(ideaForm.suggestedContentTypeId) : null, isActive: ideaForm.isActive,
      };
      if (isSuper && companyId) payload.companyId = companyId;
      if (ideaEdit) await api.patch(`/api/content-details/${ideaEdit.id}`, payload);
      else await api.post("/api/content-details", payload);
      toast.success("Saved"); setIdeaModal(false); loadDetails(); loadCategories();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggleIdea = (d: Detail) => api.patch(`/api/content-details/${d.id}`, { isActive: !d.isActive }).then(loadDetails).catch((e) => toast.error(e.message));
  async function removeIdea(d: Detail) {
    if (!confirm(`Delete idea "${d.title}"?`)) return;
    try { await api.del(`/api/content-details/${d.id}`); toast.success("Deleted"); loadDetails(); loadCategories(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const totalIdeas = useMemo(() => categories?.reduce((s, c) => s + c.ideaCount, 0) ?? 0, [categories]);

  return (
    <div>
      <PageHeader title="Content Library" subtitle={`Per-company content categories & ideas${categories ? ` · ${totalIdeas} ideas` : ""}`}
        action={<div className="flex gap-2"><button className="btn-secondary" onClick={openNewCat}>+ Category</button><button className="btn-primary" onClick={openNewIdea} disabled={!categories?.length}>+ Idea</button></div>} />

      {isSuper && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-ink-muted">Company</span>
          <select className="select max-w-xs" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Categories pane */}
        <div className="card p-3">
          <button onClick={() => setActiveCat("all")} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${activeCat === "all" ? "bg-royal-50 font-medium text-royal-700" : "text-ink-muted hover:bg-royal-50/60"}`}>
            <span>All ideas</span><span className="badge-gray">{totalIdeas}</span>
          </button>
          {!categories ? <Spinner /> : categories.length === 0 ? <Empty label="No categories yet." /> : categories.map((c) => (
            <div key={c.id} className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${activeCat === c.id ? "bg-royal-50" : "hover:bg-royal-50/60"}`}>
              <button onClick={() => setActiveCat(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className={`truncate ${c.isActive ? "text-ink" : "text-ink-soft line-through"} ${activeCat === c.id ? "font-medium text-royal-700" : ""}`}>{c.name}</span>
              </button>
              <span className="flex items-center gap-1">
                <span className="badge-royal">{c.ideaCount}</span>
                <button onClick={() => openEditCat(c)} className="hidden text-xs text-ink-soft hover:text-royal-700 group-hover:inline">✎</button>
                <button onClick={() => removeCat(c)} className="hidden text-xs text-ink-soft hover:text-rose-600 group-hover:inline">🗑</button>
              </span>
            </div>
          ))}
        </div>

        {/* Ideas pane */}
        <div>
          {!details ? <Spinner /> : details.length === 0 ? <Empty label="No ideas here yet. Add one with “+ Idea”." /> : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-royal-50/60"><tr><th className="th">Idea</th><th className="th">Category</th><th className="th">Format</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-surface-line">
                  {details.map((d) => (
                    <tr key={d.id}>
                      <td className="td"><div className="font-medium text-ink">{d.title}</div>{d.description && <div className="max-w-md truncate text-xs text-ink-soft">{d.description}</div>}</td>
                      <td className="td text-ink-muted">{d.categoryName}</td>
                      <td className="td">{d.suggestedFormatName ? <span className="badge-green">{d.suggestedFormatName}</span> : <span className="text-ink-soft">—</span>}</td>
                      <td className="td"><button onClick={() => toggleIdea(d)} className={d.isActive ? "badge-green" : "badge-gray"}>{d.isActive ? "active" : "off"}</button></td>
                      <td className="td"><div className="flex justify-end gap-2"><button className="btn-secondary btn-sm" onClick={() => openEditIdea(d)}>Edit</button><button className="btn-danger btn-sm" onClick={() => removeIdea(d)}>Del</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Category modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={catEdit ? "Edit category" : "New category"}
        footer={<><button className="btn-ghost" onClick={() => setCatModal(false)}>Cancel</button><button className="btn-primary" onClick={saveCat} disabled={busy || !catForm.name}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value, slug: catEdit ? catForm.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug"><input className="input" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} /></Field>
          <Field label="Description (optional)"><input className="input" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={catForm.isActive} onChange={(v) => setCatForm({ ...catForm, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>

      {/* Idea modal */}
      <Modal open={ideaModal} onClose={() => setIdeaModal(false)} wide title={ideaEdit ? "Edit idea" : "New idea"}
        footer={<><button className="btn-ghost" onClick={() => setIdeaModal(false)}>Cancel</button><button className="btn-primary" onClick={saveIdea} disabled={busy || !ideaForm.title || !ideaForm.categoryId}>{busy ? "Saving…" : "Save"}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><select className="select" value={ideaForm.categoryId} onChange={(e) => setIdeaForm({ ...ideaForm, categoryId: Number(e.target.value) })}>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Suggested format"><select className="select" value={ideaForm.suggestedContentTypeId} onChange={(e) => setIdeaForm({ ...ideaForm, suggestedContentTypeId: e.target.value })}><option value="">— none —</option>{formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
          </div>
          <Field label="Title"><input className="input" value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value, slug: ideaEdit ? ideaForm.slug : slugify(e.target.value) })} /></Field>
          <Field label="Description (optional)"><input className="input" value={ideaForm.description} onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })} /></Field>
          <Field label="Default AI prompt (optional)" hint="Used to prefill the AI Studio when this idea is picked"><textarea className="textarea min-h-[90px]" value={ideaForm.defaultPrompt} onChange={(e) => setIdeaForm({ ...ideaForm, defaultPrompt: e.target.value })} /></Field>
          <div className="flex items-center gap-3"><Toggle checked={ideaForm.isActive} onChange={(v) => setIdeaForm({ ...ideaForm, isActive: v })} /><span className="text-sm text-ink-muted">Active</span></div>
        </div>
      </Modal>
    </div>
  );
}
