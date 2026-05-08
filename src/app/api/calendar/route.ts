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
  // Upload base64 creatives to /api/upload and store URLs
  let creativesUrls: string[] = [];
  if (Array.isArray(body.creatives) && body.creatives.length > 0) {
    const host = req.headers.get("host") ?? "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    for (const c of body.creatives as { dataUrl: string; name: string }[]) {
      if (!c.dataUrl.startsWith("data:")) {
        creativesUrls.push(c.dataUrl); // already a URL
        continue;
      }
      try {
        const formData = new FormData();
        const base64 = c.dataUrl.split(",")[1];
        const mimeType = c.dataUrl.split(";")[0].split(":")[1];
        const buffer = Buffer.from(base64, "base64");
        formData.append("file", new Blob([buffer], { type: mimeType }), c.name || "criativo.jpg");
        const uploadRes = await fetch(`${baseUrl}/api/upload`, { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          if (url) creativesUrls.push(url);
        }
      } catch { /* skip failed uploads */ }
    }
  } else if (typeof body.creatives_urls === "string") {
    creativesUrls = body.creatives_urls.split(",").filter(Boolean);
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
    hashtags:        body.hashtags ?? null,
    creatives_urls:  creativesUrls.length ? creativesUrls.join(",") : null,
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
