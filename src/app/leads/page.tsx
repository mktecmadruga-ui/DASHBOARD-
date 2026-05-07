"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, RefreshCw, Flame, HelpCircle, Handshake,
  Ban, MessageCircle, ChevronRight, Trash2, Bell, CheckCircle,
  AlertCircle, X, Send,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type Classification = "lead_quente" | "duvida" | "parceria" | "spam" | "novo";
type Status         = "novo" | "em_conversa" | "qualificado" | "cliente" | "perdido";

interface Lead {
  id: string;
  ig_username: string;
  ig_user_id: string;
  last_message: string;
  classification: Classification;
  status: Status;
  notes: string;
  created_at: string;
  updated_at?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const COLUMNS: { id: Status; label: string; color: string; bg: string }[] = [
  { id: "novo",        label: "🆕 Novos",         color: "text-blue-600",  bg: "bg-blue-50 border-blue-200"    },
  { id: "em_conversa", label: "💬 Em Conversa",   color: "text-yellow-600",bg: "bg-yellow-50 border-yellow-200"},
  { id: "qualificado", label: "⭐ Qualificados",   color: "text-purple-600",bg: "bg-purple-50 border-purple-200"},
  { id: "cliente",     label: "✅ Cliente",        color: "text-green-600", bg: "bg-green-50 border-green-200"  },
];

const CLASS_META: Record<Classification, { label: string; icon: React.ElementType; color: string }> = {
  lead_quente: { label: "Lead Quente",  icon: Flame,          color: "text-red-500 bg-red-50 border-red-200"       },
  duvida:      { label: "Dúvida",       icon: HelpCircle,     color: "text-blue-500 bg-blue-50 border-blue-200"     },
  parceria:    { label: "Parceria",     icon: Handshake,      color: "text-purple-500 bg-purple-50 border-purple-200"},
  spam:        { label: "Spam",         icon: Ban,            color: "text-slate-400 bg-slate-50 border-slate-200"  },
  novo:        { label: "Não lido",     icon: MessageCircle,  color: "text-sky-500 bg-sky-50 border-sky-200"        },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 60)  return `há ${min}min`;
  if (min < 1440)return `há ${Math.floor(min / 60)}h`;
  return `há ${Math.floor(min / 1440)}d`;
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({
  lead, onMove, onDelete, onNote,
}: {
  lead: Lead;
  onMove:   (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onNote:   (lead: Lead) => void;
}) {
  const cls    = CLASS_META[lead.classification];
  const ClsIcon = cls.icon;
  const nextStatus: Record<Status, Status | null> = {
    novo: "em_conversa", em_conversa: "qualificado", qualificado: "cliente", cliente: null, perdido: null,
  };
  const next = nextStatus[lead.status];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-slate-800 text-sm">@{lead.ig_username}</p>
          <p className="text-xs text-slate-400">{timeAgo(lead.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onNote(lead)}
            title="Anotação"
            className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => onDelete(lead.id)}
            title="Remover"
            className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Tag */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium mb-2 ${cls.color}`}>
        <ClsIcon className="w-3 h-3" />
        {cls.label}
      </div>

      {/* Last message */}
      {lead.last_message && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{lead.last_message}</p>
      )}

      {/* Note */}
      {lead.notes && (
        <p className="text-xs text-slate-400 italic mb-2 bg-slate-50 rounded-lg px-2 py-1">{lead.notes}</p>
      )}

      {/* Move button */}
      {next && (
        <button
          onClick={() => onMove(lead.id, next)}
          className="w-full flex items-center justify-center gap-1.5 mt-2 py-1.5 rounded-xl bg-slate-50 hover:bg-primary/5 hover:text-primary text-slate-500 text-xs font-medium transition-all cursor-pointer"
        >
          Avançar <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      {lead.status === "qualificado" && (
        <button
          onClick={() => onMove(lead.id, "perdido")}
          className="w-full flex items-center justify-center gap-1 mt-1 py-1 text-slate-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
        >
          Marcar perdido
        </button>
      )}
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: Partial<Lead>) => void }) {
  const [username, setUsername]     = useState("");
  const [message, setMessage]       = useState("");
  const [cls, setCls]               = useState<Classification>("novo");

  function submit() {
    if (!username.trim()) return;
    onAdd({ ig_username: username.trim().replace("@", ""), last_message: message, classification: cls });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Adicionar Lead</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">@ do Instagram *</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: joao.silva"
              className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Última mensagem (opcional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Cole a mensagem recebida..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Classificação</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CLASS_META) as [Classification, typeof CLASS_META[Classification]][]).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setCls(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${cls === key ? meta.color + " border-current" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!username.trim()}
          className="mt-6 w-full h-11 rounded-2xl gradient-primary text-white text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Adicionar Lead
        </button>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────
function NoteModal({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (id: string, notes: string) => void }) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Anotação — @{lead.ig_username}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Detalhes do lead, próximos passos..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-4"
        />
        <button
          onClick={() => { onSave(lead.id, notes); onClose(); }}
          className="w-full h-10 rounded-2xl gradient-primary text-white text-sm font-semibold cursor-pointer hover:opacity-90"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Telegram Setup ───────────────────────────────────────────────────────────
function TelegramSetup() {
  const [token, setToken]   = useState("");
  const [chatId, setChatId] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [botName, setBotName] = useState("");
  const [msg, setMsg]       = useState("");

  async function setup() {
    setStatus("loading");
    const r = await fetch("/api/notifications/telegram?setup=1");
    const d = await r.json();
    if (d.bot) {
      setBotName(d.bot.username);
      if (d.chat_id) { setChatId(String(d.chat_id)); setStatus("ok"); }
      else { setMsg(d.hint); setStatus("idle"); }
    } else { setMsg("Token inválido"); setStatus("err"); }
  }

  async function test() {
    setStatus("loading");
    const r = await fetch("/api/notifications/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "🔔 <b>Madruga Dashboard</b>\nNotificações ativadas com sucesso! ✅", chat_id: chatId }),
    });
    const d = await r.json();
    setStatus(d.ok ? "ok" : "err");
    setMsg(d.ok ? "Mensagem enviada!" : d.error);
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Notificações no Celular</h3>
          <p className="text-xs text-slate-400">via Telegram Bot — grátis</p>
        </div>
      </div>

      <ol className="text-sm text-slate-600 space-y-2 mb-5">
        <li><span className="font-semibold text-primary">1.</span> Abra o Telegram → busque <strong>@BotFather</strong> → envie <code className="bg-slate-100 px-1.5 py-0.5 rounded">/newbot</code></li>
        <li><span className="font-semibold text-primary">2.</span> Dê um nome ao bot (ex: <em>Madruga Alerts</em>)</li>
        <li><span className="font-semibold text-primary">3.</span> Cole o token abaixo e salve em <code className="bg-slate-100 px-1.5 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code> nas variáveis da Vercel</li>
        <li><span className="font-semibold text-primary">4.</span> Mande qualquer mensagem pro bot e clique em <strong>Verificar</strong></li>
      </ol>

      <div className="space-y-3">
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Token do bot (ex: 7234567890:AAEab...)"
          className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {chatId && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 font-medium">Chat ID: <code>{chatId}</code></span>
          </div>
        )}
        {botName && <p className="text-xs text-slate-500">Bot: @{botName}</p>}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${status === "err" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
            <AlertCircle className="w-4 h-4" />
            {msg}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={setup} disabled={!token} className="flex-1 h-10 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-40 cursor-pointer transition-colors">
            {status === "loading" ? "Verificando..." : "Verificar"}
          </button>
          {chatId && (
            <button onClick={test} className="flex-1 h-10 rounded-xl gradient-primary text-white text-sm font-medium cursor-pointer hover:opacity-90 flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> Testar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [noteTarget, setNoteTarget] = useState<Lead | null>(null);
  const [dmStatus, setDmStatus]     = useState<"idle"|"loading"|"ok"|"disabled"|"err">("idle");
  const [tab, setTab]               = useState<"kanban"|"telegram">("kanban");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leads");
      const d = await r.json();
      setLeads(d.leads ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function importFromDMs() {
    setDmStatus("loading");
    const r = await fetch("/api/instagram/madruga/conversations");
    const d = await r.json();
    if (d.disabled_by_owner) { setDmStatus("disabled"); return; }
    if (d.error)             { setDmStatus("err");      return; }
    // Import conversations not already in leads
    const existingIds = new Set(leads.map(l => l.ig_user_id));
    const newConvs = (d.conversations ?? []).filter((c: { ig_user_id: string }) => !existingIds.has(c.ig_user_id));
    for (const conv of newConvs.slice(0, 20)) {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ig_username:  conv.ig_username,
          ig_user_id:   conv.ig_user_id,
          last_message: conv.last_message,
          classification: "novo",
          status: "novo",
        }),
      });
    }
    setDmStatus("ok");
    fetchLeads();
  }

  async function addLead(data: Partial<Lead>) {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchLeads();
  }

  async function moveLead(id: string, status: Status) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteLead(id: string) {
    setLeads(prev => prev.filter(l => l.id !== id));
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
  }

  async function saveNote(id: string, notes: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  const hot   = leads.filter(l => l.classification === "lead_quente").length;
  const total = leads.length;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Top nav */}
      <div className="flex items-center gap-4 px-8 py-5 bg-white border-b border-slate-100">
        <Link href="/" className="text-sm text-slate-400 hover:text-primary transition-colors">← Dashboard</Link>
        <span className="text-slate-200">/</span>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold text-slate-700">Leads — @madrugacontabilidade</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hot > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              <Flame className="w-3.5 h-3.5" />{hot} lead{hot > 1 ? "s" : ""} quente{hot > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-slate-400">{total} leads total</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 py-4 flex items-center gap-4">
        <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <button
            onClick={() => setTab("kanban")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${tab === "kanban" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setTab("telegram")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${tab === "telegram" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            🔔 Notificações
          </button>
        </div>

        {tab === "kanban" && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={importFromDMs}
              disabled={dmStatus === "loading"}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:border-primary hover:text-primary transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dmStatus === "loading" ? "animate-spin" : ""}`} />
              Importar DMs
            </button>
            {dmStatus === "disabled" && (
              <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                Ative acesso a DMs em business.facebook.com
              </span>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 cursor-pointer shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        )}
      </div>

      {tab === "kanban" ? (
        <div className="px-8 pb-8">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map(c => (
                <div key={c.id} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map(col => {
                const colLeads = leads.filter(l => l.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col gap-3">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${col.bg}`}>
                      <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-white/80 ${col.color}`}>{colLeads.length}</span>
                    </div>
                    {/* Cards */}
                    {colLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onMove={moveLead}
                        onDelete={deleteLead}
                        onNote={setNoteTarget}
                      />
                    ))}
                    {colLeads.length === 0 && (
                      <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                        Sem leads aqui
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Perdidos section */}
          {leads.filter(l => l.status === "perdido").length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">❌ Perdidos</p>
              <div className="flex flex-wrap gap-2">
                {leads.filter(l => l.status === "perdido").map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                    @{l.ig_username}
                    <button onClick={() => deleteLead(l.id)} className="hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-8 pb-8 max-w-lg">
          <TelegramSetup />
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">📌 Depois de configurar o bot:</p>
            <p>Adicione <code className="bg-white px-1 rounded">TELEGRAM_BOT_TOKEN</code> e <code className="bg-white px-1 rounded">TELEGRAM_CHAT_ID_WILLIAM</code> nas variáveis de ambiente da Vercel. O dashboard vai enviar alertas automáticos pra cada novo lead quente detectado.</p>
          </div>
        </div>
      )}

      {showAdd    && <AddLeadModal onClose={() => setShowAdd(false)} onAdd={addLead} />}
      {noteTarget && <NoteModal lead={noteTarget} onClose={() => setNoteTarget(null)} onSave={saveNote} />}
    </div>
  );
}
