"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, FileText, X, CheckCircle } from "lucide-react";
import { ReportPage1, ReportPage2, ReportPage3 } from "./ReportTemplate";
import type { ReportData } from "./ReportTemplate";

type Step = "idle" | "fetching" | "rendering" | "pdf" | "done" | "error";

interface Props {
  slug: string;
  days: number;
  onClose: () => void;
}

export default function ExportReport({ slug, days, onClose }: Props) {
  const [step, setStep]     = useState<Step>("idle");
  const [data, setData]     = useState<ReportData | null>(null);
  const containerRef        = useRef<HTMLDivElement>(null);

  const stepLabels: Record<Step, string> = {
    idle:      "Preparando…",
    fetching:  "Coletando dados via Instagram API…",
    rendering: "Gerando narrativa com Claude AI…",
    pdf:       "Gerando PDF A4…",
    done:      "Relatório exportado!",
    error:     "Erro ao gerar relatório",
  };

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    try {
      setStep("fetching");
      const res  = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, days }),
      });
      const reportData: ReportData = await res.json();
      setData(reportData);

      setStep("rendering");
      // Give React time to render the hidden pages
      await new Promise(r => setTimeout(r, 600));

      setStep("pdf");
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pageIds = ["report-p1", "report-p2", "report-p3"];
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, 1123] });

      for (let i = 0; i < pageIds.length; i++) {
        const el = document.getElementById(pageIds[i]);
        if (!el) continue;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
        });

        if (i > 0) pdf.addPage([794, 1123], "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 794, 1123);
      }

      const date  = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      pdf.save(`relatorio-${slug}-${date}.pdf`);
      setStep("done");
      setTimeout(onClose, 1500);
    } catch (e) {
      console.error("[ExportReport]", e);
      setStep("error");
    }
  }

  const pct: Record<Step, number> = { idle:0, fetching:25, rendering:55, pdf:80, done:100, error:0 };

  return (
    <>
      {/* Progress modal */}
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

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-700"
              style={{ width: `${pct[step]}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            {step === "done"
              ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              : step === "error"
              ? <X className="w-4 h-4 text-danger flex-shrink-0" />
              : <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
            <p className="text-sm text-text-medium">{stepLabels[step]}</p>
          </div>

          {step === "error" && (
            <button onClick={generate} className="mt-4 w-full h-10 rounded-2xl gradient-primary text-white text-sm font-medium cursor-pointer hover:opacity-90">
              Tentar novamente
            </button>
          )}
        </div>
      </div>

      {/* Hidden render target — off-screen but in DOM so html2canvas can find it */}
      {data && createPortal(
        <div
          ref={containerRef}
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <ReportPage1 data={data} />
          <ReportPage2 data={data} />
          <ReportPage3 data={data} />
        </div>,
        document.body
      )}
    </>
  );
}
