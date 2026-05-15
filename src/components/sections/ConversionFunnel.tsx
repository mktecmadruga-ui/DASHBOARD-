"use client";

import Card from "@/components/ui/Card";
import FunnelChart from "@/components/charts/FunnelChart";
import { funnelData } from "@/data/mock-retention";

export default function ConversionFunnel() {
  const total      = funnelData[0]?.valor || 1;
  const conversoes = funnelData[funnelData.length - 1]?.valor || 0;
  const taxaGeral  = ((conversoes / total) * 100).toFixed(2);

  return (
    <Card
      delay={0.55}
      title="Funil de Conversão"
      subtitle={
        <span className="text-sm text-text-light">
          Taxa geral: <span className="text-primary font-semibold tabular-nums">{taxaGeral}%</span>
        </span>
      }>
      <FunnelChart data={funnelData} />
    </Card>
  );
}
