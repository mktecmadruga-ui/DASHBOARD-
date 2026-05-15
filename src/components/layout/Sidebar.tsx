"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, BarChart3, TrendingUp, Users, Heart,
  Zap, Filter, Sparkles, Target, Activity,
  LogOut, ShieldCheck, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AccountSwitcher from "@/components/ui/AccountSwitcher";
import { useAccount } from "@/context/AccountContext";

const analyticsItems = [
  { icon: LayoutDashboard, label: "Visão Geral",  id: "overview",    sectionId: "sec-overview"    },
  { icon: BarChart3,       label: "Performance",  id: "performance", sectionId: "sec-performance" },
  { icon: Activity,        label: "Retenção",     id: "retention",   sectionId: "sec-retention"   },
  { icon: TrendingUp,      label: "Crescimento",  id: "growth",      sectionId: "sec-growth"      },
  { icon: Users,           label: "Audiência",    id: "audience",    sectionId: "sec-audience"    },
  { icon: Heart,           label: "Engajamento",  id: "engagement",  sectionId: "sec-engagement"  },
  { icon: Filter,          label: "Funil",        id: "funnel",      sectionId: "sec-funnel"      },
  { icon: Sparkles,        label: "IA Insights",  id: "insights",    sectionId: "sec-insights"    },
  { icon: Target,          label: "Benchmark",    id: "benchmark",   sectionId: "sec-benchmark"   },
  { icon: Zap,             label: "Alertas",      id: "alerts",      sectionId: "sec-alerts"      },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
      {children}
    </p>
  );
}

// ── Shared nav item styles for visual consistency
const navItem  = "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative cursor-pointer w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const inactive = "text-slate-400 hover:text-white hover:bg-white/5";
const activeCl = "text-white bg-white/10";

function ActiveIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-primary"
      style={{ boxShadow: "0 0 10px rgba(123,97,255,0.7)" }}
    />
  );
}

export default function Sidebar() {
  const [active, setActive] = useState("overview");
  const { account } = useAccount();
  const pathname = usePathname();
  const router   = useRouter();

  const isCalendar     = pathname === "/calendario";
  const isLeads        = pathname === "/leads";
  const isConcorrentes = pathname === "/concorrentes";
  const onSubPage      = isCalendar || isLeads || isConcorrentes;

  async function handleLogout() {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (sbUrl && sbKey) {
      const sb = createBrowserClient(sbUrl, sbKey);
      await sb.auth.signOut();
    }
    router.push("/login");
  }

  function scrollTo(sectionId: string, id: string) {
    setActive(id);
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside aria-label="Navegação principal" className="fixed left-0 top-0 h-screen w-72 glass-sidebar z-50 flex flex-col py-7 px-4">
      {/* Logo */}
      <Link href="/" aria-label="Ir para o painel principal"
        className="flex items-center gap-3 px-3 mb-6 rounded-xl hover:bg-white/5 -mx-1 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-sm">
          <BarChart3 className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">InstaMetrics</h1>
          <p className="text-slate-400 text-xs">Analytics Pro</p>
        </div>
      </Link>

      <AccountSwitcher />

      <nav aria-label="Seções" className="flex-1 flex flex-col overflow-y-auto -mx-1 px-1">

        {/* ── ANALYTICS ────────────────────────────── */}
        <SectionLabel>Analytics</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {analyticsItems.map((item) => {
            const Icon     = item.icon;
            const isActive = !onSubPage && active === item.id;

            return (
              <li key={item.id}>
                {onSubPage ? (
                  <Link
                    href={item.sectionId ? `/#${item.sectionId}` : "/"}
                    className={cn(navItem, inactive)}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollTo(item.sectionId, item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(navItem, isActive ? activeCl : inactive)}
                  >
                    {isActive && <ActiveIndicator />}
                    <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* ── CONTEÚDO ─────────────────────────────── */}
        <SectionLabel>Conteúdo</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link href="/calendario"
              aria-current={isCalendar ? "page" : undefined}
              className={cn(navItem, isCalendar ? activeCl : inactive)}>
              {isCalendar && <ActiveIndicator />}
              <CalendarDays className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Calendário</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-md font-semibold">FULL</span>
            </Link>
          </li>
        </ul>

        {/* ── GESTÃO ───────────────────────────────── */}
        <SectionLabel>Gestão</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link href="/concorrentes"
              aria-current={isConcorrentes ? "page" : undefined}
              className={cn(navItem, isConcorrentes ? activeCl : inactive)}>
              {isConcorrentes && <ActiveIndicator />}
              <TrendingUp className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Concorrentes</span>
            </Link>
          </li>
        </ul>

      </nav>

      {/* Admin + Logout */}
      <div className="px-1 pb-2 border-t border-white/10 pt-3 flex gap-1">
        <Link href="/admin"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Usuários
        </Link>
        <button type="button" onClick={handleLogout}
          aria-label="Sair da conta"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sair
        </button>
      </div>

      {/* Profile */}
      <div className="px-1 pt-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-all duration-300 shadow-sm"
            style={{ background: account.cor }}
            aria-hidden="true"
          >
            {account.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{account.usuario}</p>
            <p className="text-slate-400 text-xs truncate">{account.nicho}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
