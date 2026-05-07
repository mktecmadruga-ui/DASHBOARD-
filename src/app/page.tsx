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
import ContentCalendar from "@/components/sections/ContentCalendar";
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
          <div id="sec-growth" className="col-span-8 scroll-mt-6">
            <AccountGrowth />
          </div>
          <div id="sec-alerts" className="col-span-4 scroll-mt-6">
            <SmartAlerts />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-performance" className="col-span-6 scroll-mt-6">
            <ContentPerformance />
          </div>
          <div id="sec-engagement" className="col-span-6 scroll-mt-6">
            <EngagementAnalytics />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-topcontent" className="col-span-8 scroll-mt-6">
            <TopContent />
          </div>
          <div id="sec-insights" className="col-span-4 scroll-mt-6">
            <AIInsights />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-audience" className="col-span-4 scroll-mt-6">
            <AudienceAnalytics />
          </div>
          <div id="sec-retention" className="col-span-4 scroll-mt-6">
            <RetentionAnalytics />
          </div>
          <div id="sec-funnel" className="col-span-4 scroll-mt-6">
            <ConversionFunnel />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div id="sec-calendar" className="col-span-8 scroll-mt-6">
            <ContentCalendar />
          </div>
          <div id="sec-benchmark" className="col-span-4 scroll-mt-6">
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
