/**
 * /api/calendar — CRUD for calendar events stored in Supabase
 * Falls back gracefully if SUPABASE env vars are not set (returns 503).
 *
 * GET    ?slug=william         → list events for that profile
 * POST   body: CalendarEvent   → upsert event
 * DELETE ?id=xxx               → delete event by id
 */
import { getSupabase } from "@/lib/supabase";
import type { DBCalendarEvent } from "@/lib/supabase";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function notConfigured() {
  return Response.json({ error: "Supabase não configurado", configured: false }, { status: 503 });
}

export async function GET(req: NextRequest) {
  const sb   = getSupabase();
  if (!sb) return notConfigured();
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug obrigatório" }, { status: 400 });

  const { data, error } = await sb
    .from("calendar_events")
    .select("*")
    .eq("slug", slug)
    .order("data", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return notConfigured();

  const body = await req.json();
  // Creatives are uploaded from the client before saving — expect https:// URLs only (never base64)
  let creativesUrls: string[] = [];
  if (Array.isArray(body.creatives) && body.creatives.length > 0) {
    for (const c of body.creatives as { dataUrl: string; name: string }[]) {
      // Only store actual URLs — never store base64 in the DB
      if (c.dataUrl && c.dataUrl.startsWith("http")) creativesUrls.push(c.dataUrl);
    }
  } else if (typeof body.creatives_urls === "string") {
    creativesUrls = body.creatives_urls.split("|").filter(Boolean);
  }

  const row: DBCalendarEvent = {
    id:              body.id,
    slug:            body.slug,
    titulo:          body.titulo,
    data:            body.data,
    tipo:            body.tipo,
    status:          body.status,
    scheduled_at:    body.scheduledAt ?? null,
    legenda:         body.legenda ?? null,
    copy:            body.copy ?? null,
    hashtags:        Array.isArray(body.hashtags) ? body.hashtags.join(",") : (body.hashtags ?? null),
    creatives_urls:  creativesUrls.length ? creativesUrls.join("|") : null,
    alteracoes:      body.alteracoes ?? null,
  };

  const { error } = await sb.from("calendar_events").upsert(row, { onConflict: "id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return notConfigured();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id obrigatório" }, { status: 400 });

  const { error } = await sb.from("calendar_events").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
