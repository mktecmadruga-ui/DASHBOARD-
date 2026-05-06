"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import { useAccount } from "@/context/AccountContext";
import { formatNumber } from "@/lib/utils";
import { Heart, MessageCircle, Play, Image, Layers, Loader2, ExternalLink, X, TrendingUp, TrendingDown, Award } from "lucide-react";
import type { InstagramMedia } from "@/lib/instagram-api";

const mediaTypeIcon = { VIDEO: Play, IMAGE: Image, CAROUSEL_ALBUM: Layers };
const mediaTypeLabel = { VIDEO: "Reel", IMAGE: "Foto", CAROUSEL_ALBUM: "Carrossel" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

function truncate(text: string | undefined, max = 60) {
  if (!text) return "Sem legenda";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function analyzePost(post: InstagramMedia, avgLikes: number, avgComments: number, followers: number) {
  const engagement = ((post.like_count + post.comments_count) / Math.max(followers, 1)) * 100;
  const avgEngagement = ((avgLikes + avgComments) / Math.max(followers, 1)) * 100;
  const ratio = engagement / Math.max(avgEngagement, 0.01);

  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (post.media_type === "VIDEO") {
    if (ratio > 1.5) {
      reasons.push("Reels têm maior alcance orgânico no algoritmo do Instagram em 2025-2026");
      reasons.push("Formato em vídeo gera mais tempo de tela, sinalizando relevância ao algoritmo");
    } else {
      suggestions.push("Tente hooks mais fortes nos primeiros 3 segundos — mostre o resultado antes do processo");
      suggestions.push("Adicione texto na tela para capturar quem assiste sem som");
    }
  }

  if (post.media_type === "CAROUSEL_ALBUM") {
    if (ratio > 1.2) {
      reasons.push("Carrosséis aumentam o tempo de interação e geram mais salvamentos naturalmente");
      reasons.push("Múltiplos slides criam expectativa e incentivam deslizar até o final");
    } else {
      suggestions.push("Primeiro slide deve resolver uma dor clara — tente 'X erros que você comete em Y'");
      suggestions.push("Último slide com CTA forte aumenta salvamentos e compartilhamentos");
    }
  }

  if (post.like_count > avgLikes * 2) reasons.push("Alto volume de curtidas indica que o conteúdo ressoou emocionalmente com o público");
  if (post.comments_count > avgComments * 2) reasons.push("Muitos comentários sugerem que o post gerou debate ou pedido de mais informação");
  if (post.like_count < avgLikes * 0.5) suggestions.push("Revise o horário de publicação — tente entre 19h-21h quando seu público está mais ativo");
  if (post.comments_count === 0) suggestions.push("Inclua uma pergunta direta no texto para estimular comentários");

  const caption = post.caption ?? "";
  if (caption.length < 50) suggestions.push("Legenda curta pode reduzir o alcance — tente 150-300 caracteres com palavras-chave do seu nicho");
  if (caption.includes("#") || caption.includes("hashtag")) {
    reasons.push("Uso estratégico de hashtags relevantes amplia o alcance para novos usuários");
  } else {
    suggestions.push("Adicione 5-10 hashtags relevantes para ampliar o alcance orgânico");
  }

  return { ratio, engagement, reasons: reasons.slice(0, 3), suggestions: suggestions.slice(0, 3) };
}

function PostDetailModal({ post, rank, avgLikes, avgComments, followers, onClose }: {
  post: InstagramMedia; rank: number; avgLikes: number; avgComments: number; followers: number; onClose: () => void;
}) {
  const Icon = mediaTypeIcon[post.media_type] ?? Play;
  const analysis = analyzePost(post, avgLikes, avgComments, followers);
  const engRate = analysis.engagement.toFixed(1);
  const isGood = analysis.ratio >= 1;

  const igUrl = `https://www.instagram.com/p/${post.id}/`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto z-10"
        >
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">#{rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-text-light" />
                <span className="text-xs text-text-light">{mediaTypeLabel[post.media_type]} · {formatDate(post.timestamp)}</span>
              </div>
              <p className="text-sm font-medium text-text-dark truncate mt-0.5">{truncate(post.caption, 50)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={igUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-text-medium" />
              </a>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-text-medium" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-danger/5 border border-danger/10 text-center">
                <Heart className="w-4 h-4 text-danger mx-auto mb-1" />
                <p className="text-lg font-bold text-text-dark">{formatNumber(post.like_count)}</p>
                <p className="text-[10px] text-text-light">Curtidas</p>
              </div>
              <div className="p-3 rounded-2xl bg-info/5 border border-info/10 text-center">
                <MessageCircle className="w-4 h-4 text-info mx-auto mb-1" />
                <p className="text-lg font-bold text-text-dark">{formatNumber(post.comments_count)}</p>
                <p className="text-[10px] text-text-light">Comentários</p>
              </div>
              <div className={`p-3 rounded-2xl text-center ${isGood ? "bg-success/5 border border-success/10" : "bg-warning/5 border border-warning/10"}`}>
                {isGood ? <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" /> : <TrendingDown className="w-4 h-4 text-warning mx-auto mb-1" />}
                <p className="text-lg font-bold text-text-dark">{engRate}%</p>
                <p className="text-[10px] text-text-light">Engajamento</p>
              </div>
            </div>

            {/* Performance vs média */}
            <div className={`p-4 rounded-2xl ${isGood ? "bg-success/5 border border-success/15" : "bg-warning/5 border border-warning/15"}`}>
              <div className="flex items-center gap-2 mb-2">
                {isGood ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-warning" />}
                <p className="text-xs font-semibold" style={{ color: isGood ? "#22C55E" : "#FFB800" }}>
                  {isGood ? `${analysis.ratio.toFixed(1)}× acima da sua média` : `${(1/Math.max(analysis.ratio,0.01)).toFixed(1)}× abaixo da sua média`}
                </p>
              </div>
              <p className="text-xs text-text-medium">Engajamento médio dos seus posts: {((avgLikes + avgComments) / Math.max(followers, 1) * 100).toFixed(1)}%</p>
            </div>

            {/* Legenda completa */}
            {post.caption && (
              <div>
                <p className="text-xs font-semibold text-text-medium mb-2 uppercase tracking-wide">Legenda</p>
                <p className="text-xs text-text-medium leading-relaxed bg-slate-50 rounded-2xl p-3 max-h-32 overflow-y-auto">{post.caption}</p>
              </div>
            )}

            {/* Análise IA */}
            {analysis.reasons.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-text-dark">Por que esse post foi bem</p>
                </div>
                <div className="space-y-2">
                  {analysis.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-text-medium">
                      <span className="text-primary mt-0.5">✓</span>{r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-warning" />
                  <p className="text-xs font-semibold text-text-dark">{isGood ? "Como manter esse nível" : "O que melhorar nos próximos"}</p>
                </div>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-text-medium">
                      <span className="text-warning mt-0.5">→</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a href={igUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
              <ExternalLink className="w-4 h-4" />
              Ver publicação no Instagram
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function TopContent() {
  const { account } = useAccount();
  const slug = account.id === "william" ? "william" : "madruga";
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<{ post: InstagramMedia; rank: number } | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/instagram/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.media) {
          const sorted = [...data.media].sort(
            (a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count)
          );
          setMedia(sorted);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const followers = account.kpis[0]?.valor ?? 1;
  const avgLikes = media.length ? media.reduce((s, m) => s + m.like_count, 0) / media.length : 0;
  const avgComments = media.length ? media.reduce((s, m) => s + m.comments_count, 0) / media.length : 0;

  const top3 = media.slice(0, 3);
  const rest = media.slice(3);

  return (
    <>
      <Card className="col-span-8" delay={0.4}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">Top Conteúdos</h3>
            <p className="text-sm text-text-light mt-0.5">Posts reais do @{account.usuario.replace("@", "")} — clique para análise</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {!loading && media.length > 3 && (
              <button onClick={() => setShowAll(!showAll)}
                className="text-xs text-primary font-medium hover:opacity-70 transition-opacity cursor-pointer">
                {showAll ? "Ver menos" : `Ver todos (${media.length})`}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map((i) => <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-44" />)}
          </div>
        ) : top3.length === 0 ? (
          <p className="text-sm text-text-light text-center py-8">Nenhum post encontrado.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {top3.map((item, i) => {
                const Icon = mediaTypeIcon[item.media_type] ?? Play;
                const engRate = ((item.like_count + item.comments_count) / Math.max(followers, 1) * 100).toFixed(1);
                return (
                  <motion.button key={item.id} type="button" onClick={() => setSelectedPost({ post: item, rank: i + 1 })}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border border-slate-100 p-4 hover:shadow-card-hover transition-all duration-300 text-left cursor-pointer w-full"
                  >
                    <div className="w-full h-28 rounded-xl bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center mb-3 overflow-hidden">
                      {item.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                      ) : item.media_url && item.media_type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.media_url} alt="post" className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-8 h-8 text-primary/60" />
                      )}
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                        <Icon className="w-3 h-3" />{mediaTypeLabel[item.media_type]}
                      </span>
                    </div>
                    {i === 0 && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-bold">🔥 Top</span>
                    )}
                    <p className="text-xs text-text-light mb-1">{formatDate(item.timestamp)}</p>
                    <h4 className="text-sm font-medium text-text-dark mb-3 line-clamp-1">{truncate(item.caption)}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-danger/70" /><span className="text-xs text-text-medium">{formatNumber(item.like_count)}</span></div>
                      <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-info/70" /><span className="text-xs text-text-medium">{formatNumber(item.comments_count)}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-light">Engajamento</span>
                        <span className="text-xs font-semibold text-primary">{engRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${Math.min(parseFloat(engRate) * 10, 100)}%` }} />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Full list */}
            <AnimatePresence>
              {(showAll || rest.length > 0) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
                  <p className="text-xs font-semibold text-text-light uppercase tracking-wider mb-3">
                    {showAll ? "Todos os posts" : "Outros posts"}
                  </p>
                  <div className="space-y-2">
                    {(showAll ? media.slice(3) : rest.slice(0, 3)).map((item, i) => {
                      const Icon = mediaTypeIcon[item.media_type] ?? Play;
                      const rank = (showAll ? 4 : 4) + i;
                      return (
                        <button key={item.id} type="button" onClick={() => setSelectedPost({ post: item, rank })}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-text-light flex-shrink-0">
                            #{rank}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-dark truncate group-hover:text-primary transition-colors">{truncate(item.caption, 50)}</p>
                            <p className="text-[10px] text-text-light">{formatDate(item.timestamp)}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-light flex-shrink-0">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(item.like_count)}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(item.comments_count)}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </Card>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost.post}
          rank={selectedPost.rank}
          avgLikes={avgLikes}
          avgComments={avgComments}
          followers={followers}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
}
