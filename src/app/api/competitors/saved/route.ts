/**
 * GET/POST/DELETE /api/competitors/saved
 * Manages saved competitor profiles in the `competitors` Supabase table.
 *
 * GET  ?slug=william          → list saved competitors for slug
 * POST { slug, username }     → upsert competitor
 * DELETE ?slug=william&username=handle → remove competitor
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
    .from("competitors")
    .select("*")
    .eq("slug", slug)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ competitors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { slug, username } = await req.json();
  if (!slug || !username) return Response.json({ error: "slug e username obrigatórios" }, { status: 400 });

  const handle = username.replace(/^@/, "").trim().toLowerCase();

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { data, error } = await sb
    .from("competitors")
    .upsert({ slug, username: handle }, { onConflict: "slug,username" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ competitor: data });
}

export async function DELETE(req: NextRequest) {
  const slug     = req.nextUrl.searchParams.get("slug");
  const username = req.nextUrl.searchParams.get("username");

  if (!slug || !username) return Response.json({ error: "slug e username obrigatórios" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { error } = await sb
    .from("competitors")
    .delete()
    .eq("slug", slug)
    .eq("username", username);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
