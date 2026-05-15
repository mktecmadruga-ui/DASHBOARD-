import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import OverviewHero from "@/components/sections/OverviewHero";
import AccountGrowth from "@/components/sections/AccountGrowth";
import SmartAlerts from "@/components/sections/SmartAlerts";
import ContentPerformance from "@/components/sections/ContentPerformance";
import EngagementAnalytics from "@/components/sections/EngagementAnalytics";
import TopContent from "@/components/sections/TopContent";
import AIInsights from "@/components/sections/AIInsights";
import AudienceAnalytics from "@/components/sections/AudienceAnalytics";
import RetentionAnalytics from "@/components/sections/RetentionAnalytics";
import ConversionFunnel from "@/components/sections/ConversionFunnel";
import CompetitorBenchmark from "@/components/sections/CompetitorBenchmark";
import CompetitorTopContent from "@/components/sections/CompetitorTopContent";

export default function Home() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">

        <section id="sec-overview" className="scroll-mt-6">
          <OverviewHero />
        </section>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-growth" className="col-span-12 lg:col-span-8 scroll-mt-6">
            <AccountGrowth />
          </div>
          <div id="sec-alerts" className="col-span-12 lg:col-span-4 scroll-mt-6">
            <SmartAlerts />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-performance" className="col-span-12 lg:col-span-6 scroll-mt-6">
            <ContentPerformance />
          </div>
          <div id="sec-engagement" className="col-span-12 lg:col-span-6 scroll-mt-6">
            <EngagementAnalytics />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-topcontent" className="col-span-12 lg:col-span-8 scroll-mt-6">
            <TopContent />
          </div>
          <div id="sec-insights" className="col-span-12 lg:col-span-4 scroll-mt-6">
            <AIInsights />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-audience" className="col-span-12 md:col-span-6 lg:col-span-4 scroll-mt-6">
            <AudienceAnalytics />
          </div>
          <div id="sec-retention" className="col-span-12 md:col-span-6 lg:col-span-4 scroll-mt-6">
            <RetentionAnalytics />
          </div>
          <div id="sec-funnel" className="col-span-12 md:col-span-12 lg:col-span-4 scroll-mt-6">
            <ConversionFunnel />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Calendário — card CTA para a página dedicada */}
          <div id="sec-calendar" className="col-span-12 lg:col-span-8 scroll-mt-6">
            <Link
              href="/calendario"
              aria-label="Abrir calendário de conteúdo completo"
              className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-3xl">
              <div className="h-full min-h-[180px] rounded-3xl border border-slate-100 bg-white shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row items-center gap-5 px-6 sm:px-8 py-8 cursor-pointer overflow-hidden relative">
                {/* Decorative gradient orb */}
                <div aria-hidden="true" className="absolute -right-10 -top-10 w-44 h-44 bg-primary/8 rounded-full blur-3xl group-hover:bg-primary/15 transition-colors"/>

                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300 flex-shrink-0 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                </div>

                <div className="flex-1 text-center sm:text-left relative">
                  <h3 className="text-lg font-bold text-text-dark mb-1 tracking-tight">Calendário de Conteúdo</h3>
                  <p className="text-sm text-text-light max-w-md leading-relaxed">
                    Planeje, agende e acompanhe todo o conteúdo. Visualize por semana ou Kanban, gere posts com IA e envie pra aprovação.
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-md shadow-primary/25 group-hover:shadow-primary/35 transition-shadow flex-shrink-0 relative">
                  Abrir
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
              </div>
            </Link>
          </div>
          <div id="sec-benchmark" className="col-span-12 lg:col-span-4 scroll-mt-6">
            <CompetitorBenchmark />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 pb-6">
          <div id="sec-competitor-content" className="col-span-12 scroll-mt-6">
            <CompetitorTopContent />
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
