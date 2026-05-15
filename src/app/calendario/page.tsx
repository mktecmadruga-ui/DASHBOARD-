import DashboardShell from "@/components/layout/DashboardShell";
import ContentCalendar from "@/components/sections/ContentCalendar";
import CompetitorAnalysis from "@/components/sections/CompetitorAnalysis";

export default function CalendarioPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-text-dark">Calendário de Conteúdo</h2>
          <p className="text-sm text-text-light">Planeje, agende e acompanhe todo o conteúdo dos perfis.</p>
        </div>
        <ContentCalendar />
        <CompetitorAnalysis />
      </div>
    </DashboardShell>
  );
}
