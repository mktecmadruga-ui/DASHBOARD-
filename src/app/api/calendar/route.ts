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
  const row: DBCalendarEvent = {
    id:           body.id,
    slug:         body.slug,
    titulo:       body.titulo,
    data:         body.data,
    tipo:         body.tipo,
    status:       body.status,
    scheduled_at: body.scheduledAt ?? null,
    legenda:      body.legenda ?? null,
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
