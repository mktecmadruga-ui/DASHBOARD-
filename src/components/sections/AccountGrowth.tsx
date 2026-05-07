"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LineChartPremium from "@/components/charts/LineChartPremium";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import { COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Heart, MessageCircle, Share2, Bookmark, Eye, Loader2 } from "lucide-react";
import type { InsightsTimeSeries, InsightsTotals, InstagramMedia } from "@/lib/instagram-api";

const seriesGrowth = [
  { dataKey: "alcance",    color: COLORS.info,    name: "Alcance"    },
  { dataKey: "seguidores", color: COLORS.primary, name: "Seguidores" },
];

const seriesEngagement = [
  { dataKey: "curtidas",    color: COLORS.danger,  name: "Curtidas"    },
  { dataKey: "comentarios", color: COLORS.success, name: "Comentários" },
];

const periodosBtns = [
  { id: "7d",  label: "7 dias",  days: 7  },
  { id: "30d", label: "30 dias", days: 30 },
  { id: "90d", label: "90 dias", days: 90 },
  { id: "6m",  label: "6 meses", days: 180},
] as const;

export default function AccountGrowth() {
  const { account }           = useAccount();
  const { period, setPeriodId } = usePeriod();
  const slug = account.id === "william" ? "william" : "madruga";

  const [timeSeries, setTimeSeries] = useState<InsightsTimeSeries[]>([]);
  const [totals, setTotals]         = useState<InsightsTotals | null>(null);
  const [media, setMedia]           = useState<InstagramMedia[]>([]);
  const [loading, setLoading]       = useState(true);

  const days = periodosBtns.find(p => p.id === period.id)?.days ?? 30;

  useEffect(() => {
    setLoading(true);
    setTimeSeries([]);
    setTotals(null);

    const base = `/api/instagram/${slug}`;
    Promise.all([
      fetch(`${base}/insights?days=${days}`).then(r => r.json()),
      fetch(base).then(r => r.json()),
    ]).then(([ins, media]) => {
      if (ins.timeSeries) setTimeSeries(ins.timeSeries);
      if (ins.totals)     setTotals(ins.totals);
      if (media.media)    setMedia(media.media);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, days]);

  // Engagement sub-chart: interpolate likes/comments from real media per day
  const engagementData = timeSeries.map((pt, i, arr) => {
    if (!media.length) return { data: pt.date, curtidas: 0, comentarios: 0 };
    const fraction  = i / Math.max(arr.length - 1, 1);
    const pointDate = new Date(Date.now() - (1 - fraction) * days * 86400000);
    const sorted    = [...media].sort((a, b) =>
      Math.abs(new Date(a.timestamp).getTime() - pointDate.getTime()) -
      Math.abs(new Date(b.timestamp).getTime() - pointDate.getTime())
    );
    const closest = sorted.slice(0, 3);
    return {
      data:        pt.date,
      curtidas:    Math.round(closest.reduce((s, m) => s + m.like_count,     0) / closest.length),
      comentarios: Math.round(closest.reduce((s, m) => s + m.comments_count, 0) / closest.length),
    };
  });

  const statCards = totals ? [
    { icon: Eye,           label: "Visualizações de perfil", value: totals.profile_views,      color: "text-primary",  bg: "bg-primary/5 border-primary/10"  },
    { icon: Heart,         label: "Curtidas",                value: totals.likes,               color: "text-danger",   bg: "bg-danger/5 border-danger/10"    },
    { icon: MessageCircle, label: "Comentários",             value: totals.comments,            color: "text-info",     bg: "bg-info/5 border-info/10"        },
    { icon: Share2,        label: "Compartilhamentos",       value: totals.shares,              color: "text-warning",  bg: "bg-warning/5 border-warning/10"  },
    { icon: Bookmark,      label: "Salvamentos",             value: totals.saves,               color: "text-success",  bg: "bg-success/5 border-success/10"  },
  ] : [];

  return (
    <Card delay={0.2}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">Crescimento da Conta</h3>
          <p className="text-sm text-text-light mt-0.5">
            {account.usuario} · dados reais via Instagram API
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl">
            {periodosBtns.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodId(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  period.id === p.id ? "bg-white text-primary shadow-card" : "text-text-light hover:text-text-medium"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Totals strip */}
      {statCards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {statCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${bg}`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-xs font-semibold text-text-dark">{formatNumber(value)}</span>
              <span className="text-[10px] text-text-light">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico Alcance + Seguidores */}
      {timeSeries.length > 0 ? (
        <LineChartPremium data={timeSeries} series={seriesGrowth} height={200} xKey="date" />
      ) : !loading ? (
        <div className="h-48 flex items-center justify-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <p className="text-xs text-text-light">Sem dados de alcance para este período.</p>
        </div>
      ) : (
        <div className="h-48 bg-slate-50 animate-pulse rounded-2xl" />
      )}

      {/* Gráfico Curtidas + Comentários */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-3.5 h-3.5 text-danger" />
          <p className="text-sm font-semibold text-text-dark">Curtidas &amp; Comentários</p>
          <span className="text-[10px] text-text-light ml-1">média por post · período</span>
        </div>
        {engagementData.length > 0 ? (
          <LineChartPremium data={engagementData} series={seriesEngagement} height={160} />
        ) : (
          <div className="h-36 bg-slate-50 animate-pulse rounded-2xl" />
        )}
      </div>
    </Card>
  );
}
