/**
 * POST /api/competitors/refresh?account=william|madruga
 * Dispara novo run do Apify para os concorrentes do perfil indicado.
 * Chamado pelo cron — retorna imediatamente sem aguardar o Apify terminar.
 */
import { startCompetitorRun, COMPETITORS_BY_ACCOUNT } from "@/lib/apify";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!process.env.APIFY_TOKEN) {
    return Response.json({ error: "APIFY_TOKEN não configurado" }, { status: 500 });
  }

  // Sempre rodar TODOS os concorrentes juntos — 1 dataset com tudo
  const toRefresh = Array.from(new Set(Object.values(COMPETITORS_BY_ACCOUNT).flat()));

  try {
    const runId = await startCompetitorRun(toRefresh);
    return Response.json({
      ok: true,
      runId,
      profiles: toRefresh,
      startedAt: new Date().toISOString(),
      message: `Run ${runId} iniciado para ${toRefresh.length} concorrentes.`,
    });
  } catch (e) {
    console.error("[competitors/refresh]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
