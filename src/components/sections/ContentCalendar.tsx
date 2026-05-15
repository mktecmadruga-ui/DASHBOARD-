"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useAccount } from "@/context/AccountContext";
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  Copy, Check, Hash, AlignLeft, FileText, Globe,
  Upload, X as XIcon, Image as ImageIcon, Clock, Send,
  CheckCircle2, AlertCircle, Kanban,
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

type AITab = "copy"|"legenda"|"hashtags";

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

function KanbanColumn({ col, events, statusDot, tipoOpts, onCardClick, onIdeaClick, onExportPdf, pdfLoading }: {
  col: KanbanCol;
  events: CalendarEvent[];
  statusDot: Record<string, string>;
  tipoOpts: { value: string; label: string }[];
  onCardClick: (ev: CalendarEvent) => void;
  onIdeaClick?: () => void;
  onExportPdf?: () => void;
  pdfLoading?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 min-w-[180px] flex-1 min-h-[320px] rounded-2xl border-2 p-3 transition-all duration-150",
        isOver ? "border-primary/60 bg-primary/5 scale-[1.01]" : cn(col.bg, col.border)
      )}>
      <div className="flex items-center justify-between mb-1">
        <span className={cn("text-xs font-semibold", col.color)}>{col.label}</span>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", col.bg, col.color, col.border)}>
          {events.length}
        </span>
      </div>
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
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary text-[11px] font-medium transition-all cursor-pointer">
          <Sparkles className="w-3 h-3"/>
          💡 Nova Ideia com IA
        </button>
      )}
      {onExportPdf && events.length > 0 && (
        <button
          type="button"
          onClick={onExportPdf}
          disabled={pdfLoading}
          className="mt-1 w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50">
          {pdfLoading
            ? <><Loader2 className="w-3 h-3 animate-spin"/>Enviando PDF...</>
            : <><Send className="w-3 h-3"/>📄 Enviar PDF pro Telegram</>}
        </button>
      )}
    </div>
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
  const [genDone,       setGenDone]       = useState(false);
  const [genError,      setGenError]      = useState("");
  const [genModalOpen,  setGenModalOpen]  = useState(false);
  const [genCompetitor, setGenCompetitor] = useState("");
  const [genCompLoading,setGenCompLoading]= useState(false);

  async function generateMonth() {
    setGenLoading(true); setGenError(""); setGenDone(false); setGenModalOpen(false);
    const now = new Date();
    try {
      // Optionally fetch competitor posts first
      let competitorPosts = null;
      if (genCompetitor.trim()) {
        setGenCompLoading(true);
        try {
          const compRes  = await fetch("/api/competitors/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: genCompetitor.replace(/^@/, "").trim() }),
          });
          const compJson = await compRes.json();
          if (compRes.ok && compJson.posts?.length) competitorPosts = compJson.posts.slice(0, 5);
        } catch { /* ignore — proceed without competitor data */ }
        setGenCompLoading(false);
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
      setGenDone(true);
      setTimeout(() => setGenDone(false), 4000);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally { setGenLoading(false); setGenCompLoading(false); }
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
        setAiHashtags(ev.hashtags ?? []); setAiError(""); setActiveTab("copy");
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
  const [activeTab,    setActiveTab]    = useState<AITab>("copy");

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
    setAiHashtags(ev.hashtags ?? []); setAiError(""); setActiveTab("copy");
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
      setActiveTab("copy");
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">Calendário de Conteúdo</h3>
            <p className="text-sm text-text-light mt-0.5">{startLabel} – {endLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToday}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200 text-text-medium hover:bg-slate-50 cursor-pointer transition-colors">
              Hoje
            </button>
            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              <button type="button" onClick={prevWeek} className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors">
                <ChevronLeft className="w-4 h-4 text-text-medium"/>
              </button>
              <button type="button" onClick={nextWeek} className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors border-l border-slate-200">
                <ChevronRight className="w-4 h-4 text-text-medium"/>
              </button>
            </div>
            <button type="button" onClick={()=>openNew()}
              className="px-3 py-1.5 rounded-xl text-sm font-medium gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity">
              + Adicionar
            </button>
            <button
              type="button"
              onClick={() => genLoading ? null : setGenModalOpen(true)}
              disabled={genLoading}
              title="Gerar planejamento da semana com IA"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {genLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{genCompLoading ? "Buscando concorrente..." : "Gerando..."}</>
                : genDone
                  ? <><Sparkles className="w-3.5 h-3.5" />Gerado!</>
                  : <><Sparkles className="w-3.5 h-3.5" />Gerar Semana</>}
            </button>
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

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr   = toStr(day);
            const dayEvents = events.filter(e => e.data === dateStr);
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
                  events={events.filter(e => e.status === col.status)}
                  statusDot={statusDot}
                  tipoOpts={tipoOpts}
                  onCardClick={openEdit}
                  onIdeaClick={col.status === "rascunho" ? openIdeaModal : undefined}
                  onExportPdf={col.status === "rascunho" ? exportPdf : undefined}
                  pdfLoading={col.status === "rascunho" ? pdfLoading : undefined}
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
      <Modal open={ideaOpen} onClose={() => setIdeaOpen(false)} title="💡 Nova Ideia com IA">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-light leading-relaxed">
            Descreva sua ideia bruta (ou cole uma URL do YouTube) e a IA vai estruturar um briefing completo no estilo do William para usar como prompt na geração de conteúdo.
          </p>

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
        title={selected?"Editar Conteúdo":"Novo Conteúdo"}>
        <div className="flex flex-col gap-4">

          {/* Título */}
          <div>
            <label className="text-xs font-medium text-text-medium block mb-1.5">Título</label>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)}
              placeholder="Ex: 5 erros na declaração do IR"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
          </div>

          {/* Data + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-medium block mb-1.5">Data</label>
              <input type="date" value={data} onChange={e=>{
                setData(e.target.value);
                if (!scheduledAt) setScheduledAt(`${e.target.value}T18:00`);
              }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
            </div>
            <div>
              <label className="text-xs font-medium text-text-medium block mb-1.5">Tipo</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value as CalendarEvent["tipo"])}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all bg-white cursor-pointer">
                {tipoOpts.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Horário + Suggested times */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-light"/>
                Horário de publicação
              </label>
              <span className="text-[10px] text-text-light">Melhores horários (histórico real) →</span>
            </div>
            {/* Best-time chips — computed from real media engagement */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {bestTimes.map(t => {
                const isActive = scheduledAt.endsWith(t.value);
                return (
                  <button key={t.value} type="button"
                    onClick={() => setScheduledAt(`${data || todayStr}T${t.value}`)}
                    className={cn("flex flex-col items-center px-2.5 py-1.5 rounded-xl border text-[10px] font-medium transition-all cursor-pointer",
                      isActive
                        ? "gradient-primary text-white border-transparent shadow-sm"
                        : "border-slate-200 text-text-medium hover:border-primary/30 hover:bg-primary/5")}>
                    <span className="font-bold">{t.label}</span>
                    <span className={cn("leading-tight", isActive ? "text-white/70" : "text-text-light")}>
                      {t.tip}
                    </span>
                  </button>
                );
              })}
            </div>
            <input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"/>
            <p className="text-[10px] text-text-light mt-1 flex items-center gap-1">
              <Send className="w-3 h-3"/>
              Quando status for &quot;Agendado&quot; e o horário chegar, o post será publicado automaticamente.
            </p>
          </div>

          {/* Prompt / Ideia original */}
          <div>
            <label className="text-xs font-medium text-text-medium block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary"/>
              {prompt && selected?.status === "rascunho" ? "💡 Ideia original" : "Prompt para IA"}
            </label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
              placeholder="Descreva: tema, tom, público-alvo, referências..."
              rows={prompt && selected?.status === "rascunho" ? 4 : 3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none placeholder:text-slate-300"/>
          </div>

          {/* Gerar IA */}
          {prompt.trim() && titulo.trim() && (
            <motion.button type="button" onClick={generateAI} disabled={aiLoading}
              initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
              className="w-full py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin"/>Gerando conteúdo...</>
                : <><Sparkles className="w-4 h-4"/>{hasAI?"Regenerar com IA":"Gerar com IA"}</>}
            </motion.button>
          )}

          {aiError && (
            <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-xl px-3 py-2">{aiError}</p>
          )}

          {/* Resultado IA */}
          {hasAI && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="border border-primary/20 rounded-2xl overflow-hidden bg-primary/3">
              {aiResearched && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-success/8 border-b border-success/15">
                  <Globe className="w-3 h-3 text-success flex-shrink-0"/>
                  <span className="text-[10px] text-success font-medium">Pesquisa web realizada — dados atuais incorporados</span>
                </div>
              )}
              <div className="flex border-b border-primary/15">
                {([
                  {id:"copy"     as AITab, label:"Roteiro",  icon:FileText },
                  {id:"legenda"  as AITab, label:"Legenda",  icon:AlignLeft},
                  {id:"hashtags" as AITab, label:"Hashtags", icon:Hash     },
                ] as const).map(tab=>{
                  const Icon=tab.icon;
                  return (
                    <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                        activeTab===tab.id?"bg-primary/10 text-primary border-b-2 border-primary":"text-text-light hover:text-text-medium")}>
                      <Icon className="w-3 h-3"/>{tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="p-3">
                {activeTab==="copy" && (
                  <div>
                    <div className="flex justify-end mb-2"><CopyBtn text={aiCopy}/></div>
                    <textarea value={aiCopy} onChange={e=>setAiCopy(e.target.value)} rows={8}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-text-dark leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-white"/>
                  </div>
                )}
                {activeTab==="legenda" && (
                  <div>
                    <div className="flex justify-end mb-2"><CopyBtn text={aiLegenda}/></div>
                    <textarea value={aiLegenda} onChange={e=>setAiLegenda(e.target.value)} rows={6}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-text-dark leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-white"/>
                  </div>
                )}
                {activeTab==="hashtags" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-text-light">{aiHashtags.length} hashtags</span>
                      <CopyBtn text={aiHashtags.map(h=>`#${h}`).join(" ")}/>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {aiHashtags.map((tag,i)=>(
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-text-medium block mb-1.5">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOpts.map(s=>(
                <button key={s.value} type="button" onClick={()=>setStatus(s.value)}
                  className={cn("py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center",
                    status===s.value?"bg-primary/10 border-primary/30 text-primary":"border-slate-200 text-text-light hover:bg-slate-50")}>
                  {s.label}
                </button>
              ))}
            </div>
            {status === "agendado" && scheduledAt && (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-xl bg-success/8 border border-success/20">
                <Send className="w-3 h-3 text-success flex-shrink-0"/>
                <span className="text-[10px] text-success">
                  Será publicado automaticamente em {new Date(scheduledAt).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}
                </span>
              </div>
            )}
          </div>

          {/* Alterações — change requests from William */}
          {alteracoes && (
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              className="border border-red-300/60 rounded-2xl overflow-hidden bg-red-50/60">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border-b border-red-200/60">
                <span className="text-red-600 text-xs">🔴</span>
                <span className="text-xs font-semibold text-red-700">Alterações solicitadas por William</span>
                <button type="button" onClick={() => setAlteracoes("")}
                  className="ml-auto text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                  <XIcon className="w-3.5 h-3.5"/>
                </button>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs text-red-700 leading-relaxed whitespace-pre-wrap">{alteracoes}</p>
              </div>
            </motion.div>
          )}

          {/* Criativos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-text-light"/>
                Criativos ({creatives.length}/10)
              </label>
              {creatives.length < 10 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-70 transition-opacity cursor-pointer">
                  <Upload className="w-3 h-3"/> Adicionar
                </button>
              )}
            </div>

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

          {/* Drive link — only for Reels */}
          {tipo === "reel" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400"/>
                Link do Drive (vídeo do Reel)
              </label>
              <input
                type="url"
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-300"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {selected && (
              <button type="button" onClick={remove}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-danger/30 text-danger hover:bg-danger/5 transition-all cursor-pointer">
                Excluir
              </button>
            )}
            <button type="button" onClick={()=>setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-text-medium hover:bg-slate-50 transition-all cursor-pointer">
              Cancelar
            </button>
            <button type="button" onClick={save} disabled={!titulo.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium gradient-primary text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              {selected?"Salvar":"Criar"}
            </button>
            <button type="button" onClick={saveAndNotifyWilliam} disabled={!titulo.trim() || sending}
              title="Salvar e enviar para William revisar no Telegram"
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              {sending ? "Enviando…" : sendResult === "ok" ? "✅ Enviado!" : sendResult === "error" ? "❌ Erro" : "📤 William"}
            </button>
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
