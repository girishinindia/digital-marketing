"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PageHeader, Spinner, Empty, Field } from "@/components/ui/primitives";
import type { AuthUser } from "@/types";

type Entity = { id: number; name: string; isCompany: boolean; postTypeCount: number };
type Slot = {
  id: number; postingUserId: number; entityName: string; isCompany: boolean;
  platformId: number; platformName: string; postTypeId: number; postTypeName: string;
  contentTypeId: number | null; contentTypeName: string | null;
  contentDetailId: number | null; ideaTitle: string | null;
  slotDate: string; plannedTime: string | null; notes: string | null; status: string; postId: number | null;
};
type Options = {
  platforms: { id: number; name: string }[];
  postTypes: { id: number; name: string; platformId: number; platformName: string }[];
  contentTypesByPostType: Record<string, { id: number; name: string; slug: string }[]>;
};
type Idea = { id: number; categoryName: string; title: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const mondayOf = (d: Date) => { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; };
const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const statusClass = (st: string) => st === "planned" ? "badge-amber" : st === "generated" ? "badge-royal" : (st === "published" || st === "approved") ? "badge-green" : "badge-gray";

export default function CalendarPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<string>(ymd(mondayOf(new Date())));
  const [calendarId, setCalendarId] = useState<number | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const [slotModal, setSlotModal] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [form, setForm] = useState({ postingUserId: 0, slotDate: "", platformId: "", postTypeId: "", contentTypeId: "", contentDetailId: "", plannedTime: "", notes: "" });
  const [entOptions, setEntOptions] = useState<Options | null>(null);

  const isSuper = me?.roleSlug === "super_admin";
  const cidParam = isSuper && companyId ? `?companyId=${companyId}` : "";

  useEffect(() => {
    api.get<{ user: AuthUser }>("/api/auth/me").then(({ user }) => {
      setMe(user);
      if (user.roleSlug === "super_admin") {
        api.get<{ id: number; name: string }[]>("/api/companies").then((cs) => { setCompanies(cs.map((c) => ({ id: c.id, name: c.name }))); if (cs[0]) setCompanyId(cs[0].id); }).catch(() => {});
      }
    }).catch((e) => toast.error(e.message));
  }, []); // eslint-disable-line

  const loadWeek = useCallback(async () => {
    if (isSuper && !companyId) return;
    setSlots(null);
    try {
      const cal = await api.post<{ id: number }>("/api/calendars", { weekStart, ...(isSuper && companyId ? { companyId } : {}) });
      setCalendarId(cal.id);
      const data = await api.get<{ slots: Slot[] }>(`/api/calendars/${cal.id}`);
      setSlots(data.slots);
    } catch (e) { toast.error((e as Error).message); setSlots([]); }
  }, [weekStart, companyId, isSuper]); // eslint-disable-line

  useEffect(() => {
    if (!me || (isSuper && !companyId)) return;
    api.get<Entity[]>(`/api/posting-entities${cidParam}`).then(setEntities).catch(() => {});
    api.get<Idea[]>(`/api/content-details${cidParam}`).then((d) => setIdeas(d)).catch(() => {});
    loadWeek();
  }, [me, companyId, weekStart]); // eslint-disable-line

  async function openNew(entityId: number, date: string) {
    setEditing(null);
    setForm({ postingUserId: entityId, slotDate: date, platformId: "", postTypeId: "", contentTypeId: "", contentDetailId: "", plannedTime: "", notes: "" });
    setEntOptions(null); setSlotModal(true);
    setEntOptions(await api.get<Options>(`/api/posting-entities/${entityId}/options`).catch(() => null));
  }
  async function openEdit(s: Slot) {
    setEditing(s);
    setForm({ postingUserId: s.postingUserId, slotDate: s.slotDate.slice(0, 10), platformId: String(s.platformId), postTypeId: String(s.postTypeId), contentTypeId: s.contentTypeId ? String(s.contentTypeId) : "", contentDetailId: s.contentDetailId ? String(s.contentDetailId) : "", plannedTime: s.plannedTime || "", notes: s.notes || "" });
    setEntOptions(null); setSlotModal(true);
    setEntOptions(await api.get<Options>(`/api/posting-entities/${s.postingUserId}/options`).catch(() => null));
  }

  const ptForPlatform = useMemo(() => (entOptions && form.platformId ? entOptions.postTypes.filter((p) => p.platformId === Number(form.platformId)) : []), [entOptions, form.platformId]);
  const ctForPostType = useMemo(() => (entOptions && form.postTypeId ? entOptions.contentTypesByPostType[form.postTypeId] || [] : []), [entOptions, form.postTypeId]);

  async function saveSlot() {
    if (!calendarId || !form.platformId || !form.postTypeId) { toast.error("Pick a platform and post type."); return; }
    setBusy(true);
    try {
      const payload = { platformId: Number(form.platformId), postTypeId: Number(form.postTypeId), contentTypeId: form.contentTypeId ? Number(form.contentTypeId) : null, contentDetailId: form.contentDetailId ? Number(form.contentDetailId) : null, slotDate: form.slotDate, plannedTime: form.plannedTime || null, notes: form.notes || null };
      if (editing) await api.patch(`/api/calendar-slots/${editing.id}`, payload);
      else await api.post("/api/calendar-slots", { calendarId, postingUserId: form.postingUserId, ...payload });
      toast.success("Saved"); setSlotModal(false); loadWeek();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function genSlot(s: Slot) { setBusy(true); try { await api.post(`/api/calendar-slots/${s.id}/generate`, {}); toast.success("Generated"); setSlotModal(false); loadWeek(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }
  async function delSlot(s: Slot) { if (!confirm("Delete this slot?")) return; try { await api.del(`/api/calendar-slots/${s.id}`); toast.success("Deleted"); setSlotModal(false); loadWeek(); } catch (e) { toast.error((e as Error).message); } }
  async function generateWeek() {
    if (!calendarId) return;
    if (!confirm("Generate AI drafts for all planned slots this week?")) return;
    setGenBusy(true);
    try { const r = await api.post<{ generated: number; failed: number }>(`/api/calendars/${calendarId}/generate`, {}); toast.success(`Generated ${r.generated}${r.failed ? ` · ${r.failed} failed` : ""}`); loadWeek(); }
    catch (e) { toast.error((e as Error).message); } finally { setGenBusy(false); }
  }

  const slotsByCell = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    (slots || []).forEach((s) => { (m[`${s.postingUserId}|${s.slotDate.slice(0, 10)}`] ??= []).push(s); });
    return m;
  }, [slots]);
  const weekDates = DAYS.map((_, i) => addDays(weekStart, i));
  const entName = entities.find((e) => e.id === form.postingUserId)?.name ?? "";

  return (
    <div>
      <PageHeader title="Weekly Calendar" subtitle="Plan the week for the company and each employee, then generate"
        action={<div className="flex items-center gap-2">
          {isSuper && <select className="select max-w-[170px]" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <button className="btn-primary" onClick={generateWeek} disabled={genBusy || !calendarId}>{genBusy ? "Generating…" : "✨ Generate week"}</button>
        </div>} />

      <div className="mb-4 flex items-center gap-2">
        <button className="btn-secondary btn-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev</button>
        <button className="btn-secondary btn-sm" onClick={() => setWeekStart(ymd(mondayOf(new Date())))}>This week</button>
        <button className="btn-secondary btn-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next →</button>
        <span className="ml-2 text-sm text-ink-muted">Week of <b className="font-medium text-ink">{weekStart}</b></span>
      </div>

      {slots === null ? <Spinner /> : entities.length === 0 ? <Empty label="No posting entities for this company yet." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-royal-50/60">
              <tr>
                <th className="th sticky left-0 z-10 bg-royal-50">Entity</th>
                {weekDates.map((d, i) => <th key={d} className="th text-center">{DAYS[i]}<span className="block text-[11px] font-normal text-ink-soft">{d.slice(5)}</span></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {entities.map((ent) => (
                <tr key={ent.id}>
                  <td className="td sticky left-0 z-10 bg-white font-medium">{ent.isCompany ? "🏢 " : ""}{ent.name}{ent.postTypeCount === 0 && <span className="ml-1 text-xs text-rose-500" title="No platforms granted">⚠</span>}</td>
                  {weekDates.map((date) => {
                    const cell = slotsByCell[`${ent.id}|${date}`] || [];
                    return (
                      <td key={date} className="td min-w-[120px] align-top">
                        <div className="flex flex-col gap-1">
                          {cell.map((s) => (
                            <button key={s.id} onClick={() => openEdit(s)} className="rounded-lg border border-surface-line bg-royal-50/40 px-2 py-1 text-left text-xs hover:bg-royal-50">
                              <div className="font-medium text-royal-800">{s.platformName}</div>
                              <div className="truncate text-ink-soft">{s.postTypeName}{s.ideaTitle ? ` · ${s.ideaTitle}` : ""}</div>
                              <span className={statusClass(s.status)}>{s.status}</span>
                            </button>
                          ))}
                          <button onClick={() => openNew(ent.id, date)} className="rounded-lg border border-dashed border-surface-line px-2 py-1 text-xs text-ink-soft hover:border-royal-300 hover:text-royal-700">+ add</button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={slotModal} onClose={() => setSlotModal(false)} wide title={editing ? `Edit slot · ${entName}` : `New slot · ${entName}`}
        footer={<div className="flex w-full items-center justify-between">
          <div>{editing && <button className="btn-danger btn-sm" onClick={() => delSlot(editing)}>Delete</button>}</div>
          <div className="flex gap-2">
            {editing && <button className="btn-secondary" onClick={() => genSlot(editing)} disabled={busy}>✨ Generate</button>}
            <button className="btn-ghost" onClick={() => setSlotModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveSlot} disabled={busy || !form.platformId || !form.postTypeId}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>}>
        {!entOptions ? <Spinner label="Loading this entity's options…" /> : entOptions.platforms.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">This entity has no granted platforms. Set its grants in <b className="font-medium">Team</b> first.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input className="input" type="date" value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} /></Field>
              <Field label="Time (optional)"><input className="input" type="time" value={form.plannedTime} onChange={(e) => setForm({ ...form, plannedTime: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform"><select className="select" value={form.platformId} onChange={(e) => setForm({ ...form, platformId: e.target.value, postTypeId: "", contentTypeId: "" })}><option value="">Select…</option>{entOptions.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Post type"><select className="select" value={form.postTypeId} onChange={(e) => setForm({ ...form, postTypeId: e.target.value, contentTypeId: "" })} disabled={!form.platformId}><option value="">Select…</option>{ptForPlatform.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Content type"><select className="select" value={form.contentTypeId} onChange={(e) => setForm({ ...form, contentTypeId: e.target.value })} disabled={!form.postTypeId}><option value="">—</option>{ctForPostType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Content idea (optional)"><select className="select" value={form.contentDetailId} onChange={(e) => setForm({ ...form, contentDetailId: e.target.value })}><option value="">—</option>{ideas.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</select></Field>
            </div>
            <Field label="Notes / prompt (optional)" hint="used as the AI prompt if no content idea is chosen"><textarea className="textarea min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            {editing?.postId && <Link href="/posts" className="text-sm text-royal-600 underline">View the generated post in Posts →</Link>}
          </div>
        )}
      </Modal>
    </div>
  );
}
