/**
 * POST /api/calendar/generate-month
 * Uses Claude to generate a full month content plan for Madruga Escritório Contábil.
 * Distribution per week: 1 reel (Monday), 1 carrossel (Wednesday), 2 feed posts (Tuesday + Friday)
 * Total: 4 reels + 4 carrossels + 8 feed posts = 16 (drops 1 feed on last week = 15)
 *
 * Body: { slug: "madruga" | "william", month: number (1-12), year: number }
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const MADRUGA_VOICE = `
IDENTIDADE: Madruga Escritório Contábil — atende +1.000 empresas no Sul do Brasil.
VOZ: Leve, acessível, próxima. Fala COM o empresário, não PARA ele. Traduz "contabilês" em linguagem real.
PÚBLICO: Empresários de todos os portes (MEI, ME, EPP, médias empresas).
TOM: Descontraído no jeito, sério no conteúdo. Usa dados concretos e analogias do cotidiano.
NÃO FAZER: Jargão técnico sem tradução, tom de palestra, posicionamento político.
HOOKS: alertas de prazo, curiosidades tributárias, dicas práticas com números reais, checklists.
`.trim();

const WILLIAM_VOICE = `
IDENTIDADE: William Madruga — contador, advogado e palestrante.
VOZ: Direta, posicionada, profissional + humana. Fala em 1ª pessoa.
PÚBLICO: Empresários, MEI, donos de PMEs que pagam impostos.
TOM: Nunca neutro. Sempre conecta o técnico com o bolso do empresário.
NÃO FAZER: Começar com "Você sabia que", conteúdo genérico, tom de professor universitário.
HOOKS: urgência tributária, revelação de bastidores, contranarrativa, storytelling pessoal com insight profissional.
`.trim();

function getMonthName(month: number): string {
  const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return names[month - 1] ?? "Mês";
}

// Build the 15-post schedule for a given month
function buildSchedule(year: number, month: number): { date: string; tipo: string; weekNum: number }[] {
  const schedule: { date: string; tipo: string; weekNum: number }[] = [];
  // Find first Monday of the month
  const firstDay = new Date(year, month - 1, 1);
  let day = new Date(firstDay);
  // Go to first Monday
  while (day.getDay() !== 1) day.setDate(day.getDate() + 1);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let week = 1;
  const maxWeeks = 4;

  while (week <= maxWeeks) {
    const monday    = new Date(day);
    const tuesday   = new Date(day); tuesday.setDate(tuesday.getDate() + 1);
    const wednesday = new Date(day); wednesday.setDate(wednesday.getDate() + 2);
    const friday    = new Date(day); friday.setDate(friday.getDate() + 4);

    // Only add if still in the same month
    if (monday.getMonth() + 1 === month)    schedule.push({ date: fmt(monday),    tipo: "reel",      weekNum: week });
    if (tuesday.getMonth() + 1 === month)   schedule.push({ date: fmt(tuesday),   tipo: "feed",      weekNum: week });
    if (wednesday.getMonth() + 1 === month) schedule.push({ date: fmt(wednesday), tipo: "carrossel", weekNum: week });
    // Skip last week's second feed post to land on 15 total
    if (friday.getMonth() + 1 === month && week < maxWeeks) schedule.push({ date: fmt(friday), tipo: "feed", weekNum: week });

    day.setDate(day.getDate() + 7);
    week++;
  }

  return schedule;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 503 });
  }

  const { slug, month, year } = await req.json();
  if (!slug || !month || !year) {
    return Response.json({ error: "slug, month e year obrigatórios" }, { status: 400 });
  }

  const voice      = slug === "william" ? WILLIAM_VOICE : MADRUGA_VOICE;
  const accountTag = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const monthName  = getMonthName(Number(month));
  const schedule   = buildSchedule(Number(year), Number(month));

  const prompt = `Você é o estrategista de conteúdo de ${accountTag}.

${voice}

## Tarefa
Gere o planejamento completo de conteúdo para ${monthName}/${year}.
São ${schedule.length} conteúdos distribuídos conforme o cronograma abaixo.

## Cronograma
${schedule.map((s, i) => `${i + 1}. Data: ${s.date} | Tipo: ${s.tipo} | Semana ${s.weekNum}`).join("\n")}

## Regras
- Varie os temas: obrigações fiscais, dicas práticas, curiosidades tributárias, alertas de prazo, gestão empresarial
- Cada conteúdo deve ter um hook forte e específico
- Reels: gancho impactante nos primeiros 3 segundos
- Carrossels: estrutura de checklist ou "X coisas que você precisa saber"
- Feed: reflexão curta ou dado surpreendente
- NÃO repita temas na mesma semana
- Use datas e prazos reais de ${monthName}/${year} quando relevante

Retorne APENAS um array JSON válido (sem markdown), com exatamente ${schedule.length} objetos:
[
  {
    "index": 0,
    "titulo": "título interno curto (máx 60 chars)",
    "hook": "gancho dos primeiros 3 segundos ou primeira linha",
    "copy": "roteiro resumido (para reel: cenas principais | para carrossel: títulos dos slides | para feed: texto completo)",
    "legenda": "legenda Instagram pronta com emojis + CTA (máx 150 palavras, SEM hashtags)",
    "hashtags": ["tag1","tag2","tag3","tag4","tag5"]
  }
]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5",
        max_tokens: 8000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Claude falhou: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = data.content?.[0]?.text ?? "[]";
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let items: Record<string, unknown>[];
    try {
      items = JSON.parse(clean);
    } catch {
      const m = clean.match(/\[[\s\S]*\]/);
      items = m ? JSON.parse(m[0]) : [];
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Claude não retornou conteúdo válido" }, { status: 500 });
    }

    // Build calendar events
    const sb = getSupabase();
    const events = schedule.map((s, i) => {
      const item = items[i] ?? {};
      const id   = `gen-${slug}-${s.date}-${s.tipo}-${Date.now()}-${i}`;
      return {
        id,
        slug,
        titulo:   String(item.titulo ?? `${s.tipo} — semana ${s.weekNum}`),
        data:     s.date,
        tipo:     s.tipo,
        status:   "rascunho",
        legenda:  String(item.legenda ?? ""),
        copy:     String(item.copy    ?? ""),
        prompt:   String(item.hook    ?? ""),
        hashtags: Array.isArray(item.hashtags)
          ? (item.hashtags as string[]).join(",")
          : String(item.hashtags ?? ""),
        creatives_urls: null,
        alteracoes:     null,
        scheduled_at:   null,
      };
    });

    if (sb) {
      const { error } = await sb.from("calendar_events").upsert(events, { onConflict: "id" });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, count: events.length, events });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
