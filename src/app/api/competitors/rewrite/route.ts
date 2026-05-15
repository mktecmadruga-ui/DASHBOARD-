/**
 * POST /api/competitors/rewrite
 * Takes a competitor's post and rewrites it in William/Madruga's voice using Claude.
 *
 * Body: {
 *   slug: "william" | "madruga"
 *   post: { caption, mediaType, likeCount, commentCount, url, thumbnailUrl }
 *   competitorUsername: string
 * }
 */
import { NextRequest } from "next/server";

export const dynamic    = "force-dynamic";
export const maxDuration = 30;

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const WILLIAM_VOICE = `
IDENTIDADE: William Madruga — contador, advogado e palestrante.
VOZ: Direta, posicionada, profissional + humana. Fala em 1ª pessoa.
PÚBLICO: Empresários, MEI, donos de PMEs que pagam impostos e querem entender o impacto real.
TOM: Nunca neutro. Sempre conecta o técnico com o bolso do empresário.
NÃO FAZER: Começar com "Você sabia que", conteúdo genérico, tom de professor universitário.
HOOKS QUE FUNCIONAM para William: urgência tributária, revelação de bastidores, contranarrativa ("estão vendendo X como verdade, mas na prática é Y"), storytelling pessoal com insight profissional.
`.trim();

const MADRUGA_VOICE = `
IDENTIDADE: Madruga Escritório Contábil — atende +1.000 empresas no Sul do Brasil.
VOZ: Leve, acessível, próxima. Fala COM o empresário, não PARA ele. Traduz "contabilês" em linguagem real.
PÚBLICO: Empresários de todos os portes (MEI, ME, EPP, médias empresas).
TOM: Descontraído no jeito, sério no conteúdo. Usa dados concretos e analogias do cotidiano.
NÃO FAZER: Jargão técnico sem tradução, tom de palestra, posicionamento político.
HOOKS QUE FUNCIONAM para Madruga: alertas de prazo, curiosidades tributárias, dicas práticas com números reais, checklists.
`.trim();

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 503 });
  }

  const { slug, post, competitorUsername } = await req.json();
  if (!slug || !post) {
    return Response.json({ error: "slug e post obrigatórios" }, { status: 400 });
  }

  const isWilliam  = slug === "william";
  const voice      = isWilliam ? WILLIAM_VOICE : MADRUGA_VOICE;
  const accountTag = isWilliam ? "@williamnmadruga" : "@madrugacontabilidade";
  const tipo       = post.mediaType === "Video" ? "Reel" : post.mediaType === "Sidecar" ? "Carrossel" : "Post de Feed";
  const engStr     = `${post.likeCount} curtidas, ${post.commentCount} comentários`;

  const prompt = `Você é o ghostwriter de ${accountTag}.

${voice}

## Concorrente analisado
Perfil: @${competitorUsername}
Tipo de conteúdo: ${tipo}
Engajamento: ${engStr}
Caption original:
"""
${(post.caption ?? "").slice(0, 1500)}
"""

## Sua tarefa
Analise o que fez esse conteúdo engajar e reescreva adaptado para ${accountTag}.
Mantenha a ESSÊNCIA e o ÂNGULO que gerou engajamento, mas adapte 100% para a voz e público de ${accountTag}.

Retorne APENAS JSON válido (sem markdown):
{
  "tipo": "${tipo === "Reel" ? "reel" : tipo === "Carrossel" ? "carrossel" : "feed"}",
  "titulo": "título interno curto (máx 60 chars)",
  "hook": "gancho dos 3 primeiros segundos — o que faz parar o scroll",
  "copy": "${tipo === "Reel" ? "roteiro completo cena a cena com timecodes [0-3s], [3-15s]... e CTA final" : "texto completo slide a slide OU body do post"}",
  "legenda": "legenda completa para Instagram com emojis + CTA (máx 180 palavras, SEM hashtags)",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "porque_vai_engajar": "1-2 frases explicando por que esse ângulo funciona para o público de ${accountTag}"
}`;

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
        max_tokens: 2000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Claude falhou: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data  = await res.json();
    const raw: string = data.content?.[0]?.text ?? "{}";
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
