import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/upload
 * Body: { dataUrl: string, name: string }
 * Returns: { url: string }
 *
 * Stores files in Supabase Storage bucket "creatives".
 * Falls back to base64 data URL if Supabase is not configured.
 */
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME = /^(image\/(jpeg|jpg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;

export async function POST(req: NextRequest) {
  try {
    const { dataUrl, name } = await req.json();

    if (!dataUrl || !name) {
      return Response.json({ error: "dataUrl e name são obrigatórios" }, { status: 400 });
    }

    // Parse base64
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return Response.json({ error: "dataUrl inválido" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64   = matches[2];

    // Validate MIME type — block executables, scripts, etc.
    if (!ALLOWED_MIME.test(mimeType)) {
      return Response.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_SIZE_BYTES) {
      return Response.json({ error: "Arquivo muito grande (máx 25MB)" }, { status: 413 });
    }

    const sb = getSupabase();
    if (!sb) {
      // Supabase not configured — return the dataUrl as-is (localStorage mode)
      return Response.json({ url: dataUrl, mimeType });
    }

    // Build safe filename with timestamp
    const ext      = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const safeName = `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

    const { error } = await sb.storage
      .from("creatives")
      .upload(safeName, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const { data: publicData } = sb.storage.from("creatives").getPublicUrl(safeName);
    return Response.json({ url: publicData.publicUrl, mimeType });
  } catch (e) {
    console.error("Upload error:", e);
    return Response.json({ error: "Falha no upload" }, { status: 500 });
  }
}
