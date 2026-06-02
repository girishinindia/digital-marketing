"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner, Field } from "@/components/ui/primitives";
import type { AuthUser } from "@/types";

type Options = {
  platforms: { id: number; name: string }[];
  postTypes: { id: number; name: string; platformId: number; platformName: string }[];
  contentTypesByPostType: Record<string, { id: number; name: string; slug: string }[]>;
};
type GenResult = { body: string; hashtags: string; provider: string; model: string };
type Category = { id: number; name: string; isActive: boolean };
type Idea = { id: number; categoryId: number; title: string; defaultPrompt: string | null; suggestedContentTypeId: number | null; isActive: boolean };

export default function StudioPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [platformId, setPlatformId] = useState<number | null>(null);
  const [postTypeId, setPostTypeId] = useState<number | null>(null);
  const [contentTypeId, setContentTypeId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("");
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);

  // content library (optional starting point)
  const [categories, setCategories] = useState<Category[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaCat, setIdeaCat] = useState<number | "">("");
  const [ideaId, setIdeaId] = useState<number | "">("");

  const [result, setResult] = useState<GenResult | null>(null);
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const isSuper = me?.roleSlug === "super_admin";
  const libQS = isSuper && companyId ? `?companyId=${companyId}` : "";

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

  // Options + content library are per-company — (re)load when the chosen company changes.
  useEffect(() => {
    if (!me || (isSuper && !companyId)) return;
    api.get<Options>(`/api/ai/options${libQS}`).then((o) => {
      setOpts(o);
      if (o.platforms[0]) setPlatformId(o.platforms[0].id);
    }).catch((e) => toast.error(e.message));
    api.get<Category[]>(`/api/content-categories${libQS}`).then((c) => setCategories(c.filter((x) => x.isActive))).catch(() => {});
    api.get<Idea[]>(`/api/content-details${libQS}`).then((d) => setIdeas(d.filter((x) => x.isActive))).catch(() => {});
  }, [me, companyId]); // eslint-disable-line

  // Picking a content idea prefills the prompt and (if compatible) the format.
  function applyIdea(id: number) {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;
    setIdeaId(id);
    setPrompt(idea.defaultPrompt || `Create a social media post about: ${idea.title}`);
    if (idea.suggestedContentTypeId && contentTypes.some((c) => c.id === idea.suggestedContentTypeId)) {
      setContentTypeId(idea.suggestedContentTypeId);
    }
  }
  const ideasInCat = useMemo(() => (ideaCat ? ideas.filter((i) => i.categoryId === ideaCat) : []), [ideas, ideaCat]);

  const postTypes = useMemo(() => (opts && platformId ? opts.postTypes.filter((p) => p.platformId === platformId) : []), [opts, platformId]);
  const contentTypes = useMemo(() => (opts && postTypeId ? opts.contentTypesByPostType[postTypeId] || [] : []), [opts, postTypeId]);

  useEffect(() => { setPostTypeId(postTypes[0]?.id ?? null); }, [platformId]); // eslint-disable-line
  useEffect(() => { setContentTypeId(contentTypes[0]?.id ?? null); }, [postTypeId]); // eslint-disable-line

  async function generate() {
    if (!platformId || !postTypeId || prompt.trim().length < 3) { toast.error("Pick a platform, post type and write a prompt."); return; }
    setBusy(true); setResult(null);
    try {
      const r = await api.post<{ content: GenResult }>("/api/ai/generate", {
        platformId, postTypeId, contentTypeId: contentTypeId ?? undefined,
        prompt, tone: tone || undefined, provider: provider || undefined, savePost: false,
        contentCategoryId: ideaCat || undefined, contentDetailId: ideaId || undefined,
      });
      setResult(r.content); setBody(r.content.body); setHashtags(r.content.hashtags); setMediaUrl("");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function uploadMedia(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: fd, credentials: "same-origin" });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || "Upload failed"); return; }
    setMediaUrl(json.data.cdnUrl); toast.success("Media uploaded");
  }

  async function saveDraft() {
    if (!platformId || !postTypeId) return;
    setSaving(true);
    try {
      const post = await api.post<{ id: number }>("/api/posts", {
        platformId, postTypeId, contentTypeId: contentTypeId ?? undefined, body,
        contentCategoryId: ideaCat || undefined, contentDetailId: ideaId || undefined,
        ...(isSuper && companyId ? { companyId } : {}),
      });
      await api.patch(`/api/posts/${post.id}`, { hashtags, mediaUrl: mediaUrl || null, status: "generated" });
      toast.success("Saved to Posts as a draft");
      setResult(null); setBody(""); setHashtags(""); setMediaUrl(""); setPrompt(""); setIdeaCat(""); setIdeaId("");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }

  if (!opts) return <Spinner />;
  if (opts.postTypes.length === 0) {
    return (
      <div>
        <PageHeader title="AI Studio" />
        <div className="card-pad text-sm text-ink-muted">You don&apos;t have any post types granted yet. Ask your company admin to assign some.</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="AI Studio" subtitle="Generate ready-to-post copy with AI"
        action={isSuper ? (
          <select className="select max-w-xs" value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Composer */}
        <div className="card-pad space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform"><select className="select" value={platformId ?? ""} onChange={(e) => setPlatformId(Number(e.target.value))}>{opts.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Post type"><select className="select" value={postTypeId ?? ""} onChange={(e) => setPostTypeId(Number(e.target.value))}>{postTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Content type"><select className="select" value={contentTypeId ?? ""} onChange={(e) => setContentTypeId(Number(e.target.value))}>{contentTypes.length ? contentTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">—</option>}</select></Field>
            <Field label="AI model"><select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}><option value="">Auto</option><option value="openai">OpenAI</option><option value="anthropic">Claude</option><option value="gemini">Gemini</option></select></Field>
          </div>
          {categories.length > 0 && (
            <div className="rounded-lg border border-royal-100 bg-royal-50/50 p-3">
              <p className="mb-2 text-xs font-medium text-royal-700">Start from a content idea (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={ideaCat} onChange={(e) => { setIdeaCat(e.target.value ? Number(e.target.value) : ""); setIdeaId(""); }}>
                  <option value="">Category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select" value={ideaId} onChange={(e) => e.target.value && applyIdea(Number(e.target.value))} disabled={!ideaCat}>
                  <option value="">{ideaCat ? "Pick an idea…" : "Choose category first"}</option>
                  {ideasInCat.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
                </select>
              </div>
            </div>
          )}
          <Field label="Tone (optional)"><input className="input" placeholder="e.g. witty, professional, bold" value={tone} onChange={(e) => setTone(e.target.value)} /></Field>
          <Field label="Prompt"><textarea className="textarea min-h-[120px]" placeholder="Describe the post you want…" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
          <button className="btn-primary w-full" onClick={generate} disabled={busy}>{busy ? "Generating…" : "✨ Generate"}</button>
        </div>

        {/* Result */}
        <div className="card-pad">
          {!result && !busy && <p className="py-16 text-center text-sm text-ink-muted">Your generated post will appear here.</p>}
          {busy && <Spinner label="Talking to the model…" />}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-base font-medium">Draft</h3><span className="badge-royal">{result.provider} · {result.model}</span></div>
              <Field label="Body"><textarea className="textarea min-h-[160px]" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
              <Field label="Hashtags"><input className="input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} /></Field>
              <div className="flex items-center gap-3">
                <label className="btn-secondary btn-sm cursor-pointer">Attach media<input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])} /></label>
                {mediaUrl && <a href={mediaUrl} target="_blank" className="truncate text-xs text-royal-600">{mediaUrl}</a>}
              </div>
              <div className="flex gap-2"><button className="btn-primary" onClick={saveDraft} disabled={saving}>{saving ? "Saving…" : "Save to Posts"}</button><button className="btn-ghost" onClick={generate} disabled={busy}>Regenerate</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
