"use client";

import { useState } from "react";
import { Loader2, FileText, X, ExternalLink } from "lucide-react";

interface Props {
  slug: string;
  days: number;
  onClose: () => void;
}

type Step = "idle" | "opening" | "done" | "error";

export default function ExportReport({ slug, days, onClose }: Props) {
  const [step, setStep] = useState<Step>("idle");

  async function open() {
    setStep("opening");
    try {
      const url = `/api/reports/html?slug=${slug}&days=${days}`;
      window.open(url, "_blank");
      setStep("done");
      setTimeout(onClose, 1800);
    } catch {
      setStep("error");
    }
  }

  // Auto-open on mount
  if (step === "idle") open();

  const labels: Record<Step, string> = {
    idle:    "Preparando…",
    opening: "Gerando relatório com dados reais…",
    done:    "Relatório aberto! Use ⌘P para salvar como PDF.",
    error:   "Erro ao gerar relatório",
  };

  const pct: Record<Step, number> = { idle:0, opening:60, done:100, error:0 };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-dark">Exportar Relatório PDF</h3>
            <p className="text-xs text-text-light">A4 · 3 páginas · dados reais</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-text-medium" />
          </button>
        </div>

        <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-700"
            style={{ width: `${pct[step]}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          {step === "done"
            ? <ExternalLink className="w-4 h-4 text-success flex-shrink-0" />
            : step === "error"
            ? <X className="w-4 h-4 text-danger flex-shrink-0" />
            : <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
          <p className="text-sm text-text-medium">{labels[step]}</p>
        </div>

        {step === "done" && (
          <p className="mt-3 text-xs text-text-light bg-slate-50 rounded-xl p-3">
            Uma nova aba foi aberta com o relatório. Clique em <strong>Salvar PDF</strong> no canto inferior direito, ou use <strong>⌘P → Salvar como PDF</strong>.
          </p>
        )}

        {step === "error" && (
          <button onClick={open} className="mt-4 w-full h-10 rounded-2xl gradient-primary text-white text-sm font-medium cursor-pointer hover:opacity-90">
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
