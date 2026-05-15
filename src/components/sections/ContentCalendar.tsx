"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useAccount } from "@/context/AccountContext";
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  Copy, Check, Globe,
  Upload, X as XIcon, Image as ImageIcon, Clock, Send,
  CheckCircle2, AlertCircle, Kanban, FileText,
  Search, MoreHorizontal, Plus, FileDown, Lightbulb,
} from "lucide-react";
import type { CalendarEvent } from "@/types";
import { createBrowserClient } from "@supabase/ssr";
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors, closestCorners,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
// @dnd-kit/utilities reserved for future sortable use

// ─── Per-profile storage keys ─────────────────────────────────────────────────
const storageKey = (slug: string) => `calendar_events_v3_${slug}`;

// ─── Fallback suggested times ─────────────────────────────────────────────────
const FALLBACK_TIMES = [
  { label: "08h",  value: "08:00", tip: "Pico matinal"      },
  { label: "12h",  value: "12:00", tip: "Almoço"            },
  { label: "18h",  value: "18:00", tip: "⭐ Melhor horário"  },
  { label: "20h",  value: "20:00", tip: "Noite — alto eng." },
  { label: "21h",  value: "21:00", tip: "Pico noturno"      },
];

type BestTime = { label: string; value: string; tip: string; avg?: number };

const defaultEventsWilliam: CalendarEvent[] = [
  { id: "w1", titulo: "Split Payment Pix — impacto no CNPJ", data: "2026-05-06", tipo: "reel",      status: "agendado",  scheduledAt: "2026-05-06T18:00" },
  { id: "w2", titulo: "5 erros na declaração do IR",          data: "2026-05-07", tipo: "carrossel", status: "criativo" },
  { id: "w3", titulo: "Story: Enquete — você já pagou multa?",data: "2026-05-07", tipo: "story",     status: "roteiro"  },
  { id: "w4", titulo: "Escala 6x1 — quem paga a conta?",     data: "2026-05-08", tipo: "reel",      status: "agendado",  scheduledAt: "2026-05-08T18:00" },
  { id: "w5", titulo: "Feed: Reflexão do empresário",        data: "2026-05-09", tipo: "feed",      status: "rascunho" },
];

const defaultEventsMadruga: CalendarEvent[] = [
  { id: "m1", titulo: "Abertura de empresa — passo a passo", data: "2026-05-06", tipo: "carrossel", status: "agendado",  scheduledAt: "2026-05-06T18:00" },
  { id: "m2", titulo: "Reel: Quanto custa ter um CNPJ?",     data: "2026-05-07", tipo: "reel",      status: "criativo" },
  { id: "m3", titulo: "Story: Dica fiscal do dia",           data: "2026-05-08", tipo: "story",     status: "roteiro"  },
  { id: "m4", titulo: "Feed: Regime tributário ideal",       data: "2026-05-09", tipo: "feed",      status: "rascunho" },
];

const typeColors: Record<string, string> = {
  reel:      "bg-primary/15 text-primary border-primary/20",
  carrossel: "bg-info/15 text-info border-info/20",
  story:     "bg-warning/15 text-warning border-warning/20",
  feed:      "bg-success/15 text-success border-success/20",
};
const statusDot: Record<string, string> = {
  rascunho: "bg-slate-400", roteiro: "bg-warning",
  criativo: "bg-info",      agendado: "bg-success", publicado: "bg-primary",
};

const DAYS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS= ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const tipoOpts: { value: CalendarEvent["tipo"]; label: string }[] = [
  { value:"reel",      label:"Reels"     },
  { value:"carrossel", label:"Carrossel" },
  { value:"story",     label:"Story"     },
  { value:"feed",      label:"Feed"      },
];
const statusOpts: { value: CalendarEvent["status"]; label: string }[] = [
  { value:"rascunho",  label:"Rascunho"       },
  { value:"roteiro",   label:"Roteiro pronto" },
  { value:"criativo",  label:"Criativo pronto"},
  { value:"agendado",  label:"Agendado"       },
  { value:"publicado", label:"Publicado"      },
];


function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonday(d: Date) {
  const day = d.getDay(), diff = day===0?-6:1-day, m = new Date(d);
  m.setDate(d.getDate()+diff); m.setHours(0,0,0,0); return m;
}

// ─── Kanban sub-components ────────────────────────────────────────────────────

type KanbanCol = { status: CalendarEvent["status"]; label: string; color: string; bg: string; border: string };

function KanbanCardInner({ ev, statusDot, tipoOpts }: {
  ev: CalendarEvent;
  statusDot: Record<string, string>;
  tipoOpts: { value: string; label: string }[];
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusDot[ev.status])}/>
        <span className="text-text-light text-[10px]">{tipoOpts.find(t=>t.value===ev.tipo)?.label}</span>
        <span className="text-text-light text-[10px] ml-auto">{ev.data.slice(5).replace("-","/")} </span>
      </div>
      {ev.alteracoes && <p className="text-[9px] font-semibold text-red-500 mb-1">⚠️ Alterações</p>}
      <p className="font-medium text-text-dark leading-tight line-clamp-2 text-[11px]">{ev.titulo}</p>
      {ev.status === "rascunho" && ev.prompt && (
        <p className="mt-1 text-[10px] text-text-light leading-snug line-clamp-2 italic opacity-80">
          {ev.prompt.replace(/^💡 Ideia original:\n/, "").slice(0, 90)}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        {ev.copy      && <Sparkles  className="w-3 h-3 text-slate-300"/>}
        {(ev.creatives?.length || ev.creative) && <ImageIcon className="w-3 h-3 text-slate-300"/>}
        {ev.driveUrl  && <Globe     className="w-3 h-3 text-slate-300"/>}
        {ev.scheduledAt && <Clock   className="w-3 h-3 text-success"/>}
      </div>
    </>
  );
}

function KanbanCardGhost({ ev, statusDot, tipoOpts }: {
  ev: CalendarEvent;
  statusDot: Record<string, string>;
  tipoOpts: { value: string; label: string }[];
}) {
  return (
    <div className={cn(
      "p-2.5 rounded-xl border bg-white shadow-xl text-[11px] select-none w-[180px] rotate-2 opacity-90",
      ev.alteracoes ? "border-red-300 bg-red-50" : "border-primary/40"
    )}>
      <KanbanCardInner ev={ev} statusDot={statusDot} tipoOpts={tipoOpts}/>
    </div>
  );
}

function KanbanCard({ ev, statusDot, tipoOpts, onCardClick }: {
  ev: CalendarEvent;
  statusDot: Record<string, string>;
  tipoOpts: { value: string; label: string }[];
  onCardClick: (ev: CalendarEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ev.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onCardClick(ev)}
      className={cn(
        "p-2.5 rounded-xl border bg-white shadow-sm text-[11px] select-none",
        "cursor-grab active:cursor-grabbing touch-none",
        isDragging ? "invisible pointer-events-none" : "visible",
        ev.alteracoes ? "border-red-300 bg-red-50" : "border-slate-200"
      )}>
      <KanbanCardInner ev={ev} statusDot={statusDot} tipoOpts={tipoOpts}/>
    </div>
  );
}

const COL_HINTS: Record<string, string> = {
  rascunho:  "Ideias em construção",
  roteiro:   "Roteiro pronto pra criar",
  criativo:  "Arte pronta — só agendar",
  agendado:  "Agendado para publicar",
  publicado: "Já no Instagram",
};

