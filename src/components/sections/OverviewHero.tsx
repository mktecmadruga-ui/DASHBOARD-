"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import KPICard from "@/components/ui/KPICard";
import { useAccount } from "@/context/AccountContext";
import { usePeriod } from "@/context/PeriodContext";
import type { KPI } from "@/types";
import type { InstagramProfile, InstagramMedia } from "@/lib/instagram-api";

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
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia]     = useState<InstagramMedia[]>([]);

  useEffect(() => {
    fetch(`/api/instagram/${slug}`)
      .then((r) => r.json())
      .then((data) => {
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
    <section>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          {profile?.profile_picture_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_picture_url}
              alt={profile.username}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/20"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-text-dark">Visão Geral</h2>
            <p className="text-sm text-text-light mt-1">
              @{profile?.username ?? account.usuario.replace("@", "")} · {account.nicho} · {period.label}
            </p>
          </div>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.label} kpi={kpi} delay={i * 0.07} />
        ))}
      </div>
    </section>
  );
}
