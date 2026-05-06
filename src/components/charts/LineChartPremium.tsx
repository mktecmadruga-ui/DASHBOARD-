"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
interface Series {
  dataKey: string;
  color: string;
  name: string;
}

interface LineChartPremiumProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
}

interface TooltipEntry { color: string; name: string; value: number; }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-glass-hover px-4 py-3">
      <p className="text-xs text-text-light mb-2">{label}</p>
      {payload.map((entry, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-xs text-text-medium">{entry.name}:</span>
          <span className="text-xs font-semibold text-text-dark">
            {Number(entry.value).toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LineChartPremium({
  data,
  series,
  xKey = "data",
  height = 300,
}: LineChartPremiumProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
        />
        {series.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: s.color, fill: "#fff" }}
            name={s.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
