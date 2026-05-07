/**
 * Telegram helper — send messages and dedupe via Supabase notifications_log.
 */
import { getSupabase } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID_WILLIAM;
const BASE      = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegram(opts: {
  text: string;
  chat_id?: string;
  /** When provided, dedup via notifications_log so the same message isn't sent twice */
  dedup?: { type: string; reference_id: string };
  parse_mode?: "HTML" | "Markdown";
  disable_preview?: boolean;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" };

  const target = opts.chat_id ?? CHAT_ID;
  if (!target)  return { ok: false, error: "chat_id não configurado" };

  // Dedup
  if (opts.dedup) {
    const sb = getSupabase();
    if (sb) {
      const { data: existing } = await sb
        .from("notifications_log")
        .select("id")
        .eq("type", opts.dedup.type)
        .eq("reference_id", opts.dedup.reference_id)
        .eq("chat_id", target)
        .maybeSingle();
      if (existing) return { ok: true, skipped: true };
    }
  }

  const res = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: target,
      text: opts.text,
      parse_mode: opts.parse_mode ?? "HTML",
      disable_web_page_preview: opts.disable_preview ?? false,
    }),
  });
  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.description };

  // Log the send
  if (opts.dedup) {
    const sb = getSupabase();
    if (sb) {
      await sb.from("notifications_log").insert({
        type: opts.dedup.type,
        reference_id: opts.dedup.reference_id,
        chat_id: String(target),
        payload: { text: opts.text },
      });
    }
  }

  return { ok: true };
}

/** Validate Vercel cron auth header */
export function isAuthorisedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (Vercel cron is auth'd at platform level)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
