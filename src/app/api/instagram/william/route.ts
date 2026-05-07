import { fetchProfile, fetchMedia } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, media] = await Promise.all([
    fetchProfile("william"),
    fetchMedia("william", 20),
  ]);

  if (!profile) {
    return Response.json({ error: "token_expired" }, { status: 200 });
  }

  return Response.json({ profile, media, cachedAt: new Date().toISOString() });
}
