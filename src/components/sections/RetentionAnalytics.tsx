"use client";

import Card from "@/components/ui/Card";
import AreaChartPremium from "@/components/charts/AreaChartPremium";
import { retentionCurve, retentionMetrics } from "@/data/mock-retention";
import { COLORS } from "@/lib/constants";

const stats = [
  { label: "Hook 3s",     value: `${retentionMetrics.hookRate}%`,         color: "text-primary",  bg: "bg-primary/5"  },
  { label: "Tempo Médio", value: `${retentionMetrics.avgWatchTime}s`,     color: "text-info",     bg: "bg-info/5"     },
  { label: "Conclusão",   value: `${retentionMetrics.completionRate}%`,   color: "text-success",  bg: "bg-success/5"  },
  { label: "Replay",      value: `${retentionMetrics.replayRate}%`,       color: "text-warning",  bg: "bg-warning/5"  },
];

export default function RetentionAnalytics() {
  return (
    <Card
      delay={0.5}
      title="Retenção de Audiência"
      subtitle="Curva de retenção segundo a segundo">
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {stats.map((s) => (
          <div key={s.label} className={`p-3 rounded-2xl ${s.bg}`}>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-text-light mt-0.5 leading-tight">{s.label}</p>
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
      <p className="text-[11px] text-text-light text-center mt-2 uppercase tracking-wider">
        Segundos do vídeo
      </p>
    </Card>
  );
}
