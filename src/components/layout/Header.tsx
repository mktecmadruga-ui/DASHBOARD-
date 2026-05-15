"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Download, ChevronDown, Check, AlertTriangle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeriod, PERIODS } from "@/context/PeriodContext";
import { useAccount } from "@/context/AccountContext";
import dynamic from "next/dynamic";

const ExportReport = dynamic(() => import("@/components/report/ExportReport"), { ssr: false });

type TokenStatus = {
  status: "valid_no_renew" | "renewed" | "expired" | "checking" | "ok" | null;
  daysLeft: number;
  renewed?: boolean;
};

function TokenBanner({ token, onDismiss }: { token: TokenStatus; onDismiss: () => void }) {
  const isExpired  = token.status === "expired";
  const isCritical = token.daysLeft <= 7;

  if (token.daysLeft > 14 && token.status !== "expired") return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border",
        isExpired  ? "bg-danger/10 border-danger/20 text-danger" :
        isCritical ? "bg-danger/8 border-danger/15 text-danger" :
        "bg-warning/10 border-warning/20 text-warning"
      )}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>
        {isExpired
          ? "Token Instagram expirado — atualize na Vercel"
          : `Token expira em ${token.daysLeft}d`}
      </span>
      <a
        href="/api/instagram/refresh-token"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-70 flex items-center gap-1"
      >
        <RefreshCw className="w-3 h-3" aria-hidden="true" />
        Renovar
      </a>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso de token"
        className="ml-1 hover:opacity-60 cursor-pointer rounded">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function Header() {
  const { period, setPeriodId } = usePeriod();
  const { account } = useAccount();
  const [dropdown, setDropdown] = useState(false);
  const [search, setSearch]     = useState("");
  const [token, setToken]       = useState<TokenStatus>({ status: "checking", daysLeft: 99 });
  const [dismissed, setDismissed]   = useState(false);
  const [showExport, setShowExport] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    fetch("/api/instagram/refresh-token")
      .then(r => r.json())
      .then(d => setToken({
        status:   d.status,
        daysLeft: d.daysLeft ?? d.expires_in_days ?? 0,
        renewed:  d.status === "renewed",
      }))
      .catch(() => setToken({ status: null, daysLeft: 99 }));
  }, []);

  const slug = account.id === "william" ? "william" : "madruga";
  const initial = slug === "william" ? "W" : "M";

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-6 lg:px-8 py-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light pointer-events-none" aria-hidden="true"/>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar métricas, conteúdos..."
              aria-label="Buscar no painel"
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-slate-100 text-sm text-text-dark placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 shadow-card transition-all"
            />
          </div>

          {/* Date range dropdown */}
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setDropdown((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={dropdown}
              aria-label={`Período: ${period.label}`}
              className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white border border-slate-100 text-sm text-text-medium shadow-card hover:shadow-glass hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
            >
              <span>{period.label}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", dropdown && "rotate-180")} aria-hidden="true" />
            </button>

            {dropdown && (
              <div role="listbox" aria-label="Selecionar período"
                className="absolute top-[calc(100%+8px)] left-0 w-52 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden z-50 py-1.5">
                {PERIODS.map((p) => {
                  const isActive = period.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => { setPeriodId(p.id); setDropdown(false); }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-text-medium hover:bg-slate-50 hover:text-text-dark transition-colors cursor-pointer"
                    >
                      <span>{p.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Token expiry banner */}
          {!dismissed && token.status !== "checking" && (
            <TokenBanner token={token} onDismiss={() => setDismissed(true)} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Exportar relatório PDF"
            aria-label="Exportar relatório em PDF"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 h-11 px-3.5 rounded-2xl bg-white border border-slate-100 shadow-card hover:shadow-glass hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer text-sm font-medium text-text-medium"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          {/* Profile / Account indicator */}
          <div
            title={`Perfil: ${account.usuario ?? slug}`}
            aria-label={`Conta atual: ${slug}`}
            className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center text-white text-sm font-bold cursor-default shadow-sm">
            {initial}
          </div>
        </div>
      </header>

      {showExport && (
        <ExportReport
          slug={slug}
          days={period.days}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
