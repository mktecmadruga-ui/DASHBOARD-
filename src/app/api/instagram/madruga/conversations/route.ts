/**
 * GET /api/instagram/madruga/conversations
 * Fetches Instagram DMs for @madrugacontabilidade via Graph API.
 * Requires instagram_manage_messages permission enabled in Meta app.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_ID    = "1109213538943020";
const PAGE_TOKEN = process.env.INSTAGRAM_GRAPH_TOKEN!;
const BASE       = "https://graph.facebook.com/v19.0";

export async function GET() {
  try {
    const res = await fetch(
      `${BASE}/${PAGE_ID}/conversations?platform=instagram&fields=participants,updated_time,messages{message,from,created_time}&limit=40&access_token=${PAGE_TOKEN}`,
      { cache: "no-store" }
    );
    const json = await res.json();

    if (json.error) {
      const disabled = json.error.error_subcode === 2534041;
      return NextResponse.json({
        error: json.error.message,
        disabled_by_owner: disabled,
        hint: disabled
          ? "Ative o acesso a DMs em business.facebook.com → Conta Instagram → Mensagens Conectadas"
          : "Verifique as permissões do app no Meta Developers (instagram_manage_messages)",
      }, { status: 403 });
    }

    // Normalise conversations
    const conversations = (json.data ?? []).map((conv: {
      id: string;
      updated_time: string;
      participants?: { data: Array<{ id: string; username?: string; name?: string }> };
      messages?: { data: Array<{ id: string; message: string; from: { id: string; username?: string }; created_time: string }> };
    }) => {
      const messages  = conv.messages?.data ?? [];
      const lastMsg   = messages[0];
      // Participant that is NOT the page
      const other     = conv.participants?.data?.find(p => p.id !== PAGE_ID) ?? {};
      return {
        id:           conv.id,
        ig_user_id:   (other as { id?: string }).id   ?? "",
        ig_username:  (other as { username?: string }).username ?? (other as { name?: string }).name ?? "Desconhecido",
        last_message: lastMsg?.message ?? "",
        last_message_at: lastMsg?.created_time ?? conv.updated_time,
        updated_time: conv.updated_time,
      };
    });

    return NextResponse.json({ conversations });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
