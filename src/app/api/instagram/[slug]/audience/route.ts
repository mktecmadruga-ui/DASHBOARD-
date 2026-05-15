import { fetchAudienceDemographics } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const account = params.slug as AccountSlug;
  const today   = new Date().toISOString().slice(0, 10);

  // Try today's snapshot first
  const sb = getSupabase();
  if (sb) {
    const { data: snap } = await sb
      .from("instagram_snapshots")
      .select("audience, synced_at")
      .eq("slug", account)
      .eq("date", today)
      .maybeSingle();

    if (snap?.audience) {
      return Response.json({
        ...snap.audience,
        account,
        fromCache: true,
        fetchedAt: snap.synced_at,
      });
    }
  }

  // Fallback: live fetch
  const data = await fetchAudienceDemographics(account);
  if (!data) {
    return Response.json({ error: "Falha ao buscar demographics" }, { status: 500 });
  }

  return Response.json({ ...data, account, fromCache: false, fetchedAt: new Date().toISOString() });
}
