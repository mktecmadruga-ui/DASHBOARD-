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
    <div className="flex flex-col gap-3">
      {data.map((step, i) => {
        const width = Math.max(30, (step.valor / maxValue) * 100);
        const conversion = i > 0 ? ((step.valor / data[i - 1].valor) * 100).toFixed(1) : null;

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4"
          >
            <div className="flex-1">
              <div
                className="h-10 rounded-xl flex items-center px-4 relative overflow-hidden"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${step.cor}20, ${step.cor}40)`,
                  border: `1px solid ${step.cor}30`,
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                  className="absolute inset-y-0 left-0 opacity-30 rounded-xl"
                  style={{ background: `linear-gradient(90deg, ${step.cor}, transparent)` }}
                />
                <span className="text-xs font-medium text-text-dark relative z-10">
                  {step.label}
                </span>
              </div>
            </div>
            <div className="w-20 text-right">
              <p className="text-sm font-semibold text-text-dark">{formatNumber(step.valor)}</p>
              {conversion && (
                <p className="text-xs text-text-light">{conversion}%</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
