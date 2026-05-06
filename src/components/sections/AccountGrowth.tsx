"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LineChartPremium from "@/components/charts/LineChartPremium";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import { COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Heart, MessageCircle } from "lucide-react";
import type { InstagramMedia } from "@/lib/instagram-api";

const series = [
  { dataKey: "alcance",    color: COLORS.info,    name: "Alcance"    },
  { dataKey: "seguidores", color: COLORS.primary, name: "Seguidores" },
];

const periodosBtns = [
  { id: "7d",  label: "7 dias"  },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "6m",  label: "6 meses"},
] as const;

export default function AccountGrowth() {
  const { account } = useAccount();
  const { period, setPeriodId } = usePeriod();
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const slug = account.id === "william" ? "william" : "madruga";

  useEffect(() => {
    fetch(`/api/instagram/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.media) setMedia(d.media); })
      .catch(console.error);
  }, [slug]);

  const dataMap: Record<string, typeof account.growth30> = {
    "7d":  account.growth30.slice(-4),
    "30d": account.growth30,
    "90d": account.growth90,
    "6m":  account.growth6m,
    "1a":  account.growth6m,
  };
  const chartData = dataMap[period.id] ?? account.growth30;

  const avgLikes    = media.length ? Math.round(media.reduce((s, m) => s + m.like_count, 0) / media.length) : null;
  const avgComments = media.length ? Math.round(media.reduce((s, m) => s + m.comments_count, 0) / media.length) : null;

  return (
    <Card delay={0.2}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">Crescimento da Conta</h3>
          <p className="text-sm text-text-light mt-0.5">{account.usuario} · Seguidores e alcance</p>
        </div>
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

      {/* Real avg stats from API */}
      {avgLikes !== null && (
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger/5 border border-danger/10">
            <Heart className="w-3.5 h-3.5 text-danger" />
            <span className="text-xs font-semibold text-text-dark">{formatNumber(avgLikes)}</span>
            <span className="text-[10px] text-text-light">méd. curtidas/post</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-info/5 border border-info/10">
            <MessageCircle className="w-3.5 h-3.5 text-info" />
            <span className="text-xs font-semibold text-text-dark">{formatNumber(avgComments ?? 0)}</span>
            <span className="text-[10px] text-text-light">méd. comentários/post</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/5 border border-success/10">
            <span className="text-xs font-semibold text-text-dark">{media.length}</span>
            <span className="text-[10px] text-text-light">posts analisados</span>
          </div>
        </div>
      )}

      <LineChartPremium data={chartData} series={series} height={250} />
    </Card>
  );
}
