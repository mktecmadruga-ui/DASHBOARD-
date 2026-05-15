/**
 * GET /api/cron/instagram-sync
 * Runs daily (via Vercel Cron) to snapshot Instagram data for all accounts.
 * Fetches profile, media, insights (30d) and audience demographics,
 * then upserts into public.instagram_snapshots in Supabase.
 *
 * Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
 */
import {
  fetchProfile,
  fetchMedia,
  fetchAccountInsights,
  fetchAudienceDemographics,
} from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";
import { getSupabase } from "@/lib/supabase";
import { isAuthorisedCron } from "@/lib/telegram";

export const dynamic   = "force-dynamic";
export const maxDuration = 60;

const SLUGS: AccountSlug[] = ["william", "madruga"];

async function computeBestTimes(slug: AccountSlug) {
  const media = await fetchMedia(slug, 50);
  if (!media.length) return [];

  const buckets: Record<number, { total: number; count: number }> = {};
  for (const post of media) {
    const brHour = (new Date(post.timestamp).getUTCHours() - 3 + 24) % 24;
    if (!buckets[brHour]) buckets[brHour] = { total: 0, count: 0 };
    buckets[brHour].total += post.like_count + post.comments_count;
    buckets[brHour].count += 1;
  }

  return Object.entries(buckets)
    .map(([hour, { total, count }]) => ({
      hour:  parseInt(hour),
      label: `${String(parseInt(hour)).padStart(2, "0")}h`,
      value: `${String(parseInt(hour)).padStart(2, "0")}:00`,
      avg:   Math.round(total / count),
      posts: count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);
}

export async function GET(req: Request) {
  // Allow Vercel cron auth OR unauthenticated when no secret is set
  if (!isAuthorisedCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ error: "Supabase não configurado" }, { status: 503 });
  }

  const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const results: Record<string, unknown> = {};

  for (const slug of SLUGS) {
    try {
      // Fetch all data in parallel
      const [profile, media, insightsData, audience, bestTimes] = await Promise.all([
        fetchProfile(slug),
        fetchMedia(slug, 20),
        fetchAccountInsights(slug, 30),
        fetchAudienceDemographics(slug),
        computeBestTimes(slug),
      ]);

      if (!profile) {
        results[slug] = { ok: false, error: "token_expired_or_missing" };
        continue;
      }

      const row = {
        slug,
        date:               today,
        followers:          profile.followers_count   ?? null,
        following:          profile.follows_count     ?? null,
        media_count:        profile.media_count       ?? null,
        biography:          profile.biography         ?? null,
        reach:              (insightsData?.totals as Record<string, number> | undefined)?.["reach"] ?? null,
        profile_views:      insightsData?.totals.profile_views      ?? null,
        likes:              insightsData?.totals.likes              ?? null,
        comments:           insightsData?.totals.comments          ?? null,
        shares:             insightsData?.totals.shares             ?? null,
        saves:              insightsData?.totals.saves              ?? null,
        total_interactions: insightsData?.totals.total_interactions ?? null,
        media:              media.length ? media : null,
        audience:           audience ?? null,
        best_times:         bestTimes.length ? bestTimes : null,
        raw_insights:       insightsData ?? null,
        synced_at:          new Date().toISOString(),
      };

      const { error } = await sb
        .from("instagram_snapshots")
        .upsert(row, { onConflict: "slug,date" });

      if (error) {
        results[slug] = { ok: false, error: error.message };
      } else {
        results[slug] = {
          ok:        true,
          followers: row.followers,
          reach:     row.reach,
          posts:     media.length,
        };
      }
    } catch (e) {
      results[slug] = { ok: false, error: String(e) };
    }
  }

  const allOk = Object.values(results).every((r: unknown) => (r as { ok: boolean }).ok);
  return Response.json({
    synced_at: new Date().toISOString(),
    date:      today,
    results,
    ok:        allOk,
  }, { status: allOk ? 200 : 207 });
}
