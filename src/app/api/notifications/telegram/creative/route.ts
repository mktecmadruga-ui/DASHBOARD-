/**
 * POST /api/notifications/telegram/creative
 * Sends a calendar event to William on Telegram for review.
 * Called from the ContentCalendar "📤 William" button.
 */
import { sendTelegram } from "@/lib/telegram";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const PROD_URL     = process.env.NEXT_PUBLIC_APP_URL ?? "https://madruga-dashboard.vercel.app";
const ALLOWED_CHATS = (process.env.TELEGRAM_ALLOWED_CHATS ?? process.env.TELEGRAM_CHAT_ID_WILLIAM ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

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

  // Inline review buttons for William
  const reviewKeyboard = {
    inline_keyboard: [[
      { text: "✅ Aprovar",         callback_data: `rev_approve_${eventId}` },
      { text: "✏️ Pedir alteração", callback_data: `rev_change_${eventId}`  },
    ]],
  };

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const targets   = ALLOWED_CHATS.length ? ALLOWED_CHATS : [process.env.TELEGRAM_CHAT_ID_WILLIAM ?? ""];

  let ok = false;
  for (const chatId of targets) {
    if (!chatId) continue;
    const r = await sendTelegram({ text, reply_markup: reviewKeyboard, chat_id: chatId });
    if (r.ok) ok = true;

    // Send photo to each chat
    if (creativeUrl && r.ok && !r.skipped && BOT_TOKEN) {
      try {
        if (creativeUrl.startsWith("http")) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, photo: creativeUrl, caption: `🖼️ Criativo: ${escapeHtml(titulo)}` }),
          });
        } else if (creativeUrl.startsWith("data:image")) {
          const base64  = creativeUrl.split(",")[1];
          const mimeType = creativeUrl.split(";")[0].split(":")[1];
          const buffer  = Buffer.from(base64, "base64");
          const form    = new FormData();
          form.append("chat_id", chatId);
          form.append("caption", `🖼️ Criativo: ${escapeHtml(titulo)}`);
          form.append("photo", new Blob([buffer], { type: mimeType }), "criativo.jpg");
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });
        }
      } catch { /* best-effort */ }
    }
  }

  return Response.json({ ok });
}
