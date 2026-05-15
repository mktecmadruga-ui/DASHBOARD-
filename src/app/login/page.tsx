"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, BarChart3, AlertCircle, Mail, Lock } from "lucide-react";

function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const next        = params.get("next") ?? "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  const disabled = loading || !email || !password;

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-primary/8 rounded-full blur-3xl animate-pulse-slow"/>
        <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] bg-info/8 rounded-full blur-3xl"/>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/5 rounded-full blur-3xl"/>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", duration: 0.5 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 mb-4">
            <BarChart3 className="w-7 h-7 text-white" aria-hidden="true"/>
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Madruga Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Entre com sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_32px_rgba(15,23,42,0.06)] p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-xs font-medium text-slate-600 block mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true"/>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!error}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="login-password" className="text-xs font-medium text-slate-600 block mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true"/>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPw}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true"/>
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={disabled}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true"/>Entrando...</>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Madruga Escritório Contábil © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
