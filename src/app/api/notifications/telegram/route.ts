/**
 * POST /api/notifications/telegram
 * Sends a message via Telegram bot.
 * Body: { message: string, chat_id?: string }
 *
 * GET /api/notifications/telegram?setup=1
 * Returns bot info + latest update to get chat_id (for setup)
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE      = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function GET(req: NextRequest) {
  if (!BOT_TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 503 });

  const setup = req.nextUrl.searchParams.get("setup");
  if (setup) {
    // Get bot info
    const [me, updates] = await Promise.all([
      fetch(`${BASE}/getMe`).then(r => r.json()),
      fetch(`${BASE}/getUpdates?limit=5`).then(r => r.json()),
    ]);
    const latestUpdate = updates.result?.[updates.result.length - 1];
    const chat_id = latestUpdate?.message?.chat?.id
      ?? latestUpdate?.my_chat_member?.chat?.id
      ?? null;
    return NextResponse.json({
      bot:     me.result,
      chat_id,
      hint:    chat_id ? null : "Mande qualquer mensagem pro bot e chame esse endpoint novamente",
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 503 });

  const { message, chat_id } = await req.json();
  const target = chat_id ?? process.env.TELEGRAM_CHAT_ID_WILLIAM;
  if (!target) return NextResponse.json({ error: "chat_id não configurado" }, { status: 400 });

  const res  = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: target,
      text: message,
      parse_mode: "HTML",
    }),
  });
  const data = await res.json();
  if (!data.ok) return NextResponse.json({ error: data.description }, { status: 500 });
  return NextResponse.json({ ok: true });
}
