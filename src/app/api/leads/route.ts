/**
 * GET  /api/leads          — lista todos os leads
 * POST /api/leads          — cria lead manual ou importa da conversa
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ leads: [], supabase: false });

  const { data, error } = await sb
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [], supabase: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    ig_username, ig_user_id = "", last_message = "",
    classification = "novo", status = "novo", notes = "",
  } = body;

  if (!ig_username) return NextResponse.json({ error: "ig_username obrigatório" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });

  const { data, error } = await sb.from("leads").insert({
    ig_username, ig_user_id, last_message, classification, status, notes,
    slug: "madruga",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
