import { fetchAccountInsights } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const account = params.slug as AccountSlug;
  const days    = parseInt(req.nextUrl.searchParams.get("days") ?? "30");

  const data = await fetchAccountInsights(account, days);
  if (!data) {
    return Response.json({ error: "Falha ao buscar insights" }, { status: 500 });
  }

  return Response.json({ ...data, account, days, fetchedAt: new Date().toISOString() });
}
