"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import KPICard from "@/components/ui/KPICard";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import type { KPI } from "@/types";
import type { InstagramProfile, InstagramMedia } from "@/lib/instagram-api";
import { AlertTriangle } from "lucide-react";

// Scale factor vs 30-day baseline for each period
const periodScale: Record<string, number> = {
  "7d":  7  / 30,
  "30d": 1,
  "90d": 3,
  "6m":  6,
  "1a":  12,
};

// Labels that should NOT be scaled (rates / point-in-time values)
const noScaleLabels = new Set(["Seguidores", "Posts Publicados", "Taxa de Engajamento"]);

export default function OverviewHero() {
  const { account } = useAccount();
  const { period } = usePeriod();
  const slug = account.id === "william" ? "william" : "madruga";
  const [profile, setProfile]         = useState<InstagramProfile | null>(null);
  const [media, setMedia]             = useState<InstagramMedia[]>([]);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    setTokenExpired(false);
    fetch(`/api/instagram/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "token_expired") { setTokenExpired(true); return; }
        if (data.profile) setProfile(data.profile);
        if (data.media)   setMedia(data.media);
      })
      .catch(console.error);
  }, [slug]);

  // Count posts published within selected period from real API data
  const postsInPeriod = media.filter((m) => {
    const age = (Date.now() - new Date(m.timestamp).getTime()) / 86400000;
    return age <= period.days;
  }).length;

  const scale = periodScale[period.id] ?? 1;

  const kpis: KPI[] = account.kpis.map((kpi) => {
    // Seguidores: always real current count
    if (kpi.label === "Seguidores" && profile) {
      return { ...kpi, valor: profile.followers_count };
    }

    // Posts: count real posts in period when available, else scale
    if (kpi.label === "Posts Publicados") {
      const val = media.length > 0 ? postsInPeriod : Math.round(kpi.valor * scale);
      return { ...kpi, valor: val };
    }

    // Rates stay flat — only label annotation changes
    if (noScaleLabels.has(kpi.label)) {
      return { ...kpi };
    }

    // Volume metrics scale with period
    return { ...kpi, valor: Math.round(kpi.valor * scale) };
  });

  return (
    <section aria-label="Visão Geral do perfil">
      {tokenExpired && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 mb-4 px-4 py-3 rounded-2xl bg-warning/10 border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warning">Token do Instagram expirado</p>
            <p className="text-xs text-warning/80 mt-0.5 leading-relaxed">
              Gere um novo token IGAA para <strong>@williamnmadruga</strong> via <strong>Instagram Basic Display API</strong> e atualize a variável <code className="px-1 py-0.5 rounded bg-warning/10 font-mono">NEXT_PUBLIC_INSTAGRAM_TOKEN_WILLIAM</code> na Vercel.
            </p>
          </div>
        </motion.div>
      )}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex items-center gap-3"
      >
        {profile?.profile_picture_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profile_picture_url}
            alt=""
            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-text-dark tracking-tight leading-tight">Visão Geral</h2>
          <p className="text-sm text-text-light mt-0.5 truncate">
            @{profile?.username ?? account.usuario.replace("@", "")}
            <span className="mx-1.5 opacity-40">·</span>
            {account.nicho}
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-text-medium font-medium">{period.label}</span>
          </p>
        </div>
      </motion.header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.label} kpi={kpi} delay={i * 0.07} />
        ))}
      </div>
    </section>
  );
}
