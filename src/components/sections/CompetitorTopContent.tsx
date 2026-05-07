"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import { Heart, MessageCircle, Play, Image, Layers, ExternalLink, Loader2, RefreshCw, TrendingUp, Settings, X, Plus, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "@/context/AccountContext";
import type { CompetitorData, CompetitorPost } from "@/lib/apify";

const mediaTypeIcon = { Image, Video: Play, Sidecar: Layers };
const mediaTypeLabel = { Image: "Foto", Video: "Reel", Sidecar: "Carrossel" };

const competitorColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  // William
  gustavocerbasi:    { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  infomoney:         { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  mundode3segundos:  { bg: "bg-sky-50",     border: "border-sky-200",    text: "text-sky-700",    dot: "bg-sky-500"    },
  // Madruga
  contabilizei:      { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-700",  dot: "bg-green-500"  },
  contaazul:         { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500"   },
  nasajon:           { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",   dot: "bg-rose-500"   },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1) return "hoje";
  if (diff < 2) return "ontem";
  if (diff < 7) return `${Math.floor(diff)}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function truncate(text: string, max = 72) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function PostCard({ post, rank, colors }: {
  post: CompetitorPost;
  rank: number;
  colors: typeof competitorColors[string];
}) {
  const Icon = mediaTypeIcon[post.mediaType] ?? Image;

  return (
    <motion.a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      whileHover={{ y: -2 }}
      className="group flex gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 relative">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt="post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
        )}
        {post.mediaType === "Video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        )}
        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">#{rank}</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
            {mediaTypeLabel[post.mediaType]}
          </span>
          <span className="text-[10px] text-text-light">{formatDate(post.timestamp)}</span>
        </div>
        <p className="text-xs text-text-medium leading-relaxed line-clamp-2">
          {post.caption ? truncate(post.caption) : <span className="italic text-text-light">Sem legenda</span>}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-text-light">
            <Heart className="w-3 h-3 text-danger/70" />
            {formatNumber(post.likeCount)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-text-light">
            <MessageCircle className="w-3 h-3 text-info/70" />
            {formatNumber(post.commentCount)}
          </span>
          <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

function CompetitorColumn({ data, index }: { data: CompetitorData; index: number }) {
  const colors = competitorColors[data.username] ?? {
    bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-500",
  };

  const totalEngagement = data.posts.reduce((s, p) => s + p.engagement, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.12 }}
      className="flex flex-col gap-3"
    >
      {/* Competitor header */}
      <div className={`flex items-center justify-between p-3 rounded-2xl ${colors.bg} border ${colors.border}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full ${colors.dot} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {data.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className={`text-xs font-semibold ${colors.text}`}>@{data.username}</p>
            <p className="text-[10px] text-text-light">{data.posts.length} posts analisados</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-light">
          <TrendingUp className={`w-3 h-3 ${colors.text}`} />
          <span className={`font-semibold ${colors.text}`}>{formatNumber(totalEngagement)}</span>
        </div>
      </div>

      {/* Posts */}
      {data.posts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.posts.map((post, i) => (
            <PostCard key={post.id || i} post={post} rank={i + 1} colors={colors} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <Image className="w-6 h-6 text-slate-300 mb-2" />
          <p className="text-xs text-text-light">Nenhum post encontrado</p>
        </div>
      )}
    </motion.div>
  );
}

import { COMPETITORS_BY_ACCOUNT } from "@/lib/apify";

const storageKey = (slug: string) => `competitor_usernames_v1_${slug}`;

function useCompetitorList(slug: string) {
  const defaults = COMPETITORS_BY_ACCOUNT[slug] ?? COMPETITORS_BY_ACCOUNT.william;
  const [list, setListRaw] = useState<string[]>(defaults);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(slug));
      setListRaw(stored ? JSON.parse(stored) : defaults);
    } catch { setListRaw(defaults); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function setList(next: string[]) {
    setListRaw(next);
    try { localStorage.setItem(storageKey(slug), JSON.stringify(next)); } catch {}
  }

  return [list, setList] as const;
}

function ConfigModal({ slug, list, onSave, onClose }: {
  slug: string; list: string[]; onSave: (next: string[]) => void; onClose: () => void;
}) {
  const [draft, setDraft]   = useState<string[]>(list);
  const [input, setInput]   = useState("");

  function add() {
    const username = input.trim().replace(/^@/, "").toLowerCase();
    if (username && !draft.includes(username)) setDraft(d => [...d, username]);
    setInput("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text-dark">Concorrentes monitorados</h3>
            <p className="text-xs text-text-light mt-0.5">perfil: @{slug === "william" ? "williamnmadruga" : "madrugacontabilidade"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4 text-text-medium" />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {draft.map(u => (
            <div key={u} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-sm text-text-dark">@{u}</span>
              <button onClick={() => setDraft(d => d.filter(x => x !== u))} className="text-slate-400 hover:text-danger transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="@username do Instagram"
            className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
          <button onClick={add} className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-90">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-[10px] text-text-light mb-4">Máx. 6 perfis. Apenas contas públicas com posts recentes serão carregadas pelo Apify.</p>

        <button
          onClick={() => { onSave(draft.slice(0, 6)); onClose(); }}
          className="w-full h-10 rounded-2xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Salvar e atualizar
        </button>
      </div>
    </div>
  );
}

export default function CompetitorTopContent() {
  const { account } = useAccount();
  const slug = account.id === "william" ? "william" : "madruga";

  const [customList, setCustomList] = useCompetitorList(slug);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchedAt, setFetchedAt]     = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [configOpen, setConfigOpen]   = useState(false);

  const load = (accountSlug: string) => {
    setLoading(true);
    setCompetitors([]);
    fetch(`/api/competitors/posts?account=${accountSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.competitors) setCompetitors(d.competitors);
        if (d.fetchedAt)   setFetchedAt(d.fetchedAt);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(slug); }, [slug]);

  const handleRefresh = async (usernames?: string[]) => {
    setRefreshing(true);
    try {
      const toFetch = usernames ?? customList;
      await fetch(`/api/competitors/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: toFetch }),
      });
      await new Promise((r) => setTimeout(r, 15000));
      load(slug);
    } finally {
      setRefreshing(false);
    }
  };

  function handleSaveConfig(next: string[]) {
    setCustomList(next);
    handleRefresh(next);
  }

  const hasData = competitors.some((c) => c.posts.length > 0);

  return (
    <>
    <Card className="col-span-12" delay={0.5}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">Top da Semana — Concorrentes</h3>
          <p className="text-sm text-text-light mt-0.5">
            3 posts com maior engajamento de cada perfil monitorado
            {fetchedAt && (
              <span className="ml-2 text-[11px] text-text-light/70">
                · atualizado {formatDate(fetchedAt)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 text-xs text-text-light font-medium hover:opacity-70 transition-opacity cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurar
          </button>
          <button
            onClick={() => handleRefresh()}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-70 transition-opacity disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Buscando…" : "Atualizar agora"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-sm text-text-light">Carregando posts dos concorrentes…</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-sm text-text-medium">Ainda sem dados. Clique em &ldquo;Atualizar agora&rdquo; para buscar os posts.</p>
          <button
            onClick={() => handleRefresh()}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            {refreshing ? "Buscando…" : "Buscar agora"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {competitors.map((comp, i) => (
            <CompetitorColumn key={comp.username} data={comp} index={i} />
          ))}
        </div>
      )}
    </Card>

    {configOpen && (
      <ConfigModal
        slug={slug}
        list={customList}
        onSave={handleSaveConfig}
        onClose={() => setConfigOpen(false)}
      />
    )}
  </>
  );
}
