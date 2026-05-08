/**
 * POST /api/notifications/telegram/creative
 * Sends a calendar event to William on Telegram for review.
 * Called from the ContentCalendar "📤 William" button.
 */
import { sendTelegram } from "@/lib/telegram";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://madruga-dashboard.vercel.app";

const TIPO_EMOJI: Record<string, string> = {
  reel: "🎬", carrossel: "🎠", story: "📸", feed: "📝",
};
const TIPO_LABEL: Record<string, string> = {
  reel: "Reel", carrossel: "Carrossel", story: "Story", feed: "Feed",
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "body inválido" }, { status: 400 });

  const { eventId, titulo, tipo, slug, data: date, scheduledAt, legenda, copy, hashtags, creativeUrl } = body;

  const tipoEmoji = TIPO_EMOJI[tipo] ?? "📝";
  const tipoLabel = TIPO_LABEL[tipo] ?? tipo;
  const slugLabel = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const dateStr = date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "";
  const timeStr = scheduledAt ? new Date(scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const link = `${PROD_URL}/?event=${eventId}#sec-calendar`;

  const hashtagLine = Array.isArray(hashtags) && hashtags.length
    ? `\n\n<code>${hashtags.map((h: string) => `#${h}`).join(" ")}</code>`
    : typeof hashtags === "string" && hashtags
    ? `\n\n<code>${hashtags.split(",").map((h: string) => `#${h.trim()}`).join(" ")}</code>`
    : "";

  const copySection = copy
    ? `\n\n📝 <b>Roteiro:</b>\n<i>${escapeHtml(String(copy).slice(0, 600))}${String(copy).length > 600 ? "…" : ""}</i>`
    : "";

  const legendaSection = legenda
    ? `\n\n📱 <b>Legenda:</b>\n<i>${escapeHtml(String(legenda))}</i>${hashtagLine}`
    : "";

  const text = `🎨 <b>Criativo pronto para revisão</b>

${tipoEmoji} <b>${tipoLabel}</b> · ${slugLabel}
📅 ${dateStr}${timeStr ? ` às ${timeStr}` : ""}

<b>${escapeHtml(titulo)}</b>${copySection}${legendaSection}

👉 <a href="${link}">Abrir no calendário</a>`;

  const r = await sendTelegram({
    text,
    dedup: { type: "creative_review", reference_id: String(eventId) },
  });

  // If there's a creative image, send it as a photo
  if (creativeUrl && creativeUrl.startsWith("data:image") && r.ok && !r.skipped) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID_WILLIAM;
    if (BOT_TOKEN && CHAT_ID) {
      // Convert base64 to blob and send as photo
      try {
        const base64 = creativeUrl.split(",")[1];
        const mimeType = creativeUrl.split(";")[0].split(":")[1];
        const buffer = Buffer.from(base64, "base64");
        const form = new FormData();
        form.append("chat_id", CHAT_ID);
        form.append("caption", `🖼️ Criativo: ${escapeHtml(titulo)}`);
        form.append("photo", new Blob([buffer], { type: mimeType }), "criativo.jpg");
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          body: form,
        });
      } catch {
        // Photo sending is best-effort — don't fail the request
      }
    }
  }

  return Response.json({ ok: r.ok, skipped: r.skipped, error: r.error });
}
