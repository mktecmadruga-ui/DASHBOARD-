import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

/**
 * POST /api/upload
 * Body: { dataUrl: string, name: string }
 * Returns: { url: string } — publicly accessible URL for Instagram API
 */
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
    const buffer   = Buffer.from(base64, "base64");

    // Build safe filename with timestamp
    const ext      = mimeType.split("/")[1]?.replace("jpeg","jpg") ?? "jpg";
    const safeName = `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;
    const uploadDir= join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, safeName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    // Return public URL — works in production when deployed to a real domain
    const host    = req.headers.get("host") ?? "localhost:3000";
    const protocol= host.includes("localhost") ? "http" : "https";
    const url     = `${protocol}://${host}/uploads/${safeName}`;

    return Response.json({ url, mimeType });
  } catch (e) {
    console.error("Upload error:", e);
    return Response.json({ error: "Falha no upload" }, { status: 500 });
  }
}
