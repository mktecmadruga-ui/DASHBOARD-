/**
 * GET  /api/users        → list all users (admin only)
 * POST /api/users        → create user { email, password, name, role }
 * PUT  /api/users        → update user { id, name, role, password? }
 * DELETE /api/users?id=  → delete user
 */
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const sb   = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? "user";
  if (role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Não autorizado" }, { status: 403 });

  const sb = createSupabaseAdmin();
  if (!sb) return Response.json({ error: "Admin client não configurado" }, { status: 503 });

  const { data, error } = await sb.auth.admin.listUsers();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const users = data.users.map(u => ({
    id:         u.id,
    email:      u.email,
    name:       u.user_metadata?.name ?? "",
    role:       u.user_metadata?.role ?? "user",
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));

  return Response.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Não autorizado" }, { status: 403 });

  const sb = createSupabaseAdmin();
  if (!sb) return Response.json({ error: "Admin client não configurado" }, { status: 503 });

  const { email, password, name, role } = await req.json();
  if (!email || !password) return Response.json({ error: "email e password obrigatórios" }, { status: 400 });

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name ?? "", role: role ?? "user" },
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Não autorizado" }, { status: 403 });

  const sb = createSupabaseAdmin();
  if (!sb) return Response.json({ error: "Admin client não configurado" }, { status: 503 });

  const { id, name, role, password } = await req.json();
  if (!id) return Response.json({ error: "id obrigatório" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    user_metadata: { name, role },
  };
  if (password) updates.password = password;

  const { error } = await sb.auth.admin.updateUserById(id, updates);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Não autorizado" }, { status: 403 });

  const sb = createSupabaseAdmin();
  if (!sb) return Response.json({ error: "Admin client não configurado" }, { status: 503 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id obrigatório" }, { status: 400 });

  // Prevent self-deletion
  if (id === admin.id) return Response.json({ error: "Não pode excluir a própria conta" }, { status: 400 });

  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
