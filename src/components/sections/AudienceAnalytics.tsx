"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import DonutChart from "@/components/charts/DonutChart";
import { COLORS } from "@/lib/constants";
import { useAccount } from "@/context/AccountContext";
import { Loader2 } from "lucide-react";
import type { AudienceDemographics } from "@/lib/instagram-api";

const GENDER_COLORS = [COLORS.primary, COLORS.info, COLORS.primaryLight];
const AGE_COLORS    = [COLORS.primary, COLORS.primaryLight, COLORS.info, COLORS.success, COLORS.warning, COLORS.danger];

const GENDER_LABELS: Record<string, string> = { M: "Masculino", F: "Feminino", U: "Outro" };
const COUNTRY_LABELS: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina", MX: "México",
  CO: "Colômbia", CL: "Chile", UY: "Uruguai", PE: "Peru", DE: "Alemanha",
};

export default function AudienceAnalytics() {
  const { account } = useAccount();
  const slug = account.id === "william" ? "william" : "madruga";

  const [data, setData]       = useState<AudienceDemographics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/instagram/${slug}/audience`)
      .then(r => r.json())
      .then(d => { if (d.genderAge) setData(d as AudienceDemographics); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Aggregate gender
  const genderMap: Record<string, number> = {};
  for (const item of data?.genderAge ?? []) {
    genderMap[item.gender] = (genderMap[item.gender] ?? 0) + item.value;
  }
  const totalGender = Object.values(genderMap).reduce((s, v) => s + v, 0) || 1;
  const genderChartData = Object.entries(genderMap)
    .map(([gender, value]) => ({ label: GENDER_LABELS[gender] ?? gender, valor: Math.round((value / totalGender) * 100) }))
    .sort((a, b) => b.valor - a.valor);

  // Aggregate age
  const ageMap: Record<string, number> = {};
  for (const item of data?.genderAge ?? []) {
    ageMap[item.age] = (ageMap[item.age] ?? 0) + item.value;
  }
  const totalAge = Object.values(ageMap).reduce((s, v) => s + v, 0) || 1;
  const ageOrder = ["13-17","18-24","25-34","35-44","45-54","55-64","65+"];
  const ageChartData = Object.entries(ageMap)
    .map(([faixa, value]) => ({ faixa, valor: Math.round((value / totalAge) * 100) }))
    .sort((a, b) => ageOrder.indexOf(a.faixa) - ageOrder.indexOf(b.faixa));

  const cities   = data?.cities    ?? [];
  const countries = data?.countries ?? [];
  const maxCity  = cities[0]?.value || 1;

  return (
    <Card className="col-span-4" delay={0.5}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-text-dark">Audiência</h3>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[120, 80, 100, 60].map((h, i) => (
            <div key={i} className="bg-slate-100 animate-pulse rounded-xl" style={{ height: h }} />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-text-light text-center py-8">Sem dados de audiência disponíveis.</p>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <p className="text-xs text-text-light text-center mb-1">Gênero</p>
              <DonutChart data={genderChartData} colors={GENDER_COLORS} size={130} />
              <div className="flex flex-col gap-1.5 mt-2">
                {genderChartData.map((g, i) => (
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
                {ageChartData.map((a, i) => (
                  <div key={a.faixa} className="flex items-center gap-2">
                    <span className="text-xs text-text-light w-12">{a.faixa}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${a.valor}%`, background: AGE_COLORS[i % AGE_COLORS.length] }} />
                    </div>
                    <span className="text-xs font-medium text-text-dark w-8 text-right">{a.valor}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-text-medium mb-3">Top Cidades</p>
            <div className="flex flex-col gap-2">
              {cities.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-text-light w-4">{i + 1}</span>
                  <span className="text-xs text-text-medium flex-1 truncate">{c.name}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full flex-shrink-0">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${(c.value / maxCity) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-text-dark w-8 text-right">{c.value}</span>
                </div>
              ))}
            </div>
          </div>

          {countries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-medium mb-3">Top Países</p>
              <div className="flex flex-wrap gap-2">
                {countries.map(c => (
                  <span key={c.code} className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-text-medium">
                    {COUNTRY_LABELS[c.code] ?? c.code} · {c.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
