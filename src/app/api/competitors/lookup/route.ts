/**
 * POST /api/competitors/lookup
 * Kicks off an Apify Instagram scrape for a given username and waits for result.
 * Returns top 10 posts sorted by engagement.
 *
 * Body: { username: string }
 */
import { NextRequest } from "next/server";
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

  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return Response.json({ error: "username obrigatório" }, { status: 400 });
  }

  const handle = username.replace(/^@/, "").trim().toLowerCase();

  // 1. Start Apify run (synchronous run — waits up to 55s)
  const runRes = await fetch(
    `${BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls:   [`https://www.instagram.com/${handle}/`],
        resultsType:  "posts",
        resultsLimit: 30, // fetch 30, return top 10 by engagement
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
    return Response.json({ error: "Perfil não encontrado ou sem posts públicos", posts: [] }, { status: 200 });
  }

  const posts = items
    .map(item => toPost(item, handle))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10);

  // Try to extract profile info from first item
  const first = items[0] as Record<string, unknown>;
  const profile = {
    username:        handle,
    fullName:        String((first.ownerFullName as string) ?? handle),
    followersCount:  Number((first.followersCount as number) ?? 0),
    followingCount:  Number((first.followingCount as number) ?? 0),
    postsCount:      Number((first.postsCount as number) ?? 0),
    biography:       String((first.biography as string) ?? ""),
    profilePicUrl:   String((first.profilePicUrl as string) ?? ""),
    isVerified:      Boolean((first.verified as boolean) ?? false),
  };

  return Response.json({ profile, posts });
}
