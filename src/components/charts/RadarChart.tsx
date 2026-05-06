"use client";

import {
  RadarChart as ReRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface RadarChartProps {
  data: { subject: string; value: number }[];
  color?: string;
  height?: number;
}

export default function RadarChartComponent({
  data,
  color = COLORS.primary,
  height = 250,
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
        />
        <Radar
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid #F1F5F9",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        />
      </ReRadarChart>
    </ResponsiveContainer>
  );
}
