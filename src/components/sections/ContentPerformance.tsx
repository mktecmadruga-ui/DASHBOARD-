"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Play, Image, CircleDot, ChevronDown, Loader2, Heart, Layers, Eye, MessageCircle, MousePointerClick, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InstagramMedia } from "@/lib/instagram-api";
import type { StoryItem } from "@/app/api/instagram/[slug]/stories/route";

interface StoriesData {
  stories: StoryItem[];
  count: number;
  error?: string;
  hint?: string;
  fetchedAt: string;
}

const tabs = [
  { id: "reels",    label: "Reels",   icon: Play      },
  { id: "feed",     label: "Feed",    icon: Image     },
  { id: "stories",  label: "Stories", icon: CircleDot },
] as const;
type TabId = typeof tabs[number]["id"];

const mediaTypeMap: Record<TabId, InstagramMedia["media_type"][]> = {
  reels:   ["VIDEO"],
  feed:    ["IMAGE", "CAROUSEL_ALBUM"],
  stories: [],
};

function MetricRow({ label, value, format = "numero", highlight }: { label: string; value: number | string; format?: string; highlight?: boolean }) {
  const display = typeof value === "number"
    ? (format === "porcentagem" ? formatPercent(value) : formatNumber(value))
    : value;
  return (
    <div className={cn("flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0", highlight && "bg-primary/3 -mx-2 px-2 rounded-lg")}>
      <span className="text-sm text-text-medium">{label}</span>
      <span className={cn("text-sm font-semibold", highlight ? "text-primary" : "text-text-dark")}>{display}</span>
    </div>
  );
}