function KanbanColumn({ col, events, statusDot, tipoOpts, onCardClick, onIdeaClick }: {
  col: KanbanCol;
  events: CalendarEvent[];
  statusDot: Record<string, string>;
  tipoOpts: { value: string; label: string }[];
  onCardClick: (ev: CalendarEvent) => void;
  onIdeaClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${col.label} com ${events.length} itens`}
      className={cn(
        "flex flex-col gap-2 min-w-[180px] flex-1 min-h-[320px] rounded-2xl border-2 p-3 transition-all duration-150",
        isOver ? "border-primary/60 bg-primary/5 scale-[1.01]" : cn(col.bg, col.border)
      )}>
      <header className="flex items-start justify-between mb-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[col.status])} aria-hidden="true"/>
            <span className={cn("text-xs font-semibold", col.color)}>{col.label}</span>
          </div>
          <span className="text-[9px] text-text-light leading-tight">{COL_HINTS[col.status]}</span>
        </div>
        <span
          aria-label={`${events.length} itens`}
          className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", col.bg, col.color, col.border)}>
          {events.length}
        </span>
      </header>
      <div className="flex flex-col gap-2 min-h-[80px]">
        {events.map(ev => (
          <KanbanCard key={ev.id} ev={ev} statusDot={statusDot} tipoOpts={tipoOpts} onCardClick={onCardClick}/>
        ))}
        {events.length === 0 && (
          <div className={cn(
            "flex-1 flex items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors",
            isOver ? "border-primary/40 bg-primary/5" : "border-slate-200 opacity-40"
          )}>
            <span className={cn("text-[10px]", isOver ? "text-primary" : col.color)}>
              {isOver ? "Solte aqui" : "Arraste aqui"}
            </span>
          </div>
        )}
      </div>
      {onIdeaClick && (
        <button
          type="button"
          onClick={onIdeaClick}
          aria-label="Criar nova ideia com IA nesta coluna"
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary text-[11px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30">
          <Lightbulb className="w-3 h-3"/>
          Nova Ideia com IA
        </button>
      )}
    </section>
  );
}

// ─── Persistent events hook (Supabase with localStorage fallback) ─────────────
function usePersistedEvents(slug: string) {
  const defaults = slug === "william" ? defaultEventsWilliam : defaultEventsMadruga;
  const [events, setEventsRaw] = useState<CalendarEvent[]>(defaults);
  const [supEnabled, setSupEnabled] = useState<boolean | null>(null); // null = checking

  // Load: try Supabase first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Try API (Supabase-backed)
      try {
        const res  = await fetch(`/api/calendar?slug=${slug}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.configured === false) {
          // Supabase not set up — use localStorage
          setSupEnabled(false);
          const stored = localStorage.getItem(storageKey(slug));
          setEventsRaw(stored !== null ? JSON.parse(stored) as CalendarEvent[] : defaults);
        } else if (json.events) {
          setSupEnabled(true);
          const mapped: CalendarEvent[] = (json.events as Array<Record<string,unknown>>).map(r => ({
            id:          r.id as string,
            titulo:      r.titulo as string,
            data:        r.data as string,
            tipo:        r.tipo as CalendarEvent["tipo"],
            status:      r.status as CalendarEvent["status"],
            scheduledAt: (r.scheduled_at as string | null) ?? undefined,
            legenda:     (r.legenda as string | null) ?? undefined,
            copy:        (r.copy as string | null) ?? undefined,
            prompt:      (r.prompt as string | null) ?? undefined,
            hashtags:    r.hashtags ? (r.hashtags as string).split(",").filter(Boolean) : undefined,
            creatives:   r.creatives_urls
              ? (r.creatives_urls as string).split("|").filter(Boolean).map((url: string) => ({ dataUrl: url, name: url.split("/").pop() ?? "criativo" }))
              : undefined,
            alteracoes:  (r.alteracoes as string | null) ?? undefined,
          }));
          setEventsRaw(mapped); // use Supabase data as-is, even if empty
        }
      } catch {
        if (cancelled) return;
        setSupEnabled(false);
        const stored = localStorage.getItem(storageKey(slug));
        setEventsRaw(stored !== null ? JSON.parse(stored) as CalendarEvent[] : defaults);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function setEvents(updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) {
    setEventsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Always keep localStorage in sync as a safety net
      try { localStorage.setItem(storageKey(slug), JSON.stringify(next)); } catch {}
      // If Supabase is enabled, sync changed/added events
      if (supEnabled) {
        const changed = next.filter(e => {
          const old = prev.find(p => p.id === e.id);
          return !old || JSON.stringify(old) !== JSON.stringify(e);
        });
        const deleted = prev.filter(e => !next.find(n => n.id === e.id));
        for (const ev of changed) {
          fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...ev, slug }),
          }).catch(console.error);
        }
        for (const ev of deleted) {
          fetch(`/api/calendar?id=${ev.id}`, { method: "DELETE" }).catch(console.error);
        }
      }
      return next;
    });
  }

  return [events, setEvents] as const;
}

// ─── Section header (used inside modals) ─────────────────────────────────────
function SectionHeader({ icon: Icon, title, hint }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-text-light"/>}
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-light">{title}</span>
      {hint && <span className="text-[10px] text-text-light/70 font-normal normal-case tracking-normal">— {hint}</span>}
      <div className="flex-1 h-px bg-slate-100 ml-1"/>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
        active
          ? "bg-primary text-white shadow-sm"
          : "bg-slate-50 text-text-medium hover:bg-slate-100 border border-slate-200"
      )}>
      {children}
    </button>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
      className="flex items-center gap-1 text-xs text-text-light hover:text-primary transition-colors cursor-pointer">
      {copied ? <Check className="w-3 h-3 text-success"/> : <Copy className="w-3 h-3"/>}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

