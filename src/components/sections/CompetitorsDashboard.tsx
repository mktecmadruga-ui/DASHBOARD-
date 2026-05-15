"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, Heart, MessageCircle, Plus, X, Loader2, RefreshCw,
  Play, Image, Layers, ExternalLink, Wand2, BookmarkPlus, Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "@/context/AccountContext";
import type { CompetitorPost } from "@/lib/apify";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCompetitor {
  id: string;
  slug: string;
  username: string;
  created_at: string;
}

interface CompetitorProfile {
  ownerFullName: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  biography: string;
  profilePicUrl: string;
  verified: boolean;
}

interface CompetitorSnapshot {
  slug: string;
  username: string;
  profile: CompetitorProfile;
  posts: CompetitorPost[];
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
  top_media_type: string;
  fetched_at: string;
}

interface RewriteResult {
  tipo?: string;
  titulo?: string;
  hook?: string;
  copy?: string;
  legenda?: string;
  hashtags?: string[];
  porque_vai_engajar?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mediaTypeIcon: Record<string, React.ElementType> = {
  Image: Image,
  Video: Play,
  Sidecar: Layers,
};

const mediaTypeLabel: Record<string, string> = {
  Image: "Foto",
  Video: "Reel",
  Sidecar: "Carrossel",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1) return "hoje";
  if (diff < 2) return "ontem";
  if (diff < 7) return `${Math.floor(diff)}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Initials({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || "?"}
    </div>
  );
}

// ─── RewriteModal (inline, not exported) ─────────────────────────────────────

function RewriteModal({
  post,
  competitorUsername,
  slug,
  onClose,
}: {
  post: CompetitorPost;
  competitorUsername: string;
  slug: string;
  onClose: () => void;
}) {
  const [loading, setLoading]   = useState(true);
  const [result, setResult]     = useState<RewriteResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/competitors/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, post, competitorUsername }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.error) setError(d.error);
          else setResult(d);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, post, competitorUsername]);

  async function handleSaveDraft() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendar/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          titulo:   result.titulo ?? "Rascunho de concorrente",
          tipo:     result.tipo ?? "feed",
          copy:     result.copy ?? "",
          legenda:  result.legenda ?? "",
          hashtags: (result.hashtags ?? []).join(", "),
          prompt:   `Reescrita de @${competitorUsername}: ${post.caption?.slice(0, 100)}`,
        }),
      });
      if (res.ok) setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-dark">Conteúdo gerado por IA</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-text-medium" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-text-light">Gerando conteúdo…</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-4">
            {result.hook && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Hook</p>
                <p className="text-sm text-text-dark bg-primary/5 rounded-xl px-3 py-2 border border-primary/10">{result.hook}</p>
              </div>
            )}
            {result.copy && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Roteiro / Copy</p>
                <p className="text-sm text-text-medium leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{result.copy}</p>
              </div>
            )}
            {result.legenda && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Legenda</p>
                <p className="text-sm text-text-medium leading-relaxed bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{result.legenda}</p>
              </div>
            )}
            {result.hashtags && result.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((h) => (
                  <span key={h} className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-lg font-medium">
                    #{h}
                  </span>
                ))}
              </div>
            )}
            {result.porque_vai_engajar && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">Por que vai engajar</p>
                <p className="text-xs text-emerald-700">{result.porque_vai_engajar}</p>
              </div>
            )}

            <button
              onClick={handleSaveDraft}
              disabled={saving || saved}
              className={cn(
                "w-full h-10 rounded-2xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2",
                saved
                  ? "bg-emerald-500 text-white"
                  : "gradient-primary text-white hover:opacity-90"
              )}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              ) : saved ? (
                <><Check className="w-4 h-4" /> Salvo nos Rascunhos</>
              ) : (
                <><BookmarkPlus className="w-4 h-4" /> Salvar nos Rascunhos</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  slug,
  competitorUsername,
  isSaved,
  onSave,
}: {
  post: CompetitorPost;
  slug: string;
  competitorUsername: string;
  isSaved: boolean;
  onSave: (post: CompetitorPost) => Promise<void>;
}) {
  const Icon = mediaTypeIcon[post.mediaType] ?? Image;
  const [saving, setSaving]         = useState(false);
  const [localSaved, setLocalSaved] = useState(isSaved);
  const [rewriteOpen, setRewriteOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(post);
    setLocalSaved(true);
    setSaving(false);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Thumbnail */}
        <div className="relative w-full aspect-square bg-slate-100 flex-shrink-0">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/proxy-image?url=${encodeURIComponent(post.thumbnailUrl)}`} alt="post" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-8 h-8 text-slate-300" />
            </div>
          )}
          {post.mediaType === "Video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          )}
          {/* media type badge */}
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black/50 text-white">
            {mediaTypeLabel[post.mediaType] ?? post.mediaType}
          </span>
          {/* external link */}
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-white" />
          </a>
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-xs text-text-medium leading-relaxed line-clamp-3 flex-1">
            {post.caption || <span className="italic text-text-light">Sem legenda</span>}
          </p>

          <div className="flex items-center gap-3 text-[11px] text-text-light">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" />
              {formatNumber(post.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-sky-400" />
              {formatNumber(post.commentCount)}
            </span>
            <span className="ml-auto">{formatDate(post.timestamp)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || localSaved}
              className={cn(
                "flex-1 h-7 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer",
                localSaved
                  ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                  : "bg-slate-100 hover:bg-slate-200 text-text-medium border border-slate-200"
              )}
            >
              {localSaved ? (
                <><Check className="w-3 h-3" /> Salvo</>
              ) : saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <><BookmarkPlus className="w-3 h-3" /> Salvar</>
              )}
            </button>

            <button
              onClick={() => setRewriteOpen(true)}
              className="flex-1 h-7 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1 gradient-primary text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Wand2 className="w-3 h-3" /> Gerar
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rewriteOpen && (
          <RewriteModal
            post={post}
            competitorUsername={competitorUsername}
            slug={slug}
            onClose={() => setRewriteOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompetitorsDashboard() {
  const { accountId } = useAccount();
  const slug = accountId === "escritorio" ? "madruga" : "william";

  // Saved competitors list
  const [competitors, setCompetitors]         = useState<SavedCompetitor[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);

  // Selected competitor + snapshot
  const [selected, setSelected]               = useState<SavedCompetitor | null>(null);
  const [snapshot, setSnapshot]               = useState<CompetitorSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError]     = useState<string | null>(null);

  // Saved posts (to highlight already-saved)
  const [savedPostIds, setSavedPostIds]       = useState<Set<string>>(new Set());

  // Add competitor input
  const [addInput, setAddInput]               = useState("");
  const [adding, setAdding]                   = useState(false);

  // ── Fetch saved competitors ──────────────────────────────────────────────
  const loadCompetitors = useCallback(async () => {
    setCompetitorsLoading(true);
    try {
      const r = await fetch(`/api/competitors/saved?slug=${slug}`);
      const d = await r.json();
      setCompetitors(d.competitors ?? []);
    } catch {
      // ignore
    } finally {
      setCompetitorsLoading(false);
    }
  }, [slug]);

  // ── Fetch saved post IDs ─────────────────────────────────────────────────
  const loadSavedPosts = useCallback(async () => {
    try {
      const r = await fetch(`/api/competitors/saved-posts?slug=${slug}`);
      const d = await r.json();
      const ids = new Set<string>((d.posts ?? []).map((p: { post_id: string }) => p.post_id));
      setSavedPostIds(ids);
    } catch {
      // ignore
    }
  }, [slug]);

  useEffect(() => {
    loadCompetitors();
    loadSavedPosts();
    setSelected(null);
    setSnapshot(null);
  }, [loadCompetitors, loadSavedPosts]);

  // ── Fetch snapshot ───────────────────────────────────────────────────────
  async function fetchSnapshot(comp: SavedCompetitor) {
    setSelected(comp);
    setSnapshot(null);
    setSnapshotError(null);
    setSnapshotLoading(true);
    try {
      const r = await fetch("/api/competitors/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, username: comp.username }),
      });
      const d = await r.json();
      if (d.error) setSnapshotError(d.error);
      else setSnapshot(d);
    } catch (e) {
      setSnapshotError(String(e));
    } finally {
      setSnapshotLoading(false);
    }
  }

  // ── Add competitor ───────────────────────────────────────────────────────
  async function handleAdd() {
    const username = addInput.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    setAdding(true);
    try {
      const r = await fetch("/api/competitors/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, username }),
      });
      const d = await r.json();
      if (d.competitor) {
        await loadCompetitors();
        setAddInput("");
        // immediately select and fetch
        await fetchSnapshot({ id: d.competitor.id, slug, username, created_at: d.competitor.created_at });
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  }

  // ── Delete competitor ────────────────────────────────────────────────────
  async function handleDelete(comp: SavedCompetitor) {
    await fetch(`/api/competitors/saved?slug=${slug}&username=${comp.username}`, {
      method: "DELETE",
    });
    if (selected?.username === comp.username) {
      setSelected(null);
      setSnapshot(null);
    }
    await loadCompetitors();
  }

  // ── Save post to memory ──────────────────────────────────────────────────
  async function handleSavePost(post: CompetitorPost) {
    await fetch("/api/competitors/saved-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        competitorUsername: post.username,
        postId:             post.id,
        postUrl:            post.url,
        caption:            post.caption,
        mediaType:          post.mediaType,
        thumbnailUrl:       post.thumbnailUrl,
        likeCount:          post.likeCount,
        commentCount:       post.commentCount,
        postTimestamp:      post.timestamp,
      }),
    });
    setSavedPostIds(prev => { const next = new Set(Array.from(prev)); next.add(post.id); return next; });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-10rem)]">

      {/* ── Left panel — Competitor List ── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-dark">Concorrentes</h2>
              <p className="text-[11px] text-text-light">{competitors.length} monitorados</p>
            </div>
          </div>

          {/* Add input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">@</span>
              <input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
                placeholder="username"
                className="w-full h-9 pl-6 pr-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !addInput.trim()}
              className="w-9 h-9 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {adding ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Plus className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {competitorsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 bg-white rounded-2xl border border-dashed border-slate-200 text-center p-4">
              <p className="text-xs text-text-light">Adicione um concorrente acima</p>
            </div>
          ) : (
            <AnimatePresence>
              {competitors.map((comp) => {
                const isSelected = selected?.username === comp.username;
                return (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-150 bg-white",
                      isSelected
                        ? "border-primary shadow-sm bg-primary/5"
                        : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                    )}
                    onClick={() => fetchSnapshot(comp)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
                      isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {comp.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-text-dark")}>
                        @{comp.username}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(comp); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* ── Right panel — Profile Analysis ── */}
      <div className="flex-1 min-w-0">
        {!selected && !snapshotLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full min-h-64 bg-white rounded-2xl border border-dashed border-slate-200 text-center p-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-text-medium mb-1">Selecione um concorrente</p>
            <p className="text-xs text-text-light">para ver a análise de perfil e posts</p>
          </motion.div>
        ) : snapshotLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-text-light">Buscando dados via Apify…</p>
            <p className="text-xs text-text-light/60">Isso pode levar até 60 segundos</p>
          </div>
        ) : snapshotError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-sm text-red-500 text-center">{snapshotError}</p>
            <button
              onClick={() => selected && fetchSnapshot(selected)}
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-medium hover:opacity-90 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : snapshot ? (
          <motion.div
            key={snapshot.username}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            {/* Profile header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                {snapshot.profile.profilePicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(snapshot.profile.profilePicUrl)}`}
                    alt={snapshot.username}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-slate-100"
                  />
                ) : (
                  <Initials name={snapshot.profile.ownerFullName || snapshot.username} size={56} />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-text-dark truncate">
                      {snapshot.profile.ownerFullName || snapshot.username}
                    </h3>
                    {snapshot.profile.verified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-md font-semibold">
                        ✓ Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-light">@{snapshot.username}</p>
                  {snapshot.profile.biography && (
                    <p className="text-xs text-text-medium mt-1.5 line-clamp-2 leading-relaxed">
                      {snapshot.profile.biography}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => selected && fetchSnapshot(selected)}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-70 transition-opacity cursor-pointer flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </button>
              </div>

              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-dark">{formatNumber(snapshot.profile.followersCount)}</p>
                  <p className="text-[10px] text-text-light">seguidores</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-dark">{formatNumber(snapshot.profile.followingCount)}</p>
                  <p className="text-[10px] text-text-light">seguindo</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-dark">{formatNumber(snapshot.profile.postsCount)}</p>
                  <p className="text-[10px] text-text-light">posts</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-text-light">atualizado</p>
                  <p className="text-[10px] text-text-light font-medium">{formatDate(snapshot.fetched_at)}</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Users,         label: "Seguidores",        value: formatNumber(snapshot.profile.followersCount) },
                { icon: Heart,         label: "Média de Likes",    value: formatNumber(snapshot.avg_likes) },
                { icon: MessageCircle, label: "Média de Coments.", value: formatNumber(snapshot.avg_comments) },
                { icon: TrendingUp,    label: "Taxa de Eng.",      value: `${snapshot.engagement_rate}%` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <p className="text-[10px] text-text-light font-medium uppercase tracking-wide">{label}</p>
                  </div>
                  <p className="text-xl font-bold text-text-dark">{value}</p>
                </div>
              ))}
            </div>

            {/* Posts grid */}
            {snapshot.posts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-dark mb-3">
                  Posts recentes ({snapshot.posts.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {snapshot.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      slug={slug}
                      competitorUsername={snapshot.username}
                      isSaved={savedPostIds.has(post.id)}
                      onSave={handleSavePost}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
