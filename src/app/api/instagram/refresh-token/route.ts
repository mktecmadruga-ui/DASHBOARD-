/**
 * GET  /api/instagram/refresh-token
 *   → troca o token atual por um long-lived (60 dias) ou renova se já for long-lived
 *
 * POST /api/instagram/refresh-token
 *   Body: { shortLivedToken: string }
 *   → recebe um token curto (do Graph API Explorer) e retorna o long-lived equivalente
 */

const APP_ID     = process.env.INSTAGRAM_APP_ID!;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;

async function exchangeForLongLived(token: string): Promise<{ access_token: string; expires_in: number } | null> {
  const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error("[refresh-token] exchange error:", data.error);
    return null;
  }
  return data; // { access_token, token_type, expires_in }
}

async function debugToken(token: string) {
  const appToken = `${APP_ID}|${APP_SECRET}`;
  const url = `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`;
  const res = await fetch(url);
  return res.json();
}

// GET → renova o token atual configurado no env
export async function GET() {
  const currentToken = process.env.INSTAGRAM_GRAPH_TOKEN;
  if (!currentToken) {
    return Response.json({ error: "INSTAGRAM_GRAPH_TOKEN não configurado" }, { status: 400 });
  }

  // Inspecionar token atual
  const debug = await debugToken(currentToken);
  const tokenData = debug.data ?? {};

  const expiresAt  = tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null;
  const isValid    = tokenData.is_valid ?? false;
  const daysLeft   = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : 0;

  if (!isValid) {
    return Response.json({
      status: "expired",
      message: "Token expirado. Gere um novo token curto no Graph API Explorer e faça POST com { shortLivedToken }.",
      expiresAt: expiresAt?.toISOString() ?? null,
    });
  }

  // Se ainda válido, tenta renovar (long-lived tokens podem ser renovados antes de expirar)
  const renewed = await exchangeForLongLived(currentToken);
  if (!renewed) {
    return Response.json({
      status: "valid_no_renew",
      isValid,
      daysLeft,
      expiresAt: expiresAt?.toISOString() ?? null,
      message: "Token válido mas não foi possível renovar agora.",
    });
  }

  const newExpiry = new Date(Date.now() + renewed.expires_in * 1000);

  return Response.json({
    status: "renewed",
    access_token: renewed.access_token,
    expires_in_days: Math.floor(renewed.expires_in / 86400),
    expires_at: newExpiry.toISOString(),
    message: "✅ Token renovado! Atualize INSTAGRAM_GRAPH_TOKEN na Vercel com o novo access_token.",
  });
}

// POST → troca token curto (Graph API Explorer) por long-lived
export async function POST(req: Request) {
  const { shortLivedToken } = await req.json();
  if (!shortLivedToken) {
    return Response.json({ error: "shortLivedToken obrigatório no body" }, { status: 400 });
  }

  const result = await exchangeForLongLived(shortLivedToken);
  if (!result) {
    return Response.json({ error: "Falha ao trocar token. Verifique se o token curto é válido." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + result.expires_in * 1000);

  return Response.json({
    status: "ok",
    access_token: result.access_token,
    expires_in_days: Math.floor(result.expires_in / 86400),
    expires_at: expiresAt.toISOString(),
    message: `✅ Long-lived token gerado! Válido por ${Math.floor(result.expires_in / 86400)} dias. Atualize INSTAGRAM_GRAPH_TOKEN na Vercel.`,
  });
}
