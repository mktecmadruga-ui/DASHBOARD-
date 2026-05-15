/**
 * GET /api/instagram/[slug]/best-times
 * Computes best hours to post by grouping real media by hour-of-day
 * and ranking by average (likes + comments).
 * Reads from daily snapshot when available; falls back to live fetch.
 */
import { fetchMedia } from "@/lib/instagram-api";
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
      .select("best_times, media, synced_at")
      .eq("slug", account)
      .eq("date", today)
      .maybeSingle();

    if (snap?.best_times) {
      return Response.json({
        bestTimes:  snap.best_times,
        totalPosts: Array.isArray(snap.media) ? snap.media.length : 0,
        fromCache:  true,
        fetchedAt:  snap.synced_at,
      });
    }
  }

  // Fallback: live compute
  const media = await fetchMedia(account, 50);

  if (!media.length) {
    return Response.json({ error: "Sem dados de mídia", bestTimes: [] }, { status: 200 });
  }

  const hourBuckets: Record<number, { total: number; count: number }> = {};
  for (const post of media) {
    const brHour = (new Date(post.timestamp).getUTCHours() - 3 + 24) % 24;
    if (!hourBuckets[brHour]) hourBuckets[brHour] = { total: 0, count: 0 };
    hourBuckets[brHour].total += post.like_count + post.comments_count;
    hourBuckets[brHour].count += 1;
  }

  const bestTimes = Object.entries(hourBuckets)
    .map(([hour, { total, count }]) => ({
      hour:  parseInt(hour),
      label: `${String(parseInt(hour)).padStart(2, "0")}h`,
      value: `${String(parseInt(hour)).padStart(2, "0")}:00`,
      avg:   Math.round(total / count),
      posts: count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      tip:  i === 0 ? "⭐ Melhor horário" : i === 1 ? "2º melhor" : `${r.posts} post${r.posts > 1 ? "s" : ""} publicado${r.posts > 1 ? "s" : ""}`,
    }));

  return Response.json({ bestTimes, totalPosts: media.length, fromCache: false, fetchedAt: new Date().toISOString() });
}
