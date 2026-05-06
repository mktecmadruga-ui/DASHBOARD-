import { fetchProfile, fetchMedia } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, media] = await Promise.all([
    fetchProfile("william"),
    fetchMedia("william", 20),
  ]);

  if (!profile) {
    // Token expirado — tentar buscar via conta Madruga como fallback temporário
    const [fallbackProfile, fallbackMedia] = await Promise.all([
      fetchProfile("madruga"),
      fetchMedia("madruga", 20),
    ]);

    return Response.json({
      error: "token_expired",
      // Retorna dados do madruga como fallback para não quebrar o dashboard
      // O frontend vai exibir um banner de aviso
      profile: fallbackProfile ? {
        ...fallbackProfile,
        username: "williamnmadruga",
        name: "William Madruga",
        biography: fallbackProfile.biography,
        // mantém followers_count real do madruga como estimativa
      } : null,
      media: fallbackMedia,
      isFallback: true,
    }, { status: 200 });
  }

  return Response.json(
    { profile, media, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=172800, stale-while-revalidate=86400" } }
  );
}
