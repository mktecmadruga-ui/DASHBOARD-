import { fetchProfile } from "@/lib/instagram-api";

export async function GET() {
  try {
    const account = await fetchProfile("william");

    if (!account) {
      return Response.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    return Response.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        followers: account.followers_count,
        media: account.media_count,
      },
    });
  } catch {
    return Response.json({ error: "Erro ao validar token" }, { status: 500 });
  }
}
