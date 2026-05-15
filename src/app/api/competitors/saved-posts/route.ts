/**
 * GET/POST/DELETE /api/competitors/saved-posts
 * Manages saved competitor posts in the `competitor_saved_posts` table.
 *
 * GET    ?slug=william                    → list all saved posts for slug
 * POST   { slug, competitorUsername, postId, postUrl, caption,
 *           mediaType, thumbnailUrl, likeCount, commentCount, postTimestamp } → upsert
 * DELETE ?slug=william&postId=xxx         → remove
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug obrigatório" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { data, error } = await sb
    .from("competitor_saved_posts")
    .select("*")
    .eq("slug", slug)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    slug, competitorUsername, postId, postUrl,
    caption, mediaType, thumbnailUrl,
    likeCount, commentCount, postTimestamp,
  } = body;

  if (!slug || !postId) return Response.json({ error: "slug e postId obrigatórios" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { data, error } = await sb
    .from("competitor_saved_posts")
    .upsert(
      {
        slug,
        competitor_username: competitorUsername,
        post_id:             postId,
        post_url:            postUrl,
        caption,
        media_type:          mediaType,
        thumbnail_url:       thumbnailUrl,
        like_count:          likeCount,
        comment_count:       commentCount,
        post_timestamp:      postTimestamp,
      },
      { onConflict: "slug,post_id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ post: data });
}

export async function DELETE(req: NextRequest) {
  const slug   = req.nextUrl.searchParams.get("slug");
  const postId = req.nextUrl.searchParams.get("postId");

  if (!slug || !postId) return Response.json({ error: "slug e postId obrigatórios" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { error } = await sb
    .from("competitor_saved_posts")
    .delete()
    .eq("slug", slug)
    .eq("post_id", postId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
