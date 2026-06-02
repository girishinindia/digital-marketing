"use client";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/primitives";

export type GrantPostType = { id: number; platformId: number; platformName: string; name: string };
type CT = { id: number; name: string };
type Initial = { postTypeIds: number[]; contentTypeIdsByPostType: Record<string, number[]> };

/**
 * Shared post-type + content-type selection matrix.
 * Used for BOTH user/company-account grants and company entitlements — only the
 * data sources differ (passed in via props).
 */
export function GrantMatrix({
  title, helpText, catalog, loadInitial, loadContentTypes, onSave, onClose,
}: {
  title: string;
  helpText: string;
  catalog: GrantPostType[];
  loadInitial: () => Promise<Initial>;
  loadContentTypes: (postTypeId: number) => Promise<CT[]>;
  onSave: (payload: Initial) => Promise<void>;
  onClose: (changed: boolean) => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [contentByPt, setContentByPt] = useState<Record<number, { allowed: CT[]; selected: Set<number> }>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, GrantPostType[]>();
    catalog.forEach((p) => { (m.get(p.platformName) ?? m.set(p.platformName, []).get(p.platformName)!).push(p); });
    return [...m.entries()];
  }, [catalog]);

  useEffect(() => {
    loadInitial().then((g) => {
      setSelected(new Set(g.postTypeIds));
      const cbp: Record<number, { allowed: CT[]; selected: Set<number> }> = {};
      for (const [pt, ids] of Object.entries(g.contentTypeIdsByPostType)) cbp[Number(pt)] = { allowed: [], selected: new Set(ids) };
      setContentByPt(cbp);
      setLoaded(true);
    }).catch((e) => { toast.error(e.message); setLoaded(true); });
  }, []); // eslint-disable-line

  async function ensureContent(ptId: number) {
    if (contentByPt[ptId]?.allowed.length) return;
    const allowed = await loadContentTypes(ptId);
    setContentByPt((prev) => {
      const cur = prev[ptId];
      const sel = cur?.selected ?? new Set(allowed.map((a) => a.id));
      return { ...prev, [ptId]: { allowed, selected: sel } };
    });
  }
  async function togglePt(ptId: number) {
    const next = new Set(selected);
    if (next.has(ptId)) next.delete(ptId);
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
      await onSave({ postTypeIds, contentTypeIdsByPostType });
      toast.success("Saved");
      onClose(true);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={() => onClose(false)} wide title={title}
      footer={<><button className="btn-ghost" onClick={() => onClose(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy || !loaded}>{busy ? "Saving…" : "Save"}</button></>}>
      {!loaded ? <Spinner /> : catalog.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Nothing available to assign here yet.</p>
      ) : (
        <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
          <p className="text-sm text-ink-muted">{helpText}</p>
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
                            return <button key={ct.id} onClick={() => toggleContent(pt.id, ct.id)} className={`rounded-full px-2.5 py-0.5 text-xs ${csel ? "bg-royal-600 text-white" : "bg-white text-ink-muted ring-1 ring-surface-line"}`}>{ct.name}</button>;
                          })}
                          {!content?.allowed.length && <span className="text-xs text-ink-soft">No content types available.</span>}
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
