/**
 * GET /api/instagram/[slug]/best-times
 * Computes best hours to post by grouping real media by hour-of-day
 * and ranking by average (likes + comments).
 */
import { fetchMedia } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const account = params.slug as AccountSlug;
  const media = await fetchMedia(account, 50); // up to 50 recent posts

  if (!media.length) {
    return Response.json({ error: "Sem dados de mídia", bestTimes: [] }, { status: 200 });
  }

  // Group by hour-of-day (Brasília = UTC-3)
  const hourBuckets: Record<number, { total: number; count: number }> = {};
  for (const post of media) {
    const utcHour = new Date(post.timestamp).getUTCHours();
    const brHour  = (utcHour - 3 + 24) % 24;
    if (!hourBuckets[brHour]) hourBuckets[brHour] = { total: 0, count: 0 };
    hourBuckets[brHour].total += post.like_count + post.comments_count;
    hourBuckets[brHour].count += 1;
  }

  // Average engagement per hour, sort descending
  const ranked = Object.entries(hourBuckets)
    .map(([hour, { total, count }]) => ({
      hour:    parseInt(hour),
      avg:     Math.round(total / count),
      posts:   count,
    }))
    .sort((a, b) => b.avg - a.avg);

  // Top 5 hours
  const bestTimes = ranked.slice(0, 5).map((r, i) => ({
    rank:    i + 1,
    hour:    r.hour,
    label:   `${String(r.hour).padStart(2, "0")}h`,
    value:   `${String(r.hour).padStart(2, "0")}:00`,
    avg:     r.avg,
    posts:   r.posts,
    tip:     i === 0 ? "⭐ Melhor horário" : i === 1 ? "2º melhor" : `${r.posts} post${r.posts > 1 ? "s" : ""} publicado${r.posts > 1 ? "s" : ""}`,
  }));

  return Response.json({ bestTimes, totalPosts: media.length, fetchedAt: new Date().toISOString() });
}
