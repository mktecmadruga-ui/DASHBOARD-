"use client";

import Card from "@/components/ui/Card";
import FunnelChart from "@/components/charts/FunnelChart";
import { funnelData } from "@/data/mock-retention";

export default function ConversionFunnel() {
  const total = funnelData[0]?.valor || 1;
  const conversoes = funnelData[funnelData.length - 1]?.valor || 0;
  const taxaGeral = ((conversoes / total) * 100).toFixed(2);

  return (
    <Card className="col-span-4" delay={0.55}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">Funil de Conversão</h3>
          <p className="text-sm text-text-light mt-0.5">Taxa geral: <span className="text-primary font-semibold">{taxaGeral}%</span></p>
        </div>
      </div>
      <FunnelChart data={funnelData} />
    </Card>
  );
}
