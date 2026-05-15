/**
 * POST /api/calendar/generate-month
 * Uses Claude to generate a week of content for Madruga/William.
 * Distribution: Monday=Reel, Tuesday=Feed, Wednesday=Carrossel, Friday=Feed (4 posts)
 *
 * Body: { slug, competitorUsername?, competitorPosts? }
 */
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic     = "force-dynamic";
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

function buildWeekSchedule(): { date: string; tipo: string; label: string }[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Find current Monday
  const today = new Date();
  const day   = new Date(today);
  const dow   = day.getDay(); // 0=Sun
  const diff  = dow === 0 ? -6 : 1 - dow;
  day.setDate(day.getDate() + diff);

  const mon = new Date(day);
  const tue = new Date(day); tue.setDate(mon.getDate() + 1);
  const wed = new Date(day); wed.setDate(mon.getDate() + 2);
  const fri = new Date(day); fri.setDate(mon.getDate() + 4);

  return [
    { date: fmt(mon), tipo: "reel",      label: "Segunda" },
    { date: fmt(tue), tipo: "feed",      label: "Terça"   },
    { date: fmt(wed), tipo: "carrossel", label: "Quarta"  },
    { date: fmt(fri), tipo: "feed",      label: "Sexta"   },
  ];
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 503 });
  }

  const { slug, competitorUsername, competitorPosts } = await req.json();
  if (!slug) {
    return Response.json({ error: "slug obrigatório" }, { status: 400 });
  }

  const voice      = slug === "william" ? WILLIAM_VOICE : MADRUGA_VOICE;
  const accountTag = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const schedule   = buildWeekSchedule();

  const competitorBlock = competitorUsername && Array.isArray(competitorPosts) && competitorPosts.length > 0
    ? `\n## Referência de concorrente: @${competitorUsername}
Top posts recentes — use como INSPIRAÇÃO de temas, adapte 100% para ${accountTag}:
${(competitorPosts as Array<{ caption?: string; likeCount?: number; mediaType?: string }>)
  .slice(0, 5)
  .map((p, i) => `${i + 1}. [${p.mediaType ?? "post"}] ${(p.caption ?? "").slice(0, 150)} (${p.likeCount ?? 0} likes)`)
  .join("\n")}`
    : "";

  const prompt = `Você é o estrategista de conteúdo de ${accountTag}.

${voice}
${competitorBlock}

## Tarefa
Gere exatamente 4 conteúdos para esta semana:

1. Segunda (${schedule[0].date}) — Reel
2. Terça (${schedule[1].date}) — Post de Feed
3. Quarta (${schedule[2].date}) — Carrossel
4. Sexta (${schedule[3].date}) — Post de Feed

## Regras
- Temas variados: obrigações fiscais, dicas práticas, curiosidades tributárias, alertas, gestão
- Cada conteúdo com hook forte e específico
- Reel: gancho impactante nos primeiros 3 segundos, roteiro cena a cena
- Carrossel: estrutura de checklist ou "X coisas que você precisa saber"
- Feed: reflexão curta ou dado surpreendente${competitorUsername ? `\n- Inspire-se nos temas do concorrente @${competitorUsername}` : ""}

Retorne APENAS um array JSON válido com exatamente 4 objetos:
[
  {
    "index": 0,
    "titulo": "título interno curto (máx 60 chars)",
    "hook": "gancho dos primeiros 3 segundos ou primeira linha",
    "copy": "roteiro resumido (reel: cenas | carrossel: títulos dos slides | feed: texto completo)",
    "legenda": "legenda Instagram com emojis + CTA (máx 120 palavras, SEM hashtags)",
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
        max_tokens: 3000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Claude falhou: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data  = await res.json();
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

    const sb     = getSupabase();
    const events = schedule.map((s, i) => {
      const item = items[i] ?? {};
      return {
        id:          `gen-${slug}-${s.date}-${s.tipo}-${Date.now()}-${i}`,
        slug,
        titulo:      String(item.titulo ?? `${s.tipo} — ${s.label}`),
        data:        s.date,
        tipo:        s.tipo,
        status:      "rascunho",
        legenda:     String(item.legenda  ?? ""),
        copy:        String(item.copy     ?? ""),
        prompt:      String(item.hook     ?? ""),
        hashtags:    Array.isArray(item.hashtags)
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
