import { fetchProfile, fetchMedia } from "@/lib/instagram-api";

// Revalidate every 2 days (172800 seconds)
export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, media] = await Promise.all([
    fetchProfile("william"),
    fetchMedia("william", 20),
  ]);

  if (!profile) {
    return Response.json({ error: "Erro ao buscar dados do @williamnmadruga" }, { status: 500 });
  }

  return Response.json(
    { profile, media, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=172800, stale-while-revalidate=86400" } }
  );
}
