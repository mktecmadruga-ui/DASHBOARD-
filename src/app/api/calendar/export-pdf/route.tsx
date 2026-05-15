/**
 * POST /api/calendar/export-pdf
 * Generates a PDF with all rascunho events for a slug,
 * sends it to Telegram, and returns { ok, messageId }.
 *
 * Body: { slug: "william" | "madruga" }
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WILLIAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID_WILLIAM;
const MADRUGA_CHAT_ID = process.env.TELEGRAM_CHAT_ID_MADRUGA ?? WILLIAM_CHAT_ID;

// ─── PDF Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#F8F9FB",
    padding: 40,
  },
  header: {
    marginBottom: 24,
    borderBottom: "2 solid #7B61FF",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1E1B4B",
  },
  headerSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeft: "4 solid #7B61FF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1E1B4B",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#EDE9FE",
    color: "#7B61FF",
    fontFamily: "Helvetica-Bold",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  datePill: {
    fontSize: 9,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.6,
  },
  hookBox: {
    backgroundColor: "#EDE9FE",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  hookText: {
    fontSize: 10,
    color: "#5B21B6",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.5,
  },
  hashtags: {
    fontSize: 9,
    color: "#7B61FF",
    marginTop: 4,
  },
  divider: {
    borderBottom: "1 solid #E5E7EB",
    marginTop: 4,
    marginBottom: 8,
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: "1 solid #E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  noContent: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 40,
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
  const accountLabel = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  return (
    <Document title={`Rascunhos — ${accountLabel}`} author="InstaMetrics Dashboard">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📋 Rascunhos para aprovação</Text>
          <Text style={styles.headerSub}>{accountLabel}  ·  {events.length} conteúdo{events.length !== 1 ? "s" : ""}  ·  Gerado em {date}</Text>
        </View>

        {events.length === 0 ? (
          <Text style={styles.noContent}>Nenhum rascunho encontrado.</Text>
        ) : (
          events.map((ev, i) => (
            <View key={ev.id} style={styles.card} wrap={false}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{i + 1}. {ev.titulo}</Text>
                <Text style={styles.badge}>{TIPO_LABEL[ev.tipo] ?? ev.tipo}</Text>
              </View>

              <View style={styles.dateRow}>
                <Text style={styles.datePill}>📅 {ev.data}</Text>
              </View>

              {ev.prompt ? (
                <>
                  <Text style={styles.sectionLabel}>Gancho / Hook</Text>
                  <View style={styles.hookBox}>
                    <Text style={styles.hookText}>{ev.prompt}</Text>
                  </View>
                </>
              ) : null}

              {ev.copy ? (
                <>
                  <Text style={styles.sectionLabel}>{ev.tipo === "reel" ? "Roteiro" : ev.tipo === "carrossel" ? "Slides" : "Texto"}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.bodyText}>{ev.copy.slice(0, 600)}{ev.copy.length > 600 ? "…" : ""}</Text>
                </>
              ) : null}

              {ev.legenda ? (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Legenda Instagram</Text>
                  <Text style={styles.bodyText}>{ev.legenda}</Text>
                </>
              ) : null}

              {ev.hashtags ? (
                <Text style={styles.hashtags}>#{ev.hashtags.replace(/,/g, " #")}</Text>
              ) : null}
            </View>
          ))
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>InstaMetrics Dashboard  ·  {accountLabel}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
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

  // Fetch rascunhos from Supabase
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

  // Generate PDF buffer
  const pdfBuffer = await renderToBuffer(
    <RascunhosPDF events={events} slug={slug} date={date} />
  );

  // Send to Telegram as document
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption",
    `📋 *Rascunhos para aprovação*\n\n` +
    `${events.length} conteúdo${events.length !== 1 ? "s" : ""} aguardando revisão.\n\n` +
    `Revise o PDF e responda com suas alterações ou ✅ aprovado!`
  );
  formData.append("parse_mode", "Markdown");
  formData.append(
    "document",
    new Blob([pdfBuffer.buffer as ArrayBuffer], { type: "application/pdf" }) as unknown as File,
    `rascunhos-${slug}-${new Date().toISOString().slice(0,10)}.pdf`
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
