import { NextRequest } from "next/server";

/**
 * POST /api/instagram/publish
 *
 * Publishes a post to Instagram via the Content Publishing API.
 * Requires a long-lived User Access Token with:
 *   - instagram_basic
 *   - instagram_content_publish
 *   - pages_read_engagement (for Page-linked accounts)
 *
 * Body: {
 *   slug: "william" | "madruga",
 *   imageUrl: string,   // publicly accessible URL (required for image posts)
 *   caption: string,
 *   mediaType: "IMAGE" | "REELS",
 *   videoUrl?: string,  // for Reels
 * }
 */

const GRAPH_URL = "https://graph.instagram.com/v19.0";

// Instagram Business Account IDs — fill after linking accounts in Meta Business Suite
const IG_USER_IDS: Record<string, string> = {
  william: process.env.IG_USER_ID_WILLIAM ?? "",
  madruga: process.env.IG_USER_ID_MADRUGA ?? "",
};

const IG_TOKENS: Record<string, string> = {
  william: process.env.IG_PUBLISH_TOKEN_WILLIAM ?? "",
  madruga: process.env.IG_PUBLISH_TOKEN_MADRUGA ?? "",
};

export async function POST(req: NextRequest) {
  const { slug, imageUrl, caption, mediaType = "IMAGE", videoUrl } = await req.json();

  const userId = IG_USER_IDS[slug];
  const token  = IG_TOKENS[slug];

  if (!userId || !token) {
    return Response.json({
      error: "Tokens de publicação não configurados. Adicione IG_USER_ID_WILLIAM/MADRUGA e IG_PUBLISH_TOKEN_WILLIAM/MADRUGA no .env.local.",
      setup_required: true,
    }, { status: 400 });
  }

  try {
    // Step 1 — Create media container
    const containerParams: Record<string, string> = {
      caption,
      access_token: token,
    };

    if (mediaType === "REELS" && videoUrl) {
      containerParams.media_type = "REELS";
      containerParams.video_url  = videoUrl;
      containerParams.share_to_feed = "true";
    } else {
      containerParams.image_url = imageUrl;
    }

    const containerRes = await fetch(
      `${GRAPH_URL}/${userId}/media?${new URLSearchParams(containerParams)}`,
      { method: "POST" }
    );
    const containerData = await containerRes.json();

    if (!containerRes.ok || !containerData.id) {
      console.error("Container error:", containerData);
      return Response.json({ error: containerData.error?.message ?? "Erro ao criar container de mídia" }, { status: 502 });
    }

    const creationId = containerData.id;

    // Step 2 — For videos, wait for processing (poll status)
    if (mediaType === "REELS") {
      let ready = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes  = await fetch(`${GRAPH_URL}/${creationId}?fields=status_code&access_token=${token}`);
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") { ready = true; break; }
        if (statusData.status_code === "ERROR")    { break; }
      }
      if (!ready) return Response.json({ error: "Timeout aguardando processamento do vídeo" }, { status: 504 });
    }

    // Step 3 — Publish
    const publishRes = await fetch(
      `${GRAPH_URL}/${userId}/media_publish?creation_id=${creationId}&access_token=${token}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok) {
      console.error("Publish error:", publishData);
      return Response.json({ error: publishData.error?.message ?? "Erro ao publicar" }, { status: 502 });
    }

    return Response.json({ success: true, mediaId: publishData.id });
  } catch (e) {
    console.error("Publish route error:", e);
    return Response.json({ error: "Falha na publicação" }, { status: 500 });
  }
}
