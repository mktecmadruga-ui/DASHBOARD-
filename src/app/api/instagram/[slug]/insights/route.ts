import { fetchAccountInsights } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";
import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const account = params.slug as AccountSlug;
  const days    = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
  const today   = new Date().toISOString().slice(0, 10);

  // Try today's snapshot first (only for standard 30d window)
  const sb = getSupabase();
  if (sb && days === 30) {
    const { data: snap } = await sb
      .from("instagram_snapshots")
      .select("raw_insights, synced_at")
      .eq("slug", account)
      .eq("date", today)
      .maybeSingle();

    if (snap?.raw_insights) {
      return Response.json({
        ...snap.raw_insights,
        account,
        days,
        fromCache: true,
        fetchedAt: snap.synced_at,
      });
    }
  }

  // Fallback: live fetch
  const data = await fetchAccountInsights(account, days);
  if (!data) {
    return Response.json({ error: "Falha ao buscar insights" }, { status: 500 });
  }

  return Response.json({ ...data, account, days, fromCache: false, fetchedAt: new Date().toISOString() });
}
