/**
 * GET /api/proxy-image?url=...
 * Proxies remote images server-side to bypass Instagram/CDN CORS restrictions.
 */
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("url obrigatório", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!res.ok) return new Response("Imagem não encontrada", { status: 404 });

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Erro ao buscar imagem", { status: 502 });
  }
}
