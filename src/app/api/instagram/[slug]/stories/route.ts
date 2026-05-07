/**
 * GET /api/instagram/[slug]/stories
 * Fetches current live stories + per-story insights.
 * Stories only available while live (within 24h window).
 * Requires instagram_manage_insights permission on the token.
 */
import type { AccountSlug } from "@/lib/instagram-api";
import { NextRequest } from "next/server";

const BASE_URL = "https://graph.facebook.com/v19.0";

export const dynamic = "force-dynamic";

function getToken() {
  const t = process.env.INSTAGRAM_GRAPH_TOKEN;
  if (!t) throw new Error("INSTAGRAM_GRAPH_TOKEN não configurado");
  return t;
}

export interface StoryItem {
  id: string;
  media_type: string;
  media_url?: string;
  timestamp: string;
  insights: {
    impressions:   number;
    reach:         number;
    replies:       number;
    taps_forward:  number;
    taps_back:     number;
    exits:         number;
  };
}

const IG_USER_IDS: Record<AccountSlug, string> = {
  william: "17841403558309059",
  madruga: "17841406953451809",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const token    = getToken();
    const igUserId = IG_USER_IDS[params.slug as AccountSlug];
    if (!igUserId) return Response.json({ error: "Perfil inválido" }, { status: 400 });

    // Fetch live stories
    const storiesRes = await fetch(
      `${BASE_URL}/${igUserId}/stories?fields=id,media_type,media_url,timestamp&access_token=${token}`,
      { cache: "no-store" }
    );

    if (!storiesRes.ok) {
      const err = await storiesRes.text();
      console.error("[stories] fetch error:", err);
      // Common case: token lacks permission
      if (err.includes("permissions") || err.includes("scope")) {
        return Response.json({
          error: "Permissão negada",
          hint: "O token precisa do escopo instagram_manage_insights para acessar stories.",
          stories: [],
        }, { status: 403 });
      }
      return Response.json({ error: "Falha ao buscar stories", stories: [] }, { status: 500 });
    }

    const storiesData = await storiesRes.json();
    const stories: StoryItem[] = [];

    for (const story of storiesData.data ?? []) {
      // Fetch insights per story
      const insights = { impressions: 0, reach: 0, replies: 0, taps_forward: 0, taps_back: 0, exits: 0 };
      try {
        const insRes = await fetch(
          `${BASE_URL}/${story.id}/insights?metric=impressions,reach,replies,taps_forward,taps_back,exits&access_token=${token}`,
          { cache: "no-store" }
        );
        if (insRes.ok) {
          const insData = await insRes.json();
          for (const m of insData.data ?? []) {
            const key = m.name as keyof typeof insights;
            if (key in insights) insights[key] = m.values?.[0]?.value ?? 0;
          }
        }
      } catch { /* skip insights for this story */ }

      stories.push({ id: story.id, media_type: story.media_type, media_url: story.media_url, timestamp: story.timestamp, insights });
    }

    return Response.json({ stories, count: stories.length, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[stories]", e);
    return Response.json({ error: String(e), stories: [] }, { status: 500 });
  }
}
