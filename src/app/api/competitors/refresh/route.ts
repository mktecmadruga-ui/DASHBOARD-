/**
 * POST /api/competitors/refresh
 * Body (optional): { usernames: string[] }  — custom list from UI
 * Falls back to default list from COMPETITORS_BY_ACCOUNT.
 */
import { startCompetitorRun, COMPETITORS_BY_ACCOUNT } from "@/lib/apify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.APIFY_TOKEN) {
    return Response.json({ error: "APIFY_TOKEN não configurado" }, { status: 500 });
  }

  let customUsernames: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.usernames) && body.usernames.length > 0) {
      customUsernames = body.usernames.map((u: string) => u.replace(/^@/, "").toLowerCase());
    }
  } catch { /* no body or invalid JSON — use defaults */ }

  const toRefresh = customUsernames
    ?? Array.from(new Set(Object.values(COMPETITORS_BY_ACCOUNT).flat()));

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
