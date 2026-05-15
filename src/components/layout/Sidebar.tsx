"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, BarChart3, TrendingUp, Users, Heart,
  Zap, Filter, Sparkles, Calendar, Target, Activity,
  UserCheck, LogOut, ShieldCheck, CalendarDays, ChevronLeft,
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
    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
      {children}
    </p>
  );
}

export default function Sidebar() {
  const [active, setActive] = useState("overview");
  const { account } = useAccount();
  const pathname = usePathname();
  const router   = useRouter();

  const isCalendar = pathname === "/calendario";
  const isLeads    = pathname === "/leads";

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
    <aside className="fixed left-0 top-0 h-screen w-72 glass-sidebar z-50 flex flex-col py-8 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 mb-6">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">InstaMetrics</h1>
          <p className="text-slate-400 text-xs">Analytics Pro</p>
        </div>
      </div>

      {/* Account Switcher */}
      <AccountSwitcher />

      {/* Nav */}
      <nav className="flex-1 flex flex-col overflow-y-auto">

        {/* ── ANALYTICS ────────────────────────────── */}
        <SectionLabel>Analytics</SectionLabel>

        {isCalendar ? (
          /* When on /calendario, show a single "← Visão Geral" link */
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all duration-150 w-full"
          >
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            <span>Visão Geral</span>
          </Link>
        ) : (
          /* Dashboard: full scroll-based nav */
          <div className="flex flex-col gap-0.5">
            {analyticsItems.map((item) => {
              const Icon     = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollTo(item.sectionId, item.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative cursor-pointer w-full text-left",
                    isActive
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-primary"
                      style={{ boxShadow: "0 0 10px rgba(123,97,255,0.7)" }}
                    />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── CONTEÚDO ─────────────────────────────── */}
        <SectionLabel>Conteúdo</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <Link
            href="/calendario"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative w-full",
              isCalendar
                ? "text-white bg-white/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            {isCalendar && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-primary"
                style={{ boxShadow: "0 0 10px rgba(123,97,255,0.7)" }}
              />
            )}
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span>Calendário</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-md font-semibold">
              FULL
            </span>
          </Link>
        </div>

        {/* ── GESTÃO ───────────────────────────────── */}
        <SectionLabel>Gestão</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <Link
            href="/leads"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative w-full",
              isLeads
                ? "text-white bg-white/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            {isLeads && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-primary"
                style={{ boxShadow: "0 0 10px rgba(123,97,255,0.7)" }}
              />
            )}
            <UserCheck className="w-4 h-4 flex-shrink-0" />
            <span>Leads</span>
          </Link>
        </div>

      </nav>

      {/* Admin + Logout */}
      <div className="px-4 pb-2 border-t border-white/10 pt-3 flex gap-1">
        <Link href="/admin"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer">
          <ShieldCheck className="w-3.5 h-3.5"/> Usuários
        </Link>
        <button onClick={handleLogout}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer">
          <LogOut className="w-3.5 h-3.5"/> Sair
        </button>
      </div>

      {/* Profile */}
      <div className="px-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-all duration-300"
            style={{ background: account.cor }}
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
