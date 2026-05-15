/**
 * POST /api/calendar/export-pdf
 * Generates a clean minimal PDF with all rascunho events for a slug,
 * sends it to Telegram, and returns { ok, messageId }.
 *
 * Body: { slug: "william" | "madruga" }
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN;
const WILLIAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID_WILLIAM;
const MADRUGA_CHAT_ID = process.env.TELEGRAM_CHAT_ID_MADRUGA ?? WILLIAM_CHAT_ID;

// ─── Minimal styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 50,
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.6,
  },
  // Header
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  docSub: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 32,
  },
  // Divider between posts
  divider: {
    borderBottom: "1 solid #E5E7EB",
    marginVertical: 20,
  },
  // Post number / title
  postNumber: {
    fontSize: 9,
    color: "#9CA3AF",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 6,
  },
  postMeta: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 16,
  },
  // Section label
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 12,
  },
  // Body text
  body: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.65,
  },
  hashtags: {
    fontSize: 9,
    color: "#7B61FF",
    marginTop: 4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#D1D5DB",
  },
  noContent: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 60,
  },
});

const TIPO_LABEL: Record<string, string> = {
  reel: "Reel", carrossel: "Carrossel", feed: "Feed", story: "Story",
};

type Event = {
  id: string; titulo: string; data: string; tipo: string;
  prompt?: string; copy?: string; legenda?: string; hashtags?: string;
};

function RascunhosPDF({ events, slug, date }: { events: Event[]; slug: string; date: string }) {
  const account = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";

  return (
    <Document title={`Rascunhos — ${account}`} author="Dashboard">
      <Page size="A4" style={s.page}>

        {/* Doc header */}
        <Text style={s.docTitle}>Rascunhos para aprovação</Text>
        <Text style={s.docSub}>
          {account}  ·  {events.length} conteúdo{events.length !== 1 ? "s" : ""}  ·  {date}
        </Text>

        {events.length === 0 && (
          <Text style={s.noContent}>Nenhum rascunho encontrado.</Text>
        )}

        {events.map((ev, i) => (
          <View key={ev.id}>
            {/* Divider between posts (skip before first) */}
            {i > 0 && <View style={s.divider}/>}

            <Text style={s.postNumber}>
              {String(i + 1).padStart(2, "0")}  ·  {TIPO_LABEL[ev.tipo] ?? ev.tipo}
            </Text>
            <Text style={s.postTitle}>{ev.titulo}</Text>
            <Text style={s.postMeta}>{ev.data}  ·  {ev.tipo}</Text>

            {ev.prompt ? (
              <View>
                <Text style={s.label}>Gancho / Hook</Text>
                <Text style={s.body}>{ev.prompt}</Text>
              </View>
            ) : null}

            {ev.copy ? (
              <View>
                <Text style={s.label}>
                  {ev.tipo === "reel" ? "Roteiro" : ev.tipo === "carrossel" ? "Slides" : "Texto"}
                </Text>
                <Text style={s.body}>{ev.copy}</Text>
              </View>
            ) : null}

            {ev.legenda ? (
              <View>
                <Text style={s.label}>Legenda</Text>
                <Text style={s.body}>{ev.legenda}</Text>
              </View>
            ) : null}

            {ev.hashtags ? (
              <Text style={s.hashtags}>
                {"#" + ev.hashtags.replace(/,/g, "  #")}
              </Text>
            ) : null}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{account}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}/>
        </View>

      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) return Response.json({ error: "slug obrigatório" }, { status: 400 });
  if (!BOT_TOKEN) return Response.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 503 });

  const chatId = slug === "william" ? WILLIAM_CHAT_ID : MADRUGA_CHAT_ID;
  if (!chatId) return Response.json({ error: "chat_id não configurado" }, { status: 503 });

  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase não configurado" }, { status: 503 });

  const { data, error } = await sb
    .from("calendar_events")
    .select("id,titulo,data,tipo,prompt,copy,legenda,hashtags")
    .eq("slug", slug)
    .eq("status", "rascunho")
    .order("data", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const events: Event[] = data ?? [];
  const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const pdfBuffer = await renderToBuffer(
    <RascunhosPDF events={events} slug={slug} date={date} />
  );

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append(
    "caption",
    `📋 *Rascunhos para aprovação*\n\n${events.length} conteúdo${events.length !== 1 ? "s" : ""} aguardando revisão.\n\nRevise o PDF e responda com suas alterações ou ✅ aprovado!`
  );
  formData.append("parse_mode", "Markdown");
  formData.append(
    "document",
    new Blob([pdfBuffer.buffer as ArrayBuffer], { type: "application/pdf" }) as unknown as File,
    `rascunhos-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`
  );

  const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!tgRes.ok) {
    const err = await tgRes.text();
    return Response.json({ error: `Telegram falhou: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const tgJson = await tgRes.json();
  return Response.json({ ok: true, messageId: tgJson.result?.message_id, count: events.length });
}
