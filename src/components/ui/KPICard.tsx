"use client";

import { motion } from "framer-motion";
import { formatNumber, formatPercent } from "@/lib/utils";
import AnimatedCounter from "./AnimatedCounter";
import Badge from "./Badge";
import type { KPI } from "@/types";
import {
  Users, TrendingUp, Eye, BarChart3, Play, Heart, Share2, Bookmark,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  trending: TrendingUp,
  eye: Eye,
  bar: BarChart3,
  play: Play,
  heart: Heart,
  share: Share2,
  bookmark: Bookmark,
};

interface KPICardProps {
  kpi: KPI;
  delay?: number;
}

export default function KPICard({ kpi, delay = 0 }: KPICardProps) {
  const Icon = iconMap[kpi.icon] || BarChart3;
  const formatter = kpi.formato === "porcentagem" ? formatPercent : formatNumber;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${kpi.label}: ${formatter(kpi.valor)}, variação ${kpi.variacao}%`}
      className="group bg-white rounded-3xl border border-slate-100 shadow-glass p-5 hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300"
    >
      <header className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <Badge value={kpi.variacao} />
      </header>
      <div className="mt-2">
        <AnimatedCounter
          value={kpi.valor}
          format={formatter}
          className="text-3xl font-bold text-text-dark tabular-nums leading-none"
        />
        <p className="text-sm text-text-light mt-1.5 leading-tight">{kpi.label}</p>
      </div>
    </motion.article>
  );
}
