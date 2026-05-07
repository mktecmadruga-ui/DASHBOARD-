/**
 * POST /api/reports/generate
 * Body: { slug, days }
 * Aggregates all real Instagram data + generates professional narrative via Claude.
 */
import { NextRequest } from "next/server";
import { fetchProfile, fetchMedia, fetchAccountInsights, fetchAudienceDemographics } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { slug = "william", days = 30 } = await req.json();
  const account = slug as AccountSlug;

  // Fetch all data in parallel
  const [profile, media, insights, audience] = await Promise.all([
    fetchProfile(account),
    fetchMedia(account, 50),
    fetchAccountInsights(account, days),
    fetchAudienceDemographics(account),
  ]);

  if (!profile) {
    return Response.json({ error: "Perfil não encontrado" }, { status: 500 });
  }

  // Compute derived metrics
  const reels    = media.filter(p => p.media_type === "VIDEO");
  const carros   = media.filter(p => p.media_type === "CAROUSEL_ALBUM");
  const images   = media.filter(p => p.media_type === "IMAGE");
  const avg = (arr: typeof media) =>
    arr.length ? Math.round(arr.reduce((s,p)=>s+p.like_count+p.comments_count,0)/arr.length) : 0;

  const topPosts = [...media]
    .sort((a,b)=>(b.like_count+b.comments_count)-(a.like_count+a.comments_count))
    .slice(0,5);

  const totals = insights?.totals;
  const engRate = totals && profile.followers_count
    ? ((totals.likes + totals.comments) / Math.max(media.length,1) / profile.followers_count * 100).toFixed(2)
    : "0";

  // Gender breakdown
  const genderMap: Record<string,number> = {};
  for (const g of audience?.genderAge ?? []) genderMap[g.gender] = (genderMap[g.gender]??0)+g.value;
  const total = Object.values(genderMap).reduce((a,b)=>a+b,0)||1;
  const genderPct = Object.entries(genderMap).map(([g,v])=>({
    label: g==="M"?"Masculino":g==="F"?"Feminino":"Outro",
    pct: Math.round(v/total*100)
  })).sort((a,b)=>b.pct-a.pct);

  // Build Claude prompt
  const context = `
Perfil: @${profile.username} — ${profile.name}
Seguidores: ${profile.followers_count.toLocaleString("pt-BR")}
Período analisado: últimos ${days} dias

DESEMPENHO DO PERÍODO:
- Curtidas: ${totals?.likes ?? 0}
- Comentários: ${totals?.comments ?? 0}
- Compartilhamentos: ${totals?.shares ?? 0}
- Salvamentos: ${totals?.saves ?? 0}
- Visitas ao perfil: ${totals?.profile_views ?? 0}
- Taxa de engajamento: ${engRate}%

PRODUÇÃO DE CONTEÚDO:
- Reels: ${reels.length} posts (média ${avg(reels)} interações)
- Carrosséis: ${carros.length} posts (média ${avg(carros)} interações)
- Fotos: ${images.length} posts (média ${avg(images)} interações)

TOP 5 POSTS:
${topPosts.map((p,i)=>`${i+1}. ${p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Foto"} — ${p.like_count}❤️ ${p.comments_count}💬 — "${(p.caption??"").slice(0,60)}"`).join("\n")}

AUDIÊNCIA:
- Gênero: ${genderPct.map(g=>`${g.label} ${g.pct}%`).join(", ")}
- Top cidades: ${(audience?.cities??[]).slice(0,3).map(c=>c.name).join(", ")||"não disponível"}
`.trim();

  let narrative = {
    resumo: "",
    destaques: [] as string[],
    oportunidades: [] as string[],
    recomendacoes: [] as string[],
  };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Você é analista sênior de Instagram Marketing para o Brasil. Com os dados abaixo, escreva um relatório executivo profissional em português brasileiro.

${context}

Retorne APENAS JSON válido:
{
  "resumo": "2-3 frases executivas sobre o desempenho geral do período — seja específico, use os números reais",
  "destaques": ["destaque 1 com número real", "destaque 2", "destaque 3"],
  "oportunidades": ["oportunidade 1 específica", "oportunidade 2", "oportunidade 3"],
  "recomendacoes": ["recomendação acionável 1", "recomendação acionável 2", "recomendação acionável 3"]
}`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "{}";
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
      narrative = { ...narrative, ...parsed };
    } catch (e) {
      console.error("[reports/generate] Claude error:", e);
      // Fallback narrative
      narrative = {
        resumo: `@${profile.username} registrou ${totals?.likes ?? 0} curtidas e ${totals?.comments ?? 0} comentários nos últimos ${days} dias, com taxa de engajamento de ${engRate}% sobre ${profile.followers_count.toLocaleString("pt-BR")} seguidores.`,
        destaques: [
          `${reels.length} Reels publicados com média de ${avg(reels)} interações por post`,
          `${totals?.saves ?? 0} salvamentos indicam conteúdo de alto valor`,
          `${totals?.profile_views ?? 0} visitas ao perfil no período`,
        ],
        oportunidades: [
          "Aumentar frequência de publicação nos dias de maior engajamento",
          "Explorar mais conteúdo do formato com melhor desempenho",
          "Engajar mais com comentários para aumentar o reach orgânico",
        ],
        recomendacoes: [
          `Priorizar ${avg(reels)>avg(carros)?"Reels":avg(carros)>avg(images)?"Carrosséis":"Fotos"} — formato com maior engajamento médio`,
          "Publicar nos horários de pico identificados no histórico",
          "Usar CTAs diretos nos posts para aumentar salvamentos e compartilhamentos",
        ],
      };
    }
  }

  return Response.json({
    profile,
    media: topPosts,
    totals: totals ?? null,
    insights: insights?.timeSeries ?? [],
    audience: {
      genderPct,
      cities: (audience?.cities??[]).slice(0,5),
      countries: (audience?.countries??[]).slice(0,3),
    },
    computed: {
      reelsCount: reels.length, reelsAvg: avg(reels),
      carrosCount: carros.length, carrosAvg: avg(carros),
      imagesCount: images.length, imagesAvg: avg(images),
      engRate,
      totalPosts: media.length,
    },
    narrative,
    days,
    generatedAt: new Date().toISOString(),
  });
}
