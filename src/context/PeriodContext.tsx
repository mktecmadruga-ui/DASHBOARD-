"use client";

import { createContext, useContext, useState } from "react";

export type PeriodId = "7d" | "30d" | "90d" | "6m" | "1a";

export interface PeriodOption {
  id: PeriodId;
  label: string;
  shortLabel: string;
  days: number;
}

export const PERIODS: PeriodOption[] = [
  { id: "7d",  label: "Últimos 7 dias",   shortLabel: "7 dias",  days: 7   },
  { id: "30d", label: "Últimos 30 dias",  shortLabel: "30 dias", days: 30  },
  { id: "90d", label: "Últimos 90 dias",  shortLabel: "90 dias", days: 90  },
  { id: "6m",  label: "Últimos 6 meses",  shortLabel: "6 meses", days: 180 },
  { id: "1a",  label: "Último ano",       shortLabel: "1 ano",   days: 365 },
];

interface PeriodContextValue {
  period: PeriodOption;
  setPeriodId: (id: PeriodId) => void;
}

const PeriodContext = createContext<PeriodContextValue>({
  period: PERIODS[1],
  setPeriodId: () => {},
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [periodId, setPeriodId] = useState<PeriodId>("30d");
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];

  return (
    <PeriodContext.Provider value={{ period, setPeriodId }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
