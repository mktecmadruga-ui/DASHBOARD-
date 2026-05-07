"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, BarChart3, TrendingUp, Users, Heart,
  Zap, Filter, Sparkles, Calendar, Target, Settings, Activity,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AccountSwitcher from "@/components/ui/AccountSwitcher";
import { useAccount } from "@/context/AccountContext";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",  id: "overview",    sectionId: "sec-overview"    },
  { icon: BarChart3,       label: "Performance",  id: "performance", sectionId: "sec-performance" },
  { icon: Activity,        label: "Retenção",     id: "retention",   sectionId: "sec-retention"   },
  { icon: TrendingUp,      label: "Crescimento",  id: "growth",      sectionId: "sec-growth"      },
  { icon: Users,           label: "Audiência",    id: "audience",    sectionId: "sec-audience"    },
  { icon: Heart,           label: "Engajamento",  id: "engagement",  sectionId: "sec-engagement"  },
  { icon: Filter,          label: "Funil",        id: "funnel",      sectionId: "sec-funnel"      },
  { icon: Sparkles,        label: "IA Insights",  id: "insights",    sectionId: "sec-insights"    },
  { icon: Calendar,        label: "Calendário",   id: "calendar",    sectionId: "sec-calendar"    },
  { icon: Target,          label: "Benchmark",    id: "benchmark",   sectionId: "sec-benchmark"   },
  { icon: Zap,             label: "Alertas",      id: "alerts",      sectionId: "sec-alerts"      },
  { icon: Settings,        label: "Configurações",id: "settings",    sectionId: ""                },
];

export default function Sidebar() {
  const [active, setActive] = useState("overview");
  const { account } = useAccount();

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
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
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
      </nav>

      {/* Leads link — separado */}
      <div className="px-4 pb-2">
        <Link
          href="/leads"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all duration-150 w-full"
        >
          <UserCheck className="w-4 h-4 flex-shrink-0" />
          <span>Leads</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-md font-semibold">NEW</span>
        </Link>
      </div>

      {/* Profile — dinâmico */}
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
