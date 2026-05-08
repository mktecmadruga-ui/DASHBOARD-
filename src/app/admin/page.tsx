"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Edit2, Trash2, X, Loader2,
  Shield, User, Eye, EyeOff, Check, ChevronLeft, LogOut,
} from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  created_at: string;
  last_sign_in: string | null;
};

type FormData = { email: string; password: string; name: string; role: "admin" | "user" };

const EMPTY_FORM: FormData = { email: "", password: "", name: "", role: "user" };

export default function AdminPage() {
  const router = useRouter();

  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [form,       setForm]       = useState<FormData>(EMPTY_FORM);
  const [showPw,     setShowPw]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const [saveOk,     setSaveOk]     = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res  = await fetch("/api/users");
    const json = await res.json();
    if (json.users) setUsers(json.users);
    else setError(json.error ?? "Erro ao carregar usuários");
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function openCreate() {
    setEditTarget(null); setForm(EMPTY_FORM);
    setSaveError(""); setSaveOk(false); setShowPw(false);
    setModalOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setForm({ email: u.email, password: "", name: u.name, role: u.role });
    setSaveError(""); setSaveOk(false); setShowPw(false);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setSaveError(""); setSaveOk(false);
    const res = await fetch("/api/users", {
      method: editTarget ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editTarget ? { id: editTarget.id, ...form } : form),
    });
    const json = await res.json();
    if (!res.ok) { setSaveError(json.error ?? "Erro ao salvar"); setSaving(false); return; }
    setSaveOk(true);
    setTimeout(() => { setModalOpen(false); fetchUsers(); }, 800);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/users?id=${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null); setDeleting(false); fetchUsers();
  }

  async function handleLogout() {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (sbUrl && sbKey) {
      const sb = createBrowserClient(sbUrl, sbKey);
      await sb.auth.signOut();
    }
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4"/> Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Users className="w-4 h-4 text-white"/>
              </div>
              <h1 className="text-lg font-semibold text-slate-900">Gerenciar Usuários</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="w-4 h-4"/> Novo usuário
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200 transition-all cursor-pointer">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin"/> Carregando...
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500 text-sm">{error}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Usuário</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">E-mail</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Perfil</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Último acesso</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr key={u.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {(u.name || u.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{u.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium",
                        u.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-500")}>
                        {u.role === "admin" ? <Shield className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                        {u.role === "admin" ? "Admin" : "Usuário"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {u.last_sign_in
                        ? new Date(u.last_sign_in).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
                        : "Nunca"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)}
                          className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-slate-900">
                  {editTarget ? "Editar usuário" : "Novo usuário"}
                </h2>
                <button onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center cursor-pointer text-slate-400">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Nome</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="João Silva"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="joao@email.com" disabled={!!editTarget}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all disabled:opacity-50 disabled:bg-slate-50"/>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">
                    Senha {editTarget && <span className="text-slate-400">(deixe em branco para não alterar)</span>}
                  </label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={editTarget ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">Perfil</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["user", "admin"] as const).map(r => (
                      <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer",
                          form.role === r
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                        {r === "admin" ? <Shield className="w-3.5 h-3.5"/> : <User className="w-3.5 h-3.5"/>}
                        {r === "admin" ? "Admin" : "Usuário"}
                      </button>
                    ))}
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
                )}

                <button onClick={handleSave}
                  disabled={saving || !form.email || (!editTarget && !form.password)}
                  className="w-full h-11 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Salvando...</>
                    : saveOk ? <><Check className="w-4 h-4"/>Salvo!</>
                    : editTarget ? "Salvar alterações" : "Criar usuário"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Excluir usuário</h3>
              <p className="text-sm text-slate-500 mb-5">
                Tem certeza que deseja excluir <b>{deleteTarget.name || deleteTarget.email}</b>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-10 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 h-10 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
