"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Heart, MessageCircle, Play, Image, Layers,
  ExternalLink, Wand2, X, Copy, Check, TrendingUp, Users,
  FileText, Video, LayoutGrid, ChevronDown, ChevronUp, BookmarkPlus,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "@/context/AccountContext";
import type { CompetitorPost } from "@/lib/apify";
import { cn } from "@/lib/utils";

interface CompetitorProfile {
  username: string;
  fullName: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  biography: string;
  profilePicUrl: string;
  isVerified: boolean;
}

interface RewriteResult {
  tipo: string;
  titulo: string;
  hook: string;
  copy: string;
  legenda: string;
  hashtags: string[];
  porque_vai_engajar: string;
}

const mediaIcon  = { Image: Image, Video: Play, Sidecar: Layers };
const mediaLabel = { Image: "Foto", Video: "Reel", Sidecar: "Carrossel" };
const mediaColor = {
  Image:   "bg-blue-100 text-blue-700",
  Video:   "bg-purple-100 text-purple-700",
  Sidecar: "bg-amber-100 text-amber-700",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function RewriteModal({ post, slug, competitorUsername, onClose }: {
  post: CompetitorPost;
  slug: string;
  competitorUsername: string;
  onClose: () => void;
}) {
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<RewriteResult | null>(null);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<string | null>("copy");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  async function rewrite() {
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try {
      const res  = await fetch("/api/competitors/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, post, competitorUsername }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro desconhecido");
      setResult(json);
      setExpanded("copy");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  }

  async function saveToRascunho() {
    if (!result) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const id    = `comp-${Date.now()}`;
      const tipoMap: Record<string, string> = { reel: "reel", carrossel: "carrossel", feed: "feed" };
      const body = {
        id,
        slug,
        titulo:   result.titulo || `Adaptado de @${competitorUsername}`,
        data:     today,
        tipo:     tipoMap[result.tipo] ?? "reel",
        status:   "rascunho",
        legenda:  result.legenda ?? null,
        copy:     result.copy ?? null,
        hashtags: Array.isArray(result.hashtags) ? result.hashtags.join(",") : null,
        prompt:   `Adaptado de @${competitorUsername} — gancho: ${result.hook ?? ""}`,
      };
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setSaved(true);
    } catch {
      // silent — button state reverts
    } finally { setSaving(false); }
  }

  const accountLabel = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-text-dark text-lg">Reescrever para {accountLabel}</h3>
            <p className="text-xs text-text-light mt-0.5">
              Baseado no post de @{competitorUsername} — {post.likeCount.toLocaleString("pt-BR")} curtidas
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-6 pt-4">
          <div className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            {post.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.thumbnailUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 line-clamp-3">{post.caption || "(sem legenda)"}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Heart className="w-3 h-3" />{post.likeCount.toLocaleString("pt-BR")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MessageCircle className="w-3 h-3" />{post.commentCount.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Generate button */}
        {!result && (
          <div className="px-6 py-4">
            <button
              type="button"
              onClick={rewrite}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl gradient-primary text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analisando e reescrevendo...</>
                : <><Wand2 className="w-4 h-4" />Reescrever com Claude</>}
            </button>
            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
            {/* Why it works */}
            {result.porque_vai_engajar && (
              <div className="flex gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-primary font-medium">{result.porque_vai_engajar}</p>
              </div>
            )}

            {/* Hook */}
            {result.hook && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> Gancho (0-3s)
                  </span>
                  <CopyButton text={result.hook} />
                </div>
                <p className="px-4 py-3 text-sm text-text-dark font-medium">{result.hook}</p>
              </div>
            )}

            {/* Sections — collapsible */}
            {[
              { key: "copy",    icon: FileText,     label: result.tipo === "reel" ? "Roteiro Completo" : result.tipo === "carrossel" ? "Slides" : "Texto",  value: result.copy },
              { key: "legenda", icon: Video,         label: "Legenda Instagram",  value: result.legenda },
              { key: "hashtags",icon: LayoutGrid,    label: "Hashtags",           value: Array.isArray(result.hashtags) ? result.hashtags.map(h => `#${h}`).join(" ") : "" },
            ].map(({ key, icon: Icon, label, value }) => value && (
              <div key={key} className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === key ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </span>
                  <div className="flex items-center gap-1">
                    <CopyButton text={value} />
                    {expanded === key
                      ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === key && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 py-3 text-sm text-text-dark whitespace-pre-wrap leading-relaxed">{value}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Actions row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={rewrite}
                disabled={loading || saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                Gerar nova versão
              </button>

              <button
                type="button"
                onClick={saveToRascunho}
                disabled={saving || saved || loading}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-semibold transition-all disabled:opacity-60",
                  saved
                    ? "bg-green-50 border border-green-200 text-green-600"
                    : "gradient-primary text-white"
                )}
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : saved
                    ? <Check className="w-3.5 h-3.5" />
                    : <BookmarkPlus className="w-3.5 h-3.5" />}
                {saved ? "Salvo nos Rascunhos!" : "Salvar nos Rascunhos"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PostCard({ post, rank, slug, competitorUsername }: {
  post: CompetitorPost;
  rank: number;
  slug: string;
  competitorUsername: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const Icon  = mediaIcon[post.mediaType]  ?? Image;
  const label = mediaLabel[post.mediaType] ?? "Post";
  const color = mediaColor[post.mediaType] ?? "bg-slate-100 text-slate-600";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.05 }}
        className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
      >
        {/* Thumbnail + rank */}
        <div className="relative">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.thumbnailUrl} alt="" className="w-full h-32 rounded-xl object-cover" />
          ) : (
            <div className="w-full h-32 rounded-xl bg-slate-100 flex items-center justify-center">
              <Icon className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">
            #{rank + 1}
          </div>
          <span className={cn("absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", color)}>
            <Icon className="w-3 h-3" />{label}
          </span>
        </div>

        {/* Caption */}
        <p className="text-xs text-text-dark leading-snug line-clamp-3 flex-1">
          {post.caption || <span className="text-slate-400 italic">Sem legenda</span>}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Heart className="w-3.5 h-3.5 text-rose-400" />{formatNumber(post.likeCount)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <MessageCircle className="w-3.5 h-3.5 text-blue-400" />{formatNumber(post.commentCount)}
          </span>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto p-1 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Rewrite button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/8 hover:bg-primary/15 text-primary text-xs font-semibold transition-colors border border-primary/15"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Reescrever com IA
        </button>
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <RewriteModal
            post={post}
            slug={slug}
            competitorUsername={competitorUsername}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function CompetitorAnalysis() {
  const { accountId } = useAccount();
  const slug = accountId === "escritorio" ? "madruga" : "william";

  const [handle,   setHandle]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [profile,  setProfile]  = useState<CompetitorProfile | null>(null);
  const [posts,    setPosts]    = useState<CompetitorPost[]>([]);

  async function search(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = handle.replace(/^@/, "").trim();
    if (!q) return;
    setLoading(true); setError(""); setProfile(null); setPosts([]);

    try {
      const res  = await fetch("/api/competitors/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: q }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro desconhecido");
      setProfile(json.profile);
      setPosts(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar perfil");
    } finally { setLoading(false); }
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-text-dark text-sm">Análise de Concorrente</h3>
          <p className="text-[11px] text-text-light">Cole o @ de qualquer perfil para ver os top 10 conteúdos e reescrever na sua voz</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={search} className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium select-none">@</span>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="instagram_do_concorrente"
            className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm text-text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !handle.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl gradient-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs mb-4">
          <X className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Profile card */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 mb-4"
        >
          {profile.profilePicUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profilePicUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-text-dark text-sm">@{profile.username}</p>
              {profile.isVerified && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-semibold">✓ Verificado</span>}
            </div>
            {profile.fullName && <p className="text-xs text-text-light truncate">{profile.fullName}</p>}
          </div>
          <div className="flex gap-4 text-center flex-shrink-0">
            {[
              { label: "Seguidores", value: formatNumber(profile.followersCount) },
              { label: "Seguindo",   value: formatNumber(profile.followingCount) },
              { label: "Posts",      value: formatNumber(profile.postsCount) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-bold text-text-dark">{value}</p>
                <p className="text-[10px] text-text-light">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Posts grid */}
      {posts.length > 0 && (
        <>
          <p className="text-xs font-semibold text-text-light mb-3 uppercase tracking-wide">
            Top {posts.length} conteúdos por engajamento
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                rank={i}
                slug={slug}
                competitorUsername={profile?.username ?? handle}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && !profile && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Search className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Digite o @ de um concorrente para começar</p>
        </div>
      )}
    </div>
  );
}
