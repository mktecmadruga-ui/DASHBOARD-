"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface AreaChartPremiumProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
}

interface TooltipProps { active?: boolean; payload?: { value: number }[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-glass-hover px-4 py-3">
      <p className="text-xs text-text-light mb-1">{label}</p>
      {payload.map((entry, i: number) => (
        <p key={i} className="text-sm font-semibold text-text-dark">
          {Number(entry.value).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

export default function AreaChartPremium({
  data,
  dataKey,
  xKey = "data",
  color = COLORS.primary,
  height = 280,
  showGrid = false,
  showAxis = true,
}: AreaChartPremiumProps) {
  const gradientId = `gradient-${dataKey}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        )}
        {showAxis && (
          <>
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: color, fill: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
