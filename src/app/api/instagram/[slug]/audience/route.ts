import { fetchAudienceDemographics } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const account = params.slug as AccountSlug;
  const data    = await fetchAudienceDemographics(account);

  if (!data) {
    return Response.json({ error: "Falha ao buscar demographics" }, { status: 500 });
  }

  return Response.json({ ...data, account, fetchedAt: new Date().toISOString() });
}
