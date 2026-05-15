import { fetchProfile, fetchMedia } from "@/lib/instagram-api";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  // Try today's snapshot first (populated by daily cron)
  const sb = getSupabase();
  if (sb) {
    const { data: snap } = await sb
      .from("instagram_snapshots")
      .select("*")
      .eq("slug", "william")
      .eq("date", today)
      .maybeSingle();

    if (snap?.followers) {
      return Response.json({
        profile: {
          followers_count: snap.followers,
          follows_count:   snap.following,
          media_count:     snap.media_count,
          biography:       snap.biography,
        },
        media:     snap.media ?? [],
        fromCache: true,
        cachedAt:  snap.synced_at,
      });
    }
  }

  // Fallback: live fetch
  const [profile, media] = await Promise.all([
    fetchProfile("william"),
    fetchMedia("william", 20),
  ]);

  if (!profile) {
    return Response.json({ error: "token_expired" }, { status: 200 });
  }

  return Response.json({ profile, media, fromCache: false, cachedAt: new Date().toISOString() });
}
