/**
 * GET /api/cron/check-creatives
 * Runs hourly via Vercel Cron.
 * Finds calendar events with status='criativo' (creative ready for review)
 * that haven't been notified yet, sends Telegram alert with deeplink.
 */
import { getSupabase } from "@/lib/supabase";
import { sendTelegram, isAuthorisedCron } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://madruga-dashboard.vercel.app";

export async function GET(req: Request) {
  if (!isAuthorisedCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  // Pull events ready for review (status = 'criativo')
  const { data: events, error } = await sb
    .from("calendar_events")
    .select("*")
    .eq("status", "criativo")
    .order("data", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (!events || events.length === 0) {
    return Response.json({ checked: 0, notified: 0, message: "Nenhum criativo aguardando revisão" });
  }

  let notified = 0;
  let skipped  = 0;
  const results: Array<{ id: string; titulo: string; status: string }> = [];

  for (const ev of events) {
    const tipoEmoji = ev.tipo === "reel" ? "🎬" : ev.tipo === "carrossel" ? "🎠" : ev.tipo === "story" ? "📸" : "📝";
    const tipoLabel = ev.tipo === "reel" ? "Reel" : ev.tipo === "carrossel" ? "Carrossel" : ev.tipo === "story" ? "Story" : "Feed";
    const slugLabel = ev.slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
    const date      = new Date(ev.data + "T12:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"long" });
    const link      = `${PROD_URL}/?event=${ev.id}#sec-calendar`;

    const text = `🎨 <b>Criativo pronto para revisão</b>

${tipoEmoji} <b>${tipoLabel}</b> · ${slugLabel}
📅 Agendado para ${date}

<b>${escapeHtml(ev.titulo)}</b>

${ev.legenda ? `<i>${escapeHtml(String(ev.legenda).slice(0, 200))}${String(ev.legenda).length > 200 ? "…" : ""}</i>\n\n` : ""}👉 <a href="${link}">Revisar agora</a>`;

    const r = await sendTelegram({
      text,
      dedup: { type: "creative_review", reference_id: ev.id },
    });

    if (r.skipped) skipped++;
    else if (r.ok) notified++;
    results.push({ id: ev.id, titulo: ev.titulo, status: r.skipped ? "skipped" : r.ok ? "sent" : "error" });
  }

  return Response.json({
    checked: events.length,
    notified,
    skipped,
    results,
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
