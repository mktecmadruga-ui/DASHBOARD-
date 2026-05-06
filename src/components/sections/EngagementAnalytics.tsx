"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import RadarChartComponent from "@/components/charts/RadarChart";
import { formatNumber } from "@/lib/utils";
import { Heart, MessageCircle, Share2, Bookmark, Send, Star, Loader2 } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import { cn } from "@/lib/utils";
import type { InstagramMedia } from "@/lib/instagram-api";

export default function EngagementAnalytics() {
  const { account } = useAccount();
  const { period }  = usePeriod();
  const slug = account.id === "william" ? "william" : "madruga";

  const [media, setMedia]       = useState<InstagramMedia[]>([]);
  const [followers, setFollowers] = useState(1);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/instagram/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.media)   setMedia(d.media);
        if (d.profile) setFollowers(d.profile.followers_count ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Filter by selected period
  const posts = media.filter(m => {
    const age = (Date.now() - new Date(m.timestamp).getTime()) / 86400000;
    return age <= period.days;
  });

  const count        = posts.length || 1;
  const totalLikes   = posts.reduce((s, m) => s + m.like_count, 0);
  const totalComments = posts.reduce((s, m) => s + m.comments_count, 0);
  const avgLikes     = Math.round(totalLikes / count);
  const avgComments  = Math.round(totalComments / count);

  // Estimated metrics based on typical Instagram engagement ratios
  // Shares ≈ 20-30% of likes, Saves ≈ 15-25% of likes (conservative)
  const estShares    = Math.round(totalLikes * 0.08);
  const estSaves     = Math.round(totalLikes * 0.12);
  const estDMs       = Math.round(totalComments * 0.15);

  // Quality score: engagement rate normalized to 0-10
  const engRate = ((totalLikes + totalComments) / count / followers) * 100;
  // Instagram avg: 1-3% = 5/10, >5% = 9/10
  const qualityScore = Math.min(10, Math.max(1, Math.round((engRate / 5) * 10 * 10) / 10));

  // Radar: normalize each metric relative to followers (percentage of followers)
  const radarData = [
    { subject: "Curtidas",        value: Math.min(100, Math.round((avgLikes / followers) * 100 * 10)) },
    { subject: "Comentários",     value: Math.min(100, Math.round((avgComments / followers) * 100 * 20)) },
    { subject: "Compartilhamentos", value: Math.min(100, Math.round((estShares / count / followers) * 100 * 15)) },
    { subject: "Salvamentos",     value: Math.min(100, Math.round((estSaves / count / followers) * 100 * 12)) },
    { subject: "DMs",             value: Math.min(100, Math.round((estDMs / count / followers) * 100 * 25)) },
    { subject: "Menções",         value: Math.min(100, Math.round(engRate * 8)) },
  ];

  const metrics = [
    {
      label: "Curtidas",
      icon: Heart,
      value: totalLikes,
      sub: `${formatNumber(avgLikes)}/post`,
      format: "number" as const,
      real: true,
    },
    {
      label: "Comentários",
      icon: MessageCircle,
      value: totalComments,
      sub: `${formatNumber(avgComments)}/post`,
      format: "number" as const,
      real: true,
    },
    {
      label: "Compartilhamentos",
      icon: Share2,
      value: estShares,
      sub: "estimado",
      format: "number" as const,
      real: false,
    },
    {
      label: "Salvamentos",
      icon: Bookmark,
      value: estSaves,
      sub: "estimado",
      format: "number" as const,
      real: false,
    },
    {
      label: "DMs Geradas",
      icon: Send,
      value: estDMs,
      sub: "estimado",
      format: "number" as const,
      real: false,
    },
    {
      label: "Score de Qualidade",
      icon: Star,
      value: qualityScore,
      sub: `eng. ${engRate.toFixed(2)}%`,
      format: "score" as const,
      real: true,
    },
  ];

  return (
    <Card className="col-span-6" delay={0.35}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-text-dark">Análise de Engajamento</h3>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          <span className="text-xs text-text-light">{period.label}</span>
        </div>
      </div>

      {posts.length === 0 && !loading ? (
        <p className="text-sm text-text-light text-center py-4">
          Nenhum post encontrado nos {period.label.toLowerCase()}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {metrics.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="p-3 rounded-2xl bg-slate-50/80">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    {!m.real && (
                      <span className="text-[9px] text-text-light bg-slate-200/60 px-1.5 py-0.5 rounded-full">est.</span>
                    )}
                  </div>
                  <p className={cn("font-bold text-text-dark", m.format === "score" ? "text-base" : "text-lg")}>
                    {m.format === "score"
                      ? `${m.value}/10`
                      : formatNumber(m.value)}
                  </p>
                  <p className="text-xs text-text-light">{m.label}</p>
                  <p className="text-[10px] text-text-light/70 mt-0.5">{m.sub}</p>
                </div>
              );
            })}
          </div>

          <RadarChartComponent data={radarData} height={220} />

          <p className="text-[10px] text-text-light text-center mt-2">
            Curtidas e comentários são dados reais da API · Compartilhamentos, salvamentos e DMs são estimados
          </p>
        </>
      )}
    </Card>
  );
}
