"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface FunnelStep {
  label: string;
  valor: number;
  cor: string;
}

interface FunnelChartProps {
  data: FunnelStep[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = data[0]?.valor || 1;

  return (
    <ul className="flex flex-col gap-2.5" role="list">
      {data.map((step, i) => {
        const pct        = (step.valor / maxValue) * 100;
        const conversion = i > 0 ? ((step.valor / data[i - 1].valor) * 100).toFixed(1) : null;
        return (
          <motion.li
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            {/* Full-width row with internal colored fill */}
            <div
              className="flex-1 h-9 rounded-xl relative overflow-hidden border"
              style={{ borderColor: `${step.cor}30`, background: `${step.cor}08` }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 rounded-xl"
                style={{ background: `linear-gradient(90deg, ${step.cor}30, ${step.cor}20)` }}
                aria-hidden="true"
              />
              <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-text-dark truncate">
                {step.label}
              </span>
            </div>

            {/* Right-side value column (fixed width for alignment) */}
            <div className="w-16 text-right flex-shrink-0">
              <p className="text-sm font-semibold text-text-dark tabular-nums leading-tight">
                {formatNumber(step.valor)}
              </p>
              {conversion && (
                <p className="text-[11px] text-text-light tabular-nums">{conversion}%</p>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