// ─── Auto-post scheduler ──────────────────────────────────────────────────────
function useAutoPublisher(
  events: CalendarEvent[],
  setEvents: (u: CalendarEvent[] | ((p: CalendarEvent[]) => CalendarEvent[])) => void,
  slug: string
) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const due = events.find(ev => {
        if (ev.status !== "agendado" || !ev.scheduledAt) return false;
        // Só publica se tiver pelo menos 1 criativo anexado
        const hasCreative = !!(ev.creatives?.length || ev.creative);
        if (!hasCreative) return false;
        const scheduled = new Date(ev.scheduledAt);
        return scheduled <= now;
      });
      if (!due) return;

      setPublishing(due.id);
      try {
        // Build caption: legenda + hashtags
        const hashtagStr = due.hashtags?.length ? "\n\n" + due.hashtags.map(h=>`#${h}`).join(" ") : "";
        const caption    = (due.legenda ?? due.titulo) + hashtagStr;

        const firstCreative = due.creatives?.[0];
        if (!firstCreative) { setPublishing(null); return; }

        // Step 1 — upload criativo para URL pública (Instagram não aceita base64)
        let mediaUrl = firstCreative.dataUrl;
        if (firstCreative.dataUrl.startsWith("data:")) {
          const upRes  = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: firstCreative.dataUrl, name: firstCreative.name }),
          });
          const upData = await upRes.json();
          if (!upRes.ok || !upData.url) {
            setLastResult({ id: due.id, success: false, msg: `"${due.titulo}" — falha no upload do criativo.` });
            setPublishing(null);
            return;
          }
          mediaUrl = upData.url;
        }

        // Step 2 — publicar no Instagram com a URL pública
        const isVideo   = firstCreative.dataUrl.startsWith("data:video") || /\.(mp4|mov)$/i.test(firstCreative.name);
        const publishRes = await fetch("/api/instagram/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            caption,
            mediaType: isVideo ? "REELS" : "IMAGE",
            ...(isVideo ? { videoUrl: mediaUrl } : { imageUrl: mediaUrl }),
          }),
        });
        const data = await publishRes.json();

        if (data.success) {
          setEvents(prev => prev.map(e => e.id === due.id ? { ...e, status: "publicado" as const } : e));
          setLastResult({ id: due.id, success: true, msg: `"${due.titulo}" publicado com sucesso! 🎉` });
        } else if (data.setup_required) {
          // Tokens não configurados ainda — ignora silenciosamente
          setPublishing(null);
          return;
        } else {
          setLastResult({ id: due.id, success: false, msg: `"${due.titulo}" — ${data.error ?? "Erro desconhecido"}` });
        }
      } catch (e) {
        console.error("Auto-publish error:", e);
      } finally {
        setPublishing(null);
      }
    }, 30_000); // check every 30s

    return () => clearInterval(interval);
  }, [events, setEvents, slug]);

  return { publishing, lastResult, dismissResult: () => setLastResult(null) };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const { account } = useAccount();
  const slug = account.id === "william" ? "william" : "madruga";

  const [events, setEvents] = usePersistedEvents(slug);
  const { publishing, lastResult, dismissResult } = useAutoPublisher(events, setEvents, slug);

  // ── Generate full month ───────────────────────────────────────────────────
  const [genLoading,    setGenLoading]    = useState(false);

  // ── Export PDF to Telegram ────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfToast,   setPdfToast]   = useState("");

  async function exportPdf() {
    setPdfLoading(true); setPdfToast("");
    try {
      const res  = await fetch("/api/calendar/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao gerar PDF");
      setPdfToast(`✅ PDF enviado! ${json.count} rascunho${json.count !== 1 ? "s" : ""} no Telegram.`);
      setTimeout(() => setPdfToast(""), 5000);
    } catch (e) {
      setPdfToast(`⚠️ ${e instanceof Error ? e.message : "Erro"}`);
      setTimeout(() => setPdfToast(""), 6000);
    } finally { setPdfLoading(false); }
  }
  const [genError,      setGenError]      = useState("");
  const [genModalOpen,  setGenModalOpen]  = useState(false);
  const [genCompetitor, setGenCompetitor] = useState("");

  async function generateMonth() {
    setGenLoading(true); setGenError(""); setGenModalOpen(false);
    const now = new Date();
    try {
      // Optionally fetch competitor posts first
      let competitorPosts = null;
      if (genCompetitor.trim()) {
        
        try {
          const compRes  = await fetch("/api/competitors/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: genCompetitor.replace(/^@/, "").trim() }),
          });
          const compJson = await compRes.json();
          if (compRes.ok && compJson.posts?.length) competitorPosts = compJson.posts.slice(0, 5);
        } catch { /* ignore — proceed without competitor data */ }
        
      }

      const res  = await fetch("/api/calendar/generate-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          month: now.getMonth() + 1,
          year:  now.getFullYear(),
          competitorUsername: genCompetitor.replace(/^@/, "").trim() || null,
          competitorPosts,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao gerar");
      const reload = await fetch(`/api/calendar?slug=${slug}`);
      const reloadJson = await reload.json();
      if (reloadJson.events?.length) setEvents(reloadJson.events);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally { setGenLoading(false);  }
  }

  // Best times to post — computed from real media history
  const [bestTimes, setBestTimes] = useState<BestTime[]>(FALLBACK_TIMES);
  useEffect(() => {
    setBestTimes(FALLBACK_TIMES); // reset on account switch
    fetch(`/api/instagram/${slug}/best-times`)
      .then(r => r.json())
      .then(d => {
        if (d.bestTimes?.length) setBestTimes(d.bestTimes);
      })
      .catch(() => {/* keep fallback */});
  }, [slug]);

  // Compute the initial week start on the client only to avoid SSR timezone mismatch
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  // Re-sync weekStart after hydration to guarantee client local timezone
  useEffect(() => { setWeekStart(getMonday(new Date())); }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<CalendarEvent | null>(null);

  // ── Search / Filters ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterTipo,   setFilterTipo]   = useState<CalendarEvent["tipo"] | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CalendarEvent["status"] | "all">("all");
  const [menuOpen,     setMenuOpen]     = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filtered events used by both week grid and kanban
  const filteredEvents = events.filter(ev => {
    if (filterTipo   !== "all" && ev.tipo   !== filterTipo)   return false;
    if (filterStatus !== "all" && ev.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = [ev.titulo, ev.prompt, ev.copy, ev.legenda].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const hasActiveFilter = !!search.trim() || filterTipo !== "all" || filterStatus !== "all";

  // Keyboard shortcuts: / = search, N = new, G = generate week, Esc = close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "Escape") {
        if (menuOpen) { setMenuOpen(false); e.preventDefault(); return; }
        return;
      }
      if (isTyping) return; // don't hijack typing in inputs (except '/' which we want to capture from page level)

      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); openNew(); return; }
      if (e.key === "g" || e.key === "G") { e.preventDefault(); if (!genLoading) setGenModalOpen(true); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, genLoading]);

  // Deeplink: open event from URL (?event=ID) — used by Telegram links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (!eventId || events.length === 0 || modalOpen) return;
    const ev = events.find(e => e.id === eventId);
    if (ev) {
      setTimeout(() => {
        setSelected(ev); setTitulo(ev.titulo); setData(ev.data);
        setScheduledAt(ev.scheduledAt ?? "");
        setTipo(ev.tipo); setStatus(ev.status); setPrompt(ev.prompt ?? "");
        setAiCopy(ev.copy ?? ""); setAiLegenda(ev.legenda ?? "");
        setAiHashtags(ev.hashtags ?? []); setAiError("");
        setAiResearched(false); setAlteracoes(ev.alteracoes ?? "");
        const saved = ev.creatives ?? (ev.creative ? [{ dataUrl: ev.creative, name: ev.creativeName ?? "criativo" }] : []);
        setCreatives(saved);
        setModalOpen(true);
        // Scroll to calendar section
        document.getElementById("sec-calendar")?.scrollIntoView({ behavior: "smooth" });
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      }, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // form fields
  const [titulo, setTitulo]           = useState("");
  const [data,   setData]             = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tipo,   setTipo]             = useState<CalendarEvent["tipo"]>("reel");
  const [status, setStatus]           = useState<CalendarEvent["status"]>("agendado");
  const [prompt, setPrompt]           = useState("");

  // creatives
  const fileRef = useRef<HTMLInputElement>(null);
  const [creatives, setCreatives]       = useState<{ dataUrl: string; name: string }[]>([]);
  const [lightbox, setLightbox]         = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState(false);

  // Alterações (change requests from William)
  const [alteracoes, setAlteracoes] = useState("");
  // Drive link for Reel video (only used when tipo === "reel")
  const [driveUrl, setDriveUrl]     = useState("");

  // AI
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState("");
  const [aiCopy,       setAiCopy]       = useState("");
  const [aiLegenda,    setAiLegenda]    = useState("");
  const [aiHashtags,   setAiHashtags]   = useState<string[]>([]);
  const [aiResearched, setAiResearched] = useState(false);

  const hasAI = !!(aiCopy || aiLegenda || aiHashtags.length);

  // ── Idea modal (Rascunho column) ────────────────────────────────────────────
  const [ideaOpen,       setIdeaOpen]       = useState(false);
  const [ideaText,       setIdeaText]       = useState("");
  const [ideaVideoUrl,   setIdeaVideoUrl]   = useState("");
  const [ideaLoading,    setIdeaLoading]    = useState(false);
  const [ideaError,      setIdeaError]      = useState("");
  const [ideaResult,     setIdeaResult]     = useState<{
    titulo: string; tipo: string; prompt: string; justificativa: string;
    transcript?: string; imageDesc?: string; transcriptError?: string;
  } | null>(null);

  function openIdeaModal() {
    setIdeaText(""); setIdeaVideoUrl(""); setIdeaResult(null); setIdeaError(""); setIdeaOpen(true);
  }

  async function formatIdeia() {
    if (!ideaText.trim() && !ideaVideoUrl.trim()) return;
    setIdeaLoading(true); setIdeaError(""); setIdeaResult(null);
    try {
      const res  = await fetch("/api/ai/format-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawIdea: ideaText, videoUrl: ideaVideoUrl || undefined, slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro desconhecido");
      setIdeaResult(json);
    } catch (e: unknown) {
      setIdeaError(e instanceof Error ? e.message : "Erro ao formatar ideia");
    } finally { setIdeaLoading(false); }
  }

  function createFromIdea() {
    if (!ideaResult) return;
    setIdeaOpen(false);
    // Pre-fill the new event modal with the formatted idea
    setSelected(null);
    setTitulo(ideaResult.titulo);
    setData(todayStr);
    setScheduledAt(`${todayStr}T18:00`);
    setTipo(ideaResult.tipo as CalendarEvent["tipo"]);
    setStatus("rascunho");
    setPrompt(ideaResult.prompt);
    resetAI();
    setCreatives([]); setAlteracoes(""); setDriveUrl(""); setUploadWarning(false);
    setModalOpen(true);
  }

  const days     = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  // todayStr must be client-side to respect local timezone (Vercel server runs UTC)
  const [todayStr, setTodayStr] = useState("");
  useEffect(() => {
    const update = () => {
      const s = toStr(new Date());
      setTodayStr(s);
      // Seed form date field on first load only
      setData(prev => prev === "" ? s : prev);
    };
    update();
    // Refresh at midnight so "today" updates without page reload
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(() => { update(); }, msUntilMidnight);
    return () => clearTimeout(t);
  }, []);

  function prevWeek(){ setWeekStart(w=>{ const d=new Date(w); d.setDate(d.getDate()-7); return d; }); }
  function nextWeek(){ setWeekStart(w=>{ const d=new Date(w); d.setDate(d.getDate()+7); return d; }); }
  function goToday() { setWeekStart(getMonday(new Date())); }

  function resetAI() {
    setAiCopy(""); setAiLegenda(""); setAiHashtags([]);
    setAiError(""); setPrompt(""); setAiResearched(false);
  }

  function openNew(dateStr?: string) {
    setSelected(null); setTitulo(""); setData(dateStr ?? todayStr);
    setScheduledAt(dateStr ? `${dateStr}T18:00` : "");
    setTipo("reel"); setStatus("agendado"); resetAI();
    setCreatives([]); setAlteracoes(""); setDriveUrl(""); setUploadWarning(false);
    setModalOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setSelected(ev); setTitulo(ev.titulo); setData(ev.data);
    setScheduledAt(ev.scheduledAt ?? "");
    setTipo(ev.tipo); setStatus(ev.status); setPrompt(ev.prompt ?? "");
    setAiCopy(ev.copy ?? ""); setAiLegenda(ev.legenda ?? "");
    setAiHashtags(ev.hashtags ?? []); setAiError("");
    setAiResearched(false);
    const saved = ev.creatives ?? (ev.creative ? [{ dataUrl: ev.creative, name: ev.creativeName ?? "criativo" }] : []);
    setCreatives(saved);
    setAlteracoes(ev.alteracoes ?? ""); setDriveUrl(ev.driveUrl ?? ""); setUploadWarning(false);
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 10 - creatives.length;
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setCreatives(prev => [...prev, { dataUrl, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function generateAI() {
    if (!titulo.trim() || !prompt.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const res  = await fetch("/api/ai/generate-content", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ titulo, tipo, prompt, slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro desconhecido");
      setAiCopy(json.copy ?? ""); setAiLegenda(json.legenda ?? "");
      setAiHashtags(json.hashtags ?? []); setAiResearched(json.researchUsed ?? false);
      
    } catch(e: unknown) {
      setAiError(e instanceof Error ? e.message : "Erro ao gerar conteúdo");
    } finally { setAiLoading(false); }
  }

  /**
   * Uploads base64 creatives to storage.
   * – Videos are uploaded directly from the browser to Supabase Storage
   *   (avoids Vercel's ~4.5 MB serverless body limit).
   * – Images continue going through /api/upload (server-side service role).
   * Returns items with dataUrl replaced by https URL when successful.
   */
  async function uploadCreatives(items: { dataUrl: string; name: string }[]) {
    const result: { dataUrl: string; name: string }[] = [];
    for (const c of items) {
      if (!c.dataUrl.startsWith("data:")) {
        result.push(c); // already an https URL
        continue;
      }

      const mimeMatch = c.dataUrl.match(/^data:([^;]+);base64,/);
      const mimeType  = mimeMatch?.[1] ?? "";
      const isVideo   = mimeType.startsWith("video/");

      if (isVideo) {
        // Direct browser → Supabase Storage upload (no serverless size limit)
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!supabaseUrl || !anonKey) throw new Error("Supabase not configured");

          // createBrowserClient reads the auth session from SSR cookies automatically
          const sb = createBrowserClient(supabaseUrl, anonKey);
          const b64 = c.dataUrl.split(",")[1];
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const blob = new Blob([arr], { type: mimeType });

          const ext      = mimeType.split("/")[1]?.replace("quicktime", "mov") ?? "mov";
          const safeName = `${Date.now()}-${c.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

          const { error } = await sb.storage.from("creatives").upload(safeName, blob, {
            contentType: mimeType, upsert: false,
          });
          if (error) throw error;

          const { data: pub } = sb.storage.from("creatives").getPublicUrl(safeName);
          result.push({ dataUrl: pub.publicUrl, name: c.name });
        } catch (err) {
          console.error("Video upload error:", err);
          result.push(c); // keep base64 for in-session display
        }
      } else {
        // Images go through server-side /api/upload (service role)
        try {
          const res  = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: c.dataUrl, name: c.name }),
          });
          const json = await res.json();
          result.push({ dataUrl: json.url?.startsWith("http") ? json.url : c.dataUrl, name: c.name });
        } catch {
          result.push(c);
        }
      }
    }
    return result;
  }

  async function save() {
    if (!titulo.trim()) return;

    const evId = selected?.id ?? `c${Date.now()}`;

    // 1. Save immediately with whatever we have (base64 or URLs) — calendar updates right away
    const ev: CalendarEvent = {
      id: evId,
      titulo, data, tipo, status,
      ...(scheduledAt        && { scheduledAt }),
      ...(prompt             && { prompt }),
      ...(aiCopy             && { copy: aiCopy }),
      ...(aiLegenda          && { legenda: aiLegenda }),
      ...(aiHashtags.length  && { hashtags: aiHashtags }),
      ...(creatives.length   && { creatives }),
      ...(alteracoes         && { alteracoes }),
      ...(driveUrl           && { driveUrl }),
    };
    setEvents(prev => selected
      ? prev.map(e => e.id === selected.id ? ev : e)
      : [...prev, ev]);
    setModalOpen(false);

    // 2. Upload base64 creatives in background and update event with real URLs
    if (creatives.some(c => c.dataUrl.startsWith("data:"))) {
      const uploaded = await uploadCreatives(creatives);
      const hasBase64 = uploaded.some(c => c.dataUrl.startsWith("data:"));
      setUploadWarning(hasBase64);
      if (!hasBase64) {
        // All uploaded successfully — update event with real URLs
        setEvents(prev => prev.map(e => e.id === evId ? { ...e, creatives: uploaded } : e));
      }
    }
  }

  const [sending, setSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<"ok"|"error"|null>(null);

  async function saveAndNotifyWilliam() {
    if (!titulo.trim()) return;
    setSending(true);
    setSendResult(null);

    const eventId = selected?.id ?? `c${Date.now()}`;

    // 1. Save immediately
    const ev: CalendarEvent = {
      id: eventId,
      titulo, data, tipo, status,
      ...(scheduledAt        && { scheduledAt }),
      ...(prompt             && { prompt }),
      ...(aiCopy             && { copy: aiCopy }),
      ...(aiLegenda          && { legenda: aiLegenda }),
      ...(aiHashtags.length  && { hashtags: aiHashtags }),
      ...(creatives.length   && { creatives }),
      ...(alteracoes         && { alteracoes }),
      ...(driveUrl           && { driveUrl }),
    };
    setEvents(prev => selected
      ? prev.map(e => e.id === selected.id ? ev : e)
      : [...prev, ev]);
    setModalOpen(false);

    // 2. Upload creatives in background
    const uploadedCreatives = creatives.length ? await uploadCreatives(creatives) : creatives;
    if (uploadedCreatives.length && !uploadedCreatives.some(c => c.dataUrl.startsWith("data:"))) {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, creatives: uploadedCreatives } : e));
    }

    try {
      const res = await fetch("/api/notifications/telegram/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          titulo,
          tipo,
          slug,
          data,
          scheduledAt,
          legenda: aiLegenda,
          copy: aiCopy,
          hashtags: aiHashtags,
          // Send all creatives in selection order (filter out any remaining base64)
          creativeUrls: uploadedCreatives
            .filter(c => c.dataUrl.startsWith("http"))
            .map(c => c.dataUrl),
          ...(driveUrl && { driveUrl }),
        }),
      });
      setSendResult(res.ok ? "ok" : "error");
    } catch {
      setSendResult("error");
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 3000);
    }
  }

  function remove() {
    if (!selected) return;
    setEvents(prev => prev.filter(e => e.id !== selected.id));
    setModalOpen(false);
  }

  const startLabel = `${days[0].getDate()} ${MONTHS[days[0].getMonth()]}`;
  const endLabel   = `${days[6].getDate()} ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`;

  // (view toggle removed — calendar and kanban are always shown stacked)

  // Drag-and-drop (kanban) — via @dnd-kit/core
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDndDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function onDndDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.id as CalendarEvent["status"];
    setEvents(prev => prev.map(ev =>
      ev.id === active.id ? { ...ev, status: targetStatus } : ev
    ));
  }

  const kanbanCols: { status: CalendarEvent["status"]; label: string; color: string; bg: string; border: string }[] = [
    { status: "rascunho",  label: "Rascunho",       color: "text-slate-500",  bg: "bg-slate-100",    border: "border-slate-200" },
    { status: "roteiro",   label: "Roteiro pronto",  color: "text-warning",    bg: "bg-warning/10",   border: "border-warning/30" },
    { status: "criativo",  label: "Criativo pronto", color: "text-info",       bg: "bg-info/10",      border: "border-info/30" },
    { status: "agendado",  label: "Agendado",        color: "text-success",    bg: "bg-success/10",   border: "border-success/30" },
    { status: "publicado", label: "Publicado",       color: "text-primary",    bg: "bg-primary/10",   border: "border-primary/30" },
  ];

  return (
    <>
      <Card delay={0.6}>
        {/* ── Unified Toolbar ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Top row: title + primary actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-lg font-semibold text-text-dark">Calendário de Conteúdo</h3>
              <p className="text-xs text-text-light mt-0.5">{startLabel} – {endLabel}</p>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" aria-hidden="true"/>
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conteúdo..."
                aria-label="Buscar conteúdo no calendário"
                aria-keyshortcuts="/"
                className="w-full h-9 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <XIcon className="w-3.5 h-3.5"/>
                </button>
              ) : (
                <kbd className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-5 px-1.5 items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-400" aria-hidden="true">/</kbd>
              )}
            </div>

            {/* Date nav */}
            <div className="flex items-center gap-1">
              <button type="button" onClick={goToday} aria-label="Ir para hoje"
                className="px-2.5 h-9 rounded-xl text-xs font-medium border border-slate-200 text-text-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-colors">
                Hoje
              </button>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={prevWeek} aria-label="Semana anterior"
                  className="px-2 h-9 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-colors">
                  <ChevronLeft className="w-4 h-4 text-text-medium"/>
                </button>
                <button type="button" onClick={nextWeek} aria-label="Próxima semana"
                  className="px-2 h-9 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-colors border-l border-slate-200">
                  <ChevronRight className="w-4 h-4 text-text-medium"/>
                </button>
              </div>
            </div>

            {/* Primary action */}
            <button type="button" onClick={() => openNew()} aria-keyshortcuts="n"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium gradient-primary text-white cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 transition-opacity">
              <Plus className="w-4 h-4"/> Adicionar
            </button>

            {/* Overflow menu */}
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen(o => !o)}
                aria-label="Mais ações" aria-haspopup="menu" aria-expanded={menuOpen}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-text-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer">
                <MoreHorizontal className="w-4 h-4"/>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true"/>
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl z-40 py-1.5 overflow-hidden">
                      <button type="button" role="menuitem"
                        onClick={() => { setMenuOpen(false); setGenModalOpen(true); }}
                        disabled={genLoading}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-dark hover:bg-primary/5 disabled:opacity-50 transition-colors cursor-pointer text-left">
                        {genLoading
                          ? <Loader2 className="w-4 h-4 text-primary animate-spin"/>
                          : <Sparkles className="w-4 h-4 text-primary"/>}
                        <span className="flex-1">{genLoading ? "Gerando..." : "Gerar Semana com IA"}</span>
                        <kbd className="text-[10px] font-mono text-slate-400">G</kbd>
                      </button>
                      <button type="button" role="menuitem"
                        onClick={() => { setMenuOpen(false); openIdeaModal(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-dark hover:bg-primary/5 transition-colors cursor-pointer text-left">
                        <Lightbulb className="w-4 h-4 text-warning"/>
                        <span className="flex-1">Nova Ideia com IA</span>
                      </button>
                      <div className="h-px bg-slate-100 my-1"/>
                      <button type="button" role="menuitem"
                        onClick={() => { setMenuOpen(false); exportPdf(); }}
                        disabled={pdfLoading}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-dark hover:bg-primary/5 disabled:opacity-50 transition-colors cursor-pointer text-left">
                        {pdfLoading
                          ? <Loader2 className="w-4 h-4 text-info animate-spin"/>
                          : <FileDown className="w-4 h-4 text-info"/>}
                        <span className="flex-1">{pdfLoading ? "Enviando..." : "Enviar Rascunhos pro Telegram"}</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros de calendário">
            <span className="text-[10px] uppercase tracking-wider text-text-light font-semibold mr-1">Filtros</span>
            <FilterChip active={filterTipo === "all"} onClick={() => setFilterTipo("all")}>Todos tipos</FilterChip>
            {tipoOpts.map(o => (
              <FilterChip key={o.value} active={filterTipo === o.value} onClick={() => setFilterTipo(o.value)}>
                {o.label}
              </FilterChip>
            ))}
            <span className="mx-1 w-px h-4 bg-slate-200" aria-hidden="true"/>
            <FilterChip active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>Todos status</FilterChip>
            {statusOpts.map(o => (
              <FilterChip key={o.value} active={filterStatus === o.value} onClick={() => setFilterStatus(o.value)}>
                {o.label}
              </FilterChip>
            ))}
            {hasActiveFilter && (
              <button type="button"
                onClick={() => { setSearch(""); setFilterTipo("all"); setFilterStatus("all"); }}
                className="ml-1 flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer">
                <XIcon className="w-3 h-3"/> Limpar
              </button>
            )}
            {hasActiveFilter && (
              <span className="ml-auto text-[11px] text-text-light" aria-live="polite">
                {filteredEvents.length} de {events.length} conteúdos
              </span>
            )}
          </div>
        </div>

        {/* Generate month error */}
        {genError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs mb-3">
            <span>⚠️ {genError}</span>
            <button type="button" onClick={() => setGenError("")} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}
        {pdfToast && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-3 border",
            pdfToast.startsWith("✅")
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          )}>
            <span className="flex-1">{pdfToast}</span>
            <button type="button" onClick={() => setPdfToast("")} className="opacity-50 hover:opacity-100">×</button>
          </div>
        )}

        {/* Generate month modal */}
        <AnimatePresence>
          {genModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => setGenModalOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
              >
                <div>
                  <h3 className="font-bold text-text-dark text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Gerar Semana com IA
                  </h3>
                  <p className="text-xs text-text-light mt-1">
                    4 conteúdos para a semana — 1 reel, 1 carrossel, 2 posts de feed
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-dark">
                    @ do concorrente <span className="text-text-light font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium select-none">@</span>
                    <input
                      type="text"
                      value={genCompetitor}
                      onChange={e => setGenCompetitor(e.target.value)}
                      placeholder="perfil_do_concorrente"
                      className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-text-light">
                    Se informado, o Claude vai analisar os top posts desse perfil e gerar conteúdos inspirados neles, adaptados à sua voz.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setGenModalOpen(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="button" onClick={generateMonth}
                    className="flex-1 py-2.5 rounded-2xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Gerar agora
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Auto-publish toast */}
        <AnimatePresence>
          {lastResult && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 border text-sm",
                lastResult.success
                  ? "bg-success/8 border-success/20 text-success"
                  : "bg-warning/8 border-warning/20 text-warning")}>
              {lastResult.success
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0"/>
                : <AlertCircle  className="w-4 h-4 flex-shrink-0"/>}
              <span className="flex-1 text-xs">{lastResult.msg}</span>
              <button type="button" onClick={dismissResult} className="cursor-pointer hover:opacity-60 transition-opacity">
                <XIcon className="w-3.5 h-3.5"/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No-results banner */}
        {hasActiveFilter && filteredEvents.length === 0 && (
          <div className="mb-3 px-4 py-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center" role="status" aria-live="polite">
            <p className="text-xs text-text-medium">Nenhum conteúdo bate com os filtros atuais.</p>
            <button type="button"
              onClick={() => { setSearch(""); setFilterTipo("all"); setFilterStatus("all"); }}
              className="mt-1 text-[11px] text-primary hover:underline cursor-pointer">
              Limpar filtros
            </button>
          </div>
        )}

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr   = toStr(day);
            const dayEvents = filteredEvents.filter(e => e.data === dateStr);
            const isToday   = dateStr === todayStr;
            return (
              <div key={dateStr} className="flex flex-col gap-1.5">
                <div className={cn("flex flex-col items-center py-2 rounded-xl", isToday?"gradient-primary":"bg-slate-50")}>
                  <span className={cn("text-xs", isToday?"text-white/80":"text-text-light")}>{DAYS[day.getDay()]}</span>
                  <span className={cn("text-sm font-bold", isToday?"text-white":"text-text-dark")}>{day.getDate()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.map(ev => {
                    const isPublishing = publishing === ev.id;
                    return (
                      <motion.button key={ev.id} type="button" onClick={()=>openEdit(ev)}
                        whileHover={{scale:1.03}}
                        className={cn("p-2 rounded-xl border text-[10px] font-medium cursor-pointer text-left w-full relative overflow-hidden",
                          ev.alteracoes ? "bg-red-500/15 text-red-700 border-red-400/40" : typeColors[ev.tipo])}>
                        {isPublishing && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 animate-spin text-primary"/>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusDot[ev.status])}/>
                          <span>{tipoOpts.find(t=>t.value===ev.tipo)?.label}</span>
                          {ev.copy && <Sparkles className="w-2.5 h-2.5 ml-auto opacity-60"/>}
                          {(ev.creatives?.length || ev.creative)
                            ? <ImageIcon className="w-2.5 h-2.5 opacity-60"/>
                            : ev.status === "agendado" && ev.scheduledAt
                              ? <AlertCircle className="w-2.5 h-2.5 text-warning ml-auto"/>
                              : null}
                          {ev.scheduledAt && ev.status === "agendado" && (ev.creatives?.length || ev.creative) && <Clock className="w-2.5 h-2.5 opacity-70 text-success"/>}
                        </div>
                        {ev.alteracoes && (
                          <p className="text-[9px] font-semibold text-red-600 mb-0.5">⚠️ Alterações pendentes</p>
                        )}
                        <p className="line-clamp-2 leading-tight">{ev.titulo}</p>
                        {ev.scheduledAt && (
                          <p className="mt-0.5 opacity-60">{ev.scheduledAt.split("T")[1]}</p>
                        )}
                      </motion.button>
                    );
                  })}
                  <button type="button" onClick={()=>openNew(dateStr)}
                    className="h-8 rounded-xl border border-dashed border-slate-200 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <span className="text-[10px] text-slate-300 group-hover:text-primary transition-colors">+</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-50">
          {Object.entries(typeColors).map(([t,cls])=>(
            <div key={t} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-md border",cls)}/>
              <span className="text-xs text-text-light">{tipoOpts.find(o=>o.value===t)?.label}</span>
            </div>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
            {Object.entries(statusDot).map(([s,cls])=>(
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full",cls)}/>
                <span className="text-xs text-text-light">{statusOpts.find(o=>o.value===s)?.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-success"/>
              <span className="text-xs text-text-light">Auto-post</span>
            </div>
          </div>
        </div>

        {/* ── Kanban section ─────────────────────────────────────────────── */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Kanban className="w-4 h-4 text-primary"/>
            <h4 className="text-sm font-semibold text-text-dark">Kanban</h4>
            <span className="text-xs text-text-light">— arraste os cards para mudar o status</span>
          </div>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCorners}
            onDragStart={onDndDragStart}
            onDragEnd={onDndDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {kanbanCols.map(col => (
                <KanbanColumn
                  key={col.status}
                  col={col}
                  events={filteredEvents.filter(e => e.status === col.status)}
                  statusDot={statusDot}
                  tipoOpts={tipoOpts}
                  onCardClick={openEdit}
                  onIdeaClick={col.status === "rascunho" ? openIdeaModal : undefined}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeDragId ? (
                <KanbanCardGhost ev={events.find(e => e.id === activeDragId)!} statusDot={statusDot} tipoOpts={tipoOpts}/>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </Card>

      {/* ─── Idea Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={ideaOpen}
        onClose={() => setIdeaOpen(false)}
        title="Nova Ideia com IA"
        description="Descreva sua ideia bruta (ou cole uma URL) e a IA estrutura um briefing pronto para virar rascunho.">
        <div className="flex flex-col gap-4">

          {/* Ideia bruta */}
          <div>
            <label className="text-xs font-medium text-text-medium block mb-1.5">Ideia bruta</label>
            <textarea
              value={ideaText}
              onChange={e => setIdeaText(e.target.value)}
              placeholder="Ex: falar sobre a nova tributação de dividendos que vai mudar tudo pra empresa..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"/>
          </div>

          {/* URL do vídeo */}
          <div>
            <label className="text-xs font-medium text-text-medium block mb-1.5">
              URL do conteúdo <span className="text-slate-400 font-normal">(YouTube, Instagram, qualquer link — IA lê e analisa)</span>
            </label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-light flex-shrink-0"/>
              <input
                value={ideaVideoUrl}
                onChange={e => setIdeaVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
            </div>
          </div>

          {/* Error */}
          {ideaError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{ideaError}</p>
          )}

          {/* Result */}
          {ideaResult && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
              {ideaResult.transcriptError && (
                <p className="text-[11px] text-warning bg-warning/10 rounded-lg px-2.5 py-1.5">
                  ⚠️ Transcrição: {ideaResult.transcriptError}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-primary">{ideaResult.titulo}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium border", typeColors[ideaResult.tipo] ?? "bg-slate-100 text-slate-500 border-slate-200")}>
                  {tipoOpts.find(t => t.value === ideaResult.tipo)?.label ?? ideaResult.tipo}
                </span>
              </div>
              <p className="text-xs text-text-medium leading-relaxed line-clamp-4">{ideaResult.prompt}</p>
              {ideaResult.justificativa && (
                <p className="text-[11px] text-text-light italic">{ideaResult.justificativa}</p>
              )}
              {ideaResult.transcript && (
                <details className="cursor-pointer">
                  <summary className="text-[11px] text-text-light hover:text-text-medium transition-colors">Ver texto extraído do link</summary>
                  <p className="mt-1.5 text-[10px] text-text-light leading-relaxed max-h-28 overflow-y-auto">{ideaResult.transcript}</p>
                </details>
              )}
              {ideaResult.imageDesc && (
                <details className="cursor-pointer">
                  <summary className="text-[11px] text-text-light hover:text-text-medium transition-colors">Ver análise visual da imagem</summary>
                  <p className="mt-1.5 text-[10px] text-text-light leading-relaxed max-h-28 overflow-y-auto">{ideaResult.imageDesc}</p>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={formatIdeia}
              disabled={ideaLoading || (!ideaText.trim() && !ideaVideoUrl.trim())}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {ideaLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Formatando...</>
                : <><Sparkles className="w-3.5 h-3.5"/> Formatar com IA</>}
            </button>
            {ideaResult && (
              <button
                type="button"
                onClick={createFromIdea}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-primary text-primary cursor-pointer hover:bg-primary/5 transition-colors">
                <FileText className="w-3.5 h-3.5"/>
                Criar Rascunho
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)}
        size="lg"
        title={selected?"Editar Conteúdo":"Novo Conteúdo"}
        description={selected
          ? `Edite roteiro, criativos e agendamento — ${selected.titulo}`
          : "Preencha os detalhes do conteúdo. Use a IA para acelerar."}>
        <div className="flex flex-col gap-5 pb-2">

          {/* Alterações — change requests from William (HIGH PRIORITY, top of modal) */}
          {alteracoes && (
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              role="alert"
              className="border border-red-300/60 rounded-2xl overflow-hidden bg-red-50/60">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border-b border-red-200/60">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0"/>
                <span className="text-xs font-semibold text-red-700">Alterações solicitadas por William</span>
                <button type="button" onClick={() => setAlteracoes("")}
                  aria-label="Marcar alterações como resolvidas"
                  className="ml-auto text-red-400 hover:text-red-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/40 rounded">
                  <XIcon className="w-3.5 h-3.5"/>
                </button>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs text-red-700 leading-relaxed whitespace-pre-wrap">{alteracoes}</p>
              </div>
            </motion.div>
          )}

          {/* ── Identidade ───────────────────────────────────────────── */}
          <SectionHeader title="Identidade"/>
          <div className="flex flex-col gap-3 -mt-1">
            <div>
              <label htmlFor="ev-titulo" className="text-xs font-medium text-text-medium block mb-1.5">
                Título <span className="text-danger">*</span>
              </label>
              <input
                id="ev-titulo"
                value={titulo}
                onChange={e=>setTitulo(e.target.value)}
                placeholder="Ex: 5 erros na declaração do IR"
                aria-required="true"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"/>
            </div>

            {/* Tipo as chip selector (replaces dropdown) */}
            <div>
              <label className="text-xs font-medium text-text-medium block mb-1.5">Tipo de conteúdo</label>
              <div role="radiogroup" aria-label="Tipo de conteúdo" className="grid grid-cols-4 gap-1.5">
                {tipoOpts.map(t => {
                  const isActive = tipo === t.value;
                  return (
                    <button key={t.value} type="button" role="radio" aria-checked={isActive}
                      onClick={() => setTipo(t.value)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
                        isActive
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-slate-200 text-text-medium hover:bg-slate-50"
                      )}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Quando ─────────────────────────────────────────────── */}
          <SectionHeader icon={Clock} title="Quando" hint="data e horário de publicação"/>
          <div className="flex flex-col gap-3 -mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ev-data" className="text-xs font-medium text-text-medium block mb-1.5">Data</label>
                <input id="ev-data" type="date" value={data}
                  onChange={e => {
                    setData(e.target.value);
                    if (!scheduledAt) setScheduledAt(`${e.target.value}T18:00`);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"/>
              </div>
              <div>
                <label htmlFor="ev-time" className="text-xs font-medium text-text-medium block mb-1.5">Horário</label>
                <input id="ev-time" type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"/>
              </div>
            </div>

            {/* Best-time chips — simplified */}
            <div>
              <p className="text-[10px] text-text-light mb-1.5">Sugestões de horário (do seu histórico real)</p>
              <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Horários sugeridos">
                {bestTimes.map(t => {
                  const isActive = scheduledAt.endsWith(t.value);
                  return (
                    <button key={t.value} type="button"
                      onClick={() => setScheduledAt(`${data || todayStr}T${t.value}`)}
                      aria-pressed={isActive}
                      title={t.tip}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
                        isActive
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-slate-200 text-text-medium hover:border-primary/30 hover:bg-primary/5"
                      )}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-text-light flex items-center gap-1">
              <Send className="w-3 h-3"/>
              Quando status for &quot;Agendado&quot; e o horário chegar, o post será publicado automaticamente.
            </p>
          </div>

          {/* ── Conteúdo (IA) ──────────────────────────────────────── */}
          <SectionHeader icon={Sparkles} title="Conteúdo" hint="ideia ou roteiro gerado pela IA"/>
          <div className="flex flex-col gap-3 -mt-1">
            <div>
              <label htmlFor="ev-prompt" className="text-xs font-medium text-text-medium block mb-1.5">
                {prompt && selected?.status === "rascunho" ? "Ideia original" : "Prompt para IA"}
              </label>
              <textarea
                id="ev-prompt"
                value={prompt}
                onChange={e=>setPrompt(e.target.value)}
                placeholder="Descreva: tema, tom, público-alvo, referências..."
                rows={prompt && selected?.status === "rascunho" ? 4 : 3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none placeholder:text-slate-300"/>
            </div>

            {prompt.trim() && titulo.trim() && (
              <motion.button type="button" onClick={generateAI} disabled={aiLoading}
                initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
                className="w-full py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/40">
                {aiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin"/>Gerando conteúdo...</>
                  : <><Sparkles className="w-4 h-4"/>{hasAI?"Regenerar com IA":"Gerar com IA"}</>}
              </motion.button>
            )}

            {aiError && (
              <p role="alert" className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-xl px-3 py-2">{aiError}</p>
            )}

            {hasAI && (
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                className="flex flex-col gap-4">
                {aiResearched && (
                  <p className="text-[10px] text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3"/> Pesquisa web realizada — dados atuais incorporados
                  </p>
                )}

                {aiCopy && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="ev-copy" className="text-xs font-semibold text-text-dark">Roteiro / Copy</label>
                      <CopyBtn text={aiCopy}/>
                    </div>
                    <textarea id="ev-copy" value={aiCopy} onChange={e=>setAiCopy(e.target.value)}
                      rows={10}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-text-dark leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/20 resize-y bg-white font-mono"/>
                  </div>
                )}

                {aiLegenda && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="ev-legenda" className="text-xs font-semibold text-text-dark">Legenda Instagram</label>
                      <CopyBtn text={aiLegenda}/>
                    </div>
                    <textarea id="ev-legenda" value={aiLegenda} onChange={e=>setAiLegenda(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-text-dark leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/20 resize-y bg-white"/>
                  </div>
                )}

                {aiHashtags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-dark">Hashtags ({aiHashtags.length})</span>
                      <CopyBtn text={aiHashtags.map(h=>`#${h}`).join(" ")}/>
                    </div>
                    <p className="text-xs text-primary leading-relaxed break-words">
                      {aiHashtags.map(h=>`#${h}`).join("  ")}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* ── Status ─────────────────────────────────────────────── */}
          <SectionHeader title="Status" hint="onde está no fluxo de produção"/>
          <div className="-mt-1">
            <div role="radiogroup" aria-label="Status do conteúdo" className="grid grid-cols-5 gap-1">
              {statusOpts.map(s => {
                const isActive = status === s.value;
                return (
                  <button key={s.value} type="button" role="radio" aria-checked={isActive}
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2 rounded-xl border text-[10px] font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
                      isActive
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-slate-200 text-text-light hover:bg-slate-50"
                    )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[s.value])} aria-hidden="true"/>
                    <span className="leading-tight text-center">{s.label}</span>
                  </button>
                );
              })}
            </div>
            {status === "agendado" && scheduledAt && (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-xl bg-success/8 border border-success/20" role="status">
                <Send className="w-3 h-3 text-success flex-shrink-0"/>
                <span className="text-[10px] text-success">
                  Será publicado automaticamente em {new Date(scheduledAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                </span>
              </div>
            )}
          </div>

          {/* ── Criativos ──────────────────────────────────────────── */}
          <SectionHeader icon={ImageIcon} title={`Criativos (${creatives.length}/10)`} hint="imagens e vídeos"/>
          <div className="-mt-1">

            {creatives.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {creatives.map((c, i) => {
                  const isVid = c.dataUrl.startsWith("data:video") || /\.(mp4|mov|webm|quicktime)$/i.test(c.name) || /\.(mp4|mov|webm)$/i.test(c.dataUrl);
                  const isImg = !isVid && (c.dataUrl.startsWith("data:image") || c.dataUrl.startsWith("http"));
                  return (
                  <div key={i} className="relative group/thumb" style={{ paddingBottom: "56.25%" }}>
                    <div className="absolute inset-0 rounded-xl overflow-hidden border border-slate-200 bg-black">
                      {isVid ? (
                        <video src={c.dataUrl} controls={false} muted loop playsInline
                          className="w-full h-full object-contain cursor-pointer"
                          onClick={() => setLightbox(c.dataUrl)}/>
                      ) : isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.dataUrl} alt={c.name}
                          className="w-full h-full object-contain cursor-zoom-in"
                          onClick={() => setLightbox(c.dataUrl)}/>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-900">
                          <ImageIcon className="w-6 h-6 text-slate-500"/>
                          <span className="text-[9px] text-slate-400 px-1 text-center leading-tight">{c.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/30 transition-colors flex items-center justify-center gap-1.5">
                        {(isImg || isVid) && (
                          <button type="button" onClick={() => setLightbox(c.dataUrl)}
                            className="opacity-0 group-hover/thumb:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center cursor-pointer shadow text-text-dark hover:bg-white"
                            title="Ver em tela cheia">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                            </svg>
                          </button>
                        )}
                        <button type="button"
                          onClick={() => setCreatives(prev => prev.filter((_, j) => j !== i))}
                          className="opacity-0 group-hover/thumb:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center cursor-pointer shadow hover:bg-white"
                          title="Remover">
                          <XIcon className="w-3.5 h-3.5 text-danger"/>
                        </button>
                      </div>
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">{i+1}</span>
                      </div>
                    </div>
                  </div>
                  );
                })}
                {creatives.length < 10 && (
                  <div className="relative" style={{ paddingBottom: "56.25%" }}>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/3 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group/add">
                      <Upload className="w-5 h-5 text-slate-300 group-hover/add:text-primary transition-colors"/>
                      <span className="text-[10px] text-slate-300 group-hover/add:text-primary transition-colors">Adicionar</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {creatives.length === 0 && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/3 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group/empty"
                style={{ paddingBlock: "1.5rem" }}>
                <Upload className="w-7 h-7 text-slate-300 group-hover/empty:text-primary transition-colors"/>
                <span className="text-xs text-slate-400 group-hover/empty:text-primary transition-colors font-medium">
                  Subir criativos (até 10)
                </span>
                <span className="text-[10px] text-slate-300">JPG · PNG · MP4 · MOV · 16:9 recomendado</span>
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange}/>
            {uploadWarning && (
              <p className="text-[10px] text-warning bg-warning/8 border border-warning/20 rounded-xl px-3 py-2 mt-1">
                ⚠️ Upload falhou — criativo visível só nesta sessão. Verifique o bucket &quot;creatives&quot; no Supabase.
              </p>
            )}
          </div>

          {/* ── Link do Drive (apenas Reels) ───────────────────────── */}
          {tipo === "reel" && (
            <>
              <SectionHeader icon={Globe} title="Vídeo do Reel" hint="link do Drive"/>
              <div className="-mt-1">
                <label htmlFor="ev-drive" className="sr-only">Link do Drive</label>
                <input
                  id="ev-drive"
                  type="url"
                  value={driveUrl}
                  onChange={e => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full h-10 px-3 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-slate-300"
                />
              </div>
            </>
          )}

          {/* ── Sticky Action Footer ───────────────────────────────── */}
          <div className="sticky bottom-0 -mx-1 px-1 pt-4 pb-1 bg-gradient-to-t from-white via-white to-white/95 border-t border-slate-100 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              {selected && (
                <button type="button" onClick={remove}
                  aria-label="Excluir conteúdo"
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-danger/30">
                  Excluir
                </button>
              )}

              <button type="button" onClick={() => setModalOpen(false)}
                className="ml-auto px-4 py-2.5 rounded-xl text-sm font-medium text-text-medium hover:bg-slate-50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300">
                Cancelar
              </button>

              <button type="button" onClick={saveAndNotifyWilliam} disabled={!titulo.trim() || sending}
                aria-label="Salvar e enviar para William revisar no Telegram"
                className={cn(
                  "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed",
                  sendResult === "ok"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : sendResult === "error"
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                )}>
                {sending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Enviando…</>
                  : sendResult === "ok"
                    ? <><CheckCircle2 className="w-3.5 h-3.5"/>Enviado!</>
                    : sendResult === "error"
                      ? <><AlertCircle className="w-3.5 h-3.5"/>Erro</>
                      : <><Send className="w-3.5 h-3.5"/>Enviar pro William</>}
              </button>

              <button type="button" onClick={save} disabled={!titulo.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40">
                {selected ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setLightbox(null)}>
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="relative max-w-5xl w-full"
              onClick={e => e.stopPropagation()}>
              {lightbox && (/\.(mp4|mov|webm)$/i.test(lightbox) || lightbox.startsWith("data:video")) ? (
                <video src={lightbox} controls autoPlay loop playsInline
                  className="w-full rounded-2xl max-h-[85vh]"/>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox!} alt="criativo" className="w-full rounded-2xl object-contain max-h-[85vh]"/>
              )}
              <button type="button" onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors">
                <XIcon className="w-5 h-5 text-white"/>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
