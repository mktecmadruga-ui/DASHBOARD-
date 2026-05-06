import { fetchProfile, fetchMedia } from "@/lib/instagram-api";

// Revalidate every 2 days (172800 seconds)
export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, media] = await Promise.all([
    fetchProfile("william"),
    fetchMedia("william", 20),
  ]);

  if (!profile) {
    // Token expirado ou não configurado — retorna 200 com flag para o frontend exibir aviso
    return Response.json({
      error: "token_expired",
      message: "Token do @williamnmadruga expirado. Gere um novo token IGAA via Instagram Basic Display API.",
      profile: null,
      media: [],
    }, { status: 200 });
  }

  return Response.json(
    { profile, media, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=172800, stale-while-revalidate=86400" } }
  );
}
