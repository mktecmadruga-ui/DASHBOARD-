"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import RadarChartComponent from "@/components/charts/RadarChart";
import { formatNumber } from "@/lib/utils";
import { Heart, MessageCircle, Share2, Bookmark, Send, Star, Loader2 } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import { cn } from "@/lib/utils";
import type { InsightsTotals, InstagramMedia } from "@/lib/instagram-api";

export default function EngagementAnalytics() {
  const { account } = useAccount();
  const { period }  = usePeriod();
  const slug = account.id === "william" ? "william" : "madruga";

  const [totals, setTotals]       = useState<InsightsTotals | null>(null);
  const [media, setMedia]         = useState<InstagramMedia[]>([]);
  const [followers, setFollowers] = useState(1);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    setTotals(null);
    setMedia([]);
    Promise.all([
      fetch(`/api/instagram/${slug}/insights?days=${period.days}`).then(r => r.json()),
      fetch(`/api/instagram/${slug}`).then(r => r.json()),
    ]).then(([ins, prof]) => {
      if (ins.totals)    setTotals(ins.totals);
      if (prof.media)    setMedia(prof.media);
      if (prof.profile)  setFollowers(prof.profile.followers_count ?? 1);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [slug, period.days]);

  // Per-post averages from media (real likes/comments)
  const posts = media.filter(m => {
    const age = (Date.now() - new Date(m.timestamp).getTime()) / 86400000;
    return age <= period.days;
  });
  const count       = posts.length || 1;
  const avgLikes    = Math.round((totals?.likes    ?? 0) / count);
  const avgComments = Math.round((totals?.comments ?? 0) / count);

  const engRate = (((totals?.likes ?? 0) + (totals?.comments ?? 0)) / count / followers) * 100;
  const qualityScore = Math.min(10, Math.max(1, Math.round((engRate / 5) * 10 * 10) / 10));

  // Radar — normalize to 0-100 scale
  const maxLikes    = Math.max(avgLikes, 1);
  const radarData = [
    { subject: "Curtidas",           value: Math.min(100, Math.round((avgLikes    / followers) * 100 * 10)) },
    { subject: "Comentários",        value: Math.min(100, Math.round((avgComments / followers) * 100 * 20)) },
    { subject: "Compartilhamentos",  value: Math.min(100, Math.round(((totals?.shares ?? 0) / count / Math.max(maxLikes, 1)) * 100)) },
    { subject: "Salvamentos",        value: Math.min(100, Math.round(((totals?.saves  ?? 0) / count / Math.max(maxLikes, 1)) * 100)) },
    { subject: "Visualizações",      value: Math.min(100, Math.round(((totals?.profile_views ?? 0) / followers) * 100)) },
    { subject: "Interações",         value: Math.min(100, Math.round(engRate * 8)) },
  ];

  const metrics = [
    { label: "Curtidas",            icon: Heart,         value: totals?.likes              ?? 0, sub: `${formatNumber(avgLikes)}/post`,    real: true  },
    { label: "Comentários",         icon: MessageCircle, value: totals?.comments           ?? 0, sub: `${formatNumber(avgComments)}/post`, real: true  },
    { label: "Compartilhamentos",   icon: Share2,        value: totals?.shares             ?? 0, sub: "período",                          real: true  },
    { label: "Salvamentos",         icon: Bookmark,      value: totals?.saves              ?? 0, sub: "período",                          real: true  },
    { label: "Visitas ao Perfil",   icon: Send,          value: totals?.profile_views      ?? 0, sub: "período",                          real: true  },
    { label: "Score de Qualidade",  icon: Star,          value: qualityScore,                    sub: `eng. ${engRate.toFixed(2)}%`,       real: true, format: "score" as const },
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

      {!totals && !loading ? (
        <p className="text-sm text-text-light text-center py-4">Sem dados para este período.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {metrics.map(m => {
              const Icon = m.icon;
              const isScore = m.format === "score";
              return (
                <div key={m.label} className="p-3 rounded-2xl bg-slate-50/80">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className={cn("font-bold text-text-dark", isScore ? "text-base" : "text-lg")}>
                    {loading ? <span className="inline-block w-12 h-5 bg-slate-200 animate-pulse rounded" /> : isScore ? `${m.value}/10` : formatNumber(m.value)}
                  </p>
                  <p className="text-xs text-text-light">{m.label}</p>
                  <p className="text-[10px] text-text-light/70 mt-0.5">{m.sub}</p>
                </div>
              );
            })}
          </div>

          <RadarChartComponent data={radarData} height={220} />

          <p className="text-[10px] text-text-light text-center mt-2">
            Dados reais via Instagram Insights API · período: {period.label}
          </p>
        </>
      )}
    </Card>
  );
}
