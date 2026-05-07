import { fetchMediaInsights } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; mediaId: string } }
) {
  const data = await fetchMediaInsights(params.mediaId);
  if (!data) {
    return Response.json({ error: "Falha ao buscar insights do post" }, { status: 500 });
  }
  return Response.json({ ...data, mediaId: params.mediaId, fetchedAt: new Date().toISOString() });
}
