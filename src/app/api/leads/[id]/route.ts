/**
 * PATCH  /api/leads/[id]  — atualiza status / notes / classification
 * DELETE /api/leads/[id]  — remove lead
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });

  const body = await req.json();
  const { data, error } = await sb
    .from("leads")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });

  const { error } = await sb.from("leads").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
