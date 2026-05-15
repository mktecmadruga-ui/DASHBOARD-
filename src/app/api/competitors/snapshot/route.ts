/**
 * POST /api/competitors/snapshot
 * Fetches competitor profile + recent posts via Apify, computes analytics,
 * upserts into `competitor_snapshots`, and returns the full snapshot.
 *
 * Body: { slug: string, username: string }
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { CompetitorPost } from "@/lib/apify";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID    = "apify~instagram-scraper";
const BASE_URL    = "https://api.apify.com/v2";

function toPost(item: Record<string, unknown>, username: string): CompetitorPost {
  return {
    id:           String(item.id ?? item.shortCode ?? Math.random()),
    username,
    url:          String(item.url ?? `https://www.instagram.com/p/${item.shortCode}/`),
    shortCode:    String(item.shortCode ?? ""),
    caption:      String(item.caption ?? ""),
    mediaType:    (item.type as CompetitorPost["mediaType"]) ?? "Image",
    thumbnailUrl: String(item.displayUrl ?? ""),
    likeCount:    Number(item.likesCount ?? 0),
    commentCount: Number(item.commentsCount ?? 0),
    timestamp:    String(item.timestamp ?? new Date().toISOString()),
    engagement:   Number(item.likesCount ?? 0) + Number(item.commentsCount ?? 0),
  };
}

export async function POST(req: NextRequest) {
  if (!APIFY_TOKEN) {
    return Response.json({ error: "APIFY_TOKEN não configurado" }, { status: 503 });
  }

  const { slug, username } = await req.json();
  if (!slug || !username) {
    return Response.json({ error: "slug e username obrigatórios" }, { status: 400 });
  }

  const handle = String(username).replace(/^@/, "").trim().toLowerCase();

  // Run Apify synchronously (waits up to 55s)
  const runRes = await fetch(
    `${BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls:    [`https://www.instagram.com/${handle}/`],
        resultsType:   "posts",
        resultsLimit:  20,
        addParentData: false,
      }),
    }
  );

  if (!runRes.ok) {
    const err = await runRes.text();
    return Response.json({ error: `Apify falhou: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const items: Record<string, unknown>[] = await runRes.json();

  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Perfil não encontrado ou sem posts públicos" }, { status: 200 });
  }

  // Extract profile from first item
  const first = items[0];
  const followersCount = Number(first.followersCount ?? 0);
  const profile = {
    ownerFullName:  String(first.ownerFullName ?? handle),
    followersCount,
    followingCount: Number(first.followingCount ?? 0),
    postsCount:     Number(first.postsCount ?? 0),
    biography:      String(first.biography ?? ""),
    profilePicUrl:  String(first.profilePicUrl ?? ""),
    verified:       Boolean(first.verified ?? false),
  };

  // Map posts
  const posts = items
    .map(item => toPost(item, handle))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Compute analytics
  const avg_likes    = posts.length ? posts.reduce((s, p) => s + p.likeCount, 0) / posts.length : 0;
  const avg_comments = posts.length ? posts.reduce((s, p) => s + p.commentCount, 0) / posts.length : 0;
  const engagement_rate = followersCount > 0
    ? Math.round(((avg_likes + avg_comments) / followersCount) * 100 * 100) / 100
    : 0;

  // Most common media type
  const typeCounts: Record<string, number> = {};
  for (const p of posts) typeCounts[p.mediaType] = (typeCounts[p.mediaType] ?? 0) + 1;
  const top_media_type = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Image";

  const snapshot = {
    slug,
    username: handle,
    profile,
    posts,
    avg_likes:       Math.round(avg_likes),
    avg_comments:    Math.round(avg_comments),
    engagement_rate,
    top_media_type,
    fetched_at:      new Date().toISOString(),
  };

  // Upsert into Supabase
  const sb = getSupabase();
  if (sb) {
    await sb
      .from("competitor_snapshots")
      .upsert(
        {
          slug,
          username: handle,
          profile,
          posts,
          avg_likes:       snapshot.avg_likes,
          avg_comments:    snapshot.avg_comments,
          engagement_rate,
          top_media_type,
          fetched_at:      snapshot.fetched_at,
        },
        { onConflict: "slug,username" }
      );
  }

  return Response.json(snapshot);
}
