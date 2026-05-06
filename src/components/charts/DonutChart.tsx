"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS } from "@/lib/constants";

interface DonutChartProps {
  data: { label: string; valor: number }[];
  colors?: string[];
  size?: number;
}

const DEFAULT_COLORS = [COLORS.primary, COLORS.primaryLight, COLORS.info, COLORS.success, COLORS.warning];

interface TooltipProps { active?: boolean; payload?: { name: string; value: number }[]; }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-slate-100 shadow-glass px-3 py-2">
      <p className="text-xs font-medium text-text-dark">{payload[0].name}</p>
      <p className="text-xs text-text-medium">{payload[0].value}%</p>
    </div>
  );
}

export default function DonutChart({ data, colors = DEFAULT_COLORS, size = 200 }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={size * 0.3}
          outerRadius={size * 0.42}
          strokeWidth={0}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