function truncate(text: string | undefined, max = 45) {
  if (!text) return "Sem legenda";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function ContentPerformance() {
  const { account } = useAccount();
  const { period } = usePeriod();
  const slug = account.id === "william" ? "william" : "madruga";

  const [activeTab, setActiveTab]       = useState<TabId>("reels");
  const [media, setMedia]               = useState<InstagramMedia[]>([]);
  const [stories, setStories]           = useState<StoriesData | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [selectedPost, setSelectedPost] = useState<string>("all");
  const [showPostPicker, setShowPostPicker] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/instagram/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.media) setMedia(d.media); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (activeTab !== "stories" || stories !== null) return;
    setStoriesLoading(true);
    fetch(`/api/instagram/${slug}/stories`)
      .then(r => r.json())
      .then(d => setStories(d))
      .catch(() => setStories({ stories: [], count: 0, error: "Falha ao carregar", fetchedAt: "" }))
      .finally(() => setStoriesLoading(false));
  }, [activeTab, slug, stories]);

  // Filter by period
  const inPeriod = media.filter((m) => {
    const age = (Date.now() - new Date(m.timestamp).getTime()) / 86400000;
    return age <= period.days;
  });

  // Filter by tab type
  const byType = inPeriod.filter((m) =>
    activeTab === "stories" ? false : mediaTypeMap[activeTab].includes(m.media_type)
  );

  // Apply post selector
  const filtered = selectedPost === "all" ? byType : byType.filter((m) => m.id === selectedPost);
  const posts = filtered.length > 0 ? filtered : byType;

  // Aggregate metrics from real posts
  const totalLikes    = posts.reduce((s, m) => s + m.like_count, 0);
  const totalComments = posts.reduce((s, m) => s + m.comments_count, 0);
  const count         = posts.length;
  const avgLikes      = count ? Math.round(totalLikes / count) : 0;
  const avgComments   = count ? Math.round(totalComments / count) : 0;
  const followers     = account.kpis[0]?.valor ?? 1;
  const engRate       = count ? ((totalLikes + totalComments) / count / followers * 100) : 0;
  const bestPost      = [...posts].sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))[0];
  const worstPost     = [...posts].sort((a, b) => (a.like_count + a.comments_count) - (b.like_count + b.comments_count))[0];

  const selectedPostObj = byType.find((m) => m.id === selectedPost);

  return (
    <Card className="col-span-6" delay={0.3}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-dark">Performance de Conteúdo</h3>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedPost("all"); }}
              className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
                activeTab === tab.id ? "bg-white text-text-dark shadow-card" : "text-text-light hover:text-text-medium"
              )}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Post selector */}
      {activeTab !== "stories" && byType.length > 0 && (
        <div className="relative mb-4">
          <button type="button" onClick={() => setShowPostPicker(!showPostPicker)}
            className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-text-medium hover:border-primary/30 transition-all cursor-pointer">
            <span className="truncate">
              {selectedPost === "all"
                ? `Todos os ${activeTab === "reels" ? "Reels" : "posts"} (${byType.length} no período)`
                : truncate(selectedPostObj?.caption)}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform", showPostPicker && "rotate-180")} />
          </button>

          {showPostPicker && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-30 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.1)] overflow-hidden max-h-52 overflow-y-auto">
              <button type="button" onClick={() => { setSelectedPost("all"); setShowPostPicker(false); }}
                className={cn("flex items-center gap-2 w-full px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors cursor-pointer",
                  selectedPost === "all" ? "text-primary font-semibold bg-primary/5" : "text-text-medium"
                )}>
                <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                Todos os posts do período
              </button>
              {byType.map((m) => {
                const Icon = m.media_type === "VIDEO" ? Play : m.media_type === "CAROUSEL_ALBUM" ? Layers : Image;
                return (
                  <button key={m.id} type="button" onClick={() => { setSelectedPost(m.id); setShowPostPicker(false); }}
                    className={cn("flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer text-left",
                      selectedPost === m.id ? "text-primary font-semibold bg-primary/5" : "text-text-medium"
                    )}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 text-text-light" />
                    <span className="flex-1 truncate">{truncate(m.caption, 50)}</span>
                    <span className="flex items-center gap-1 text-text-light flex-shrink-0">
                      <Heart className="w-3 h-3" />{m.like_count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={`${activeTab}-${selectedPost}-${period.id}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

          {activeTab === "stories" ? (
            storiesLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <p className="text-sm text-text-light">Carregando stories…</p>
              </div>
            ) : stories?.error ? (
              <div className="py-6 text-center">
                <CircleDot className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-text-light">{stories.error}</p>
                {stories.hint && <p className="text-xs text-text-light/70 mt-1 max-w-xs mx-auto">{stories.hint}</p>}
              </div>
            ) : stories?.count === 0 ? (
              <div className="py-6 text-center">
                <CircleDot className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-text-light">Nenhum story ativo no momento.</p>
                <p className="text-xs text-text-light/70 mt-1">Stories expiram em 24h.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Aggregate totals */}
                {stories && stories.stories.length > 0 && (() => {
                  const s = stories.stories;
                  const totalImpr  = s.reduce((a,x)=>a+x.insights.impressions,0);
                  const totalReach = s.reduce((a,x)=>a+x.insights.reach,0);
                  const totalReply = s.reduce((a,x)=>a+x.insights.replies,0);
                  const totalExits = s.reduce((a,x)=>a+x.insights.exits,0);
                  const totalFwds  = s.reduce((a,x)=>a+x.insights.taps_forward,0);
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { icon: Eye,              label: "Impressões",  value: totalImpr  },
                          { icon: Eye,              label: "Alcance",     value: totalReach },
                          { icon: MessageCircle,    label: "Respostas",   value: totalReply },
                          { icon: MousePointerClick,label: "Taps →",      value: totalFwds  },
                          { icon: LogOut,           label: "Saídas",      value: totalExits },
                          { icon: CircleDot,        label: "Stories",     value: s.length   },
                        ].map(m => (
                          <div key={m.label} className="p-2.5 rounded-xl bg-slate-50 text-center">
                            <p className="text-sm font-bold text-text-dark">{formatNumber(m.value)}</p>
                            <p className="text-[10px] text-text-light">{m.label}</p>
                          </div>
                        ))}
                      </div>
                      {/* Per-story list */}
                      {s.map((story, i) => (
                        <div key={story.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {i+1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-text-light">{new Date(story.timestamp).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</p>
                            <div className="flex gap-3 text-xs text-text-medium mt-0.5">
                              <span>{story.insights.impressions} impr.</span>
                              <span>{story.insights.reach} alcance</span>
                              <span>{story.insights.replies} resp.</span>
                              <span>{story.insights.exits} saídas</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )
          ) : count === 0 ? (
            <p className="text-sm text-text-light text-center py-6">
              Nenhum post de {activeTab === "reels" ? "Reel" : "Feed"} nos {period.label.toLowerCase()}.
            </p>
          ) : (
            <div>
              {/* Real metrics from API */}
              <MetricRow label="Posts no período" value={count} highlight />
              <MetricRow label="Total de curtidas" value={totalLikes} />
              <MetricRow label="Total de comentários" value={totalComments} />
              <MetricRow label="Média de curtidas/post" value={avgLikes} />
              <MetricRow label="Média de comentários/post" value={avgComments} />
              <MetricRow label="Taxa de engajamento" value={engRate} format="porcentagem" highlight />
              {bestPost && selectedPost === "all" && (
                <MetricRow label="🏆 Melhor post (curtidas)" value={`${bestPost.like_count} ❤️  ${bestPost.comments_count} 💬`} />
              )}
              {worstPost && selectedPost === "all" && count > 1 && (
                <MetricRow label="📉 Post mais fraco" value={`${worstPost.like_count} ❤️  ${worstPost.comments_count} 💬`} />
              )}
              {selectedPost !== "all" && selectedPostObj && (
                <>
                  <MetricRow label="Curtidas" value={selectedPostObj.like_count} highlight />
                  <MetricRow label="Comentários" value={selectedPostObj.comments_count} />
                  <MetricRow label="Engajamento individual"
                    value={((selectedPostObj.like_count + selectedPostObj.comments_count) / followers * 100)}
                    format="porcentagem" highlight />
                  <MetricRow label="Data de publicação"
                    value={new Date(selectedPostObj.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })} />
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
