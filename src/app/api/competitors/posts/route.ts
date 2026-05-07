/**
 * GET /api/competitors/posts?account=william|madruga
 * Retorna os top 3 posts de cada concorrente do último run do Apify.
 * Cache de 30 minutos por conta.
 */
import { fetchLastRunPosts, COMPETITORS_BY_ACCOUNT } from "@/lib/apify";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.APIFY_TOKEN) {
    return Response.json({ error: "APIFY_TOKEN não configurado" }, { status: 500 });
  }

  const account   = req.nextUrl.searchParams.get("account") ?? "william";
  const usernames = COMPETITORS_BY_ACCOUNT[account] ?? COMPETITORS_BY_ACCOUNT.william;

  try {
    const data = await fetchLastRunPosts(usernames);
    return Response.json(
      { competitors: data, account, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[competitors/posts]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
