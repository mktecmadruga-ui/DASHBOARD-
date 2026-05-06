"use client";

import Card from "@/components/ui/Card";
import DonutChart from "@/components/charts/DonutChart";
import { audienceData } from "@/data/mock-audience";
import { COLORS } from "@/lib/constants";

const GENDER_COLORS = [COLORS.primary, COLORS.info, COLORS.primaryLight];
const AGE_COLORS = [COLORS.primary, COLORS.primaryLight, COLORS.info, COLORS.success, COLORS.warning, COLORS.danger];

export default function AudienceAnalytics() {
  return (
    <Card className="col-span-4" delay={0.5}>
      <h3 className="text-lg font-semibold text-text-dark mb-5">Audiência</h3>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <p className="text-xs text-text-light text-center mb-1">Gênero</p>
          <DonutChart data={audienceData.genero} colors={GENDER_COLORS} size={130} />
          <div className="flex flex-col gap-1.5 mt-2">
            {audienceData.genero.map((g, i) => (
              <div key={g.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: GENDER_COLORS[i] }} />
                  <span className="text-xs text-text-medium">{g.label}</span>
                </div>
                <span className="text-xs font-semibold text-text-dark">{g.valor}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs text-text-light text-center mb-1">Idade</p>
          <div className="flex flex-col gap-2 mt-2">
            {audienceData.idade.map((a, i) => (
              <div key={a.faixa} className="flex items-center gap-2">
                <span className="text-xs text-text-light w-12">{a.faixa}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${a.valor}%`, background: AGE_COLORS[i] }}
                  />
                </div>
                <span className="text-xs font-medium text-text-dark w-8 text-right">{a.valor}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-text-medium mb-3">Top Cidades</p>
        <div className="flex flex-col gap-2">
          {audienceData.cidades.map((c, i) => (
            <div key={c.nome} className="flex items-center gap-3">
              <span className="text-xs text-text-light w-4">{i + 1}</span>
              <span className="text-xs text-text-medium flex-1">{c.nome}</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full">
                <div
                  className="h-full rounded-full gradient-primary"
                  style={{ width: `${(c.valor / audienceData.cidades[0].valor) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-text-dark w-8 text-right">{c.valor}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
