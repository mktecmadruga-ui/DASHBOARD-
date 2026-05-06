"use client";

import Card from "@/components/ui/Card";
import AreaChartPremium from "@/components/charts/AreaChartPremium";
import { retentionCurve, retentionMetrics } from "@/data/mock-retention";
import { COLORS } from "@/lib/constants";

const stats = [
  { label: "Hook 3s", value: `${retentionMetrics.hookRate}%`, color: "text-primary" },
  { label: "Tempo Médio", value: `${retentionMetrics.avgWatchTime}s`, color: "text-info" },
  { label: "Conclusão", value: `${retentionMetrics.completionRate}%`, color: "text-success" },
  { label: "Replay", value: `${retentionMetrics.replayRate}%`, color: "text-warning" },
];

export default function RetentionAnalytics() {
  return (
    <Card className="col-span-4" delay={0.5}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-dark">Retenção de Audiência</h3>
        <p className="text-sm text-text-light mt-0.5">Curva de retenção segundo a segundo</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="p-3 rounded-2xl bg-slate-50">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-text-light mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <AreaChartPremium
        data={retentionCurve}
        dataKey="retencao"
        xKey="segundo"
        color={COLORS.primary}
        height={180}
        showGrid={false}
        showAxis={true}
      />
      <p className="text-xs text-text-light text-center mt-2">Segundos do vídeo</p>
    </Card>
  );
}
