/**
 * POST /api/ai/insights
 * Body: { slug, media, totals, followers, bestHours }
 * Returns 4 AI-generated insights grounded in real Instagram data.
 */
import { NextRequest } from "next/server";

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const MODEL      = "claude-sonnet-4-5";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "ANTHROPIC_API_KEY não configurado" }, { status: 500 });

  const { slug, media = [], totals = {}, followers = 1, bestHours = [] } = await req.json();

  // Build rich context from real data
  const topPosts = [...media]
    .sort((a: Record<string,number>, b: Record<string,number>) =>
      (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
    .slice(0, 5);

  const reels    = media.filter((p: {media_type:string}) => p.media_type === "VIDEO");
  const carrosels = media.filter((p: {media_type:string}) => p.media_type === "CAROUSEL_ALBUM");
  const images   = media.filter((p: {media_type:string}) => p.media_type === "IMAGE");

  const avgEng = (posts: {like_count:number;comments_count:number}[]) =>
    posts.length ? Math.round(posts.reduce((s,p)=>s+p.like_count+p.comments_count,0)/posts.length) : 0;

  const topCaptions = topPosts
    .map((p: {caption?:string;like_count:number;comments_count:number}, i: number) =>
      `${i+1}. "${(p.caption ?? "").slice(0,80)}" — ${p.like_count}❤️ ${p.comments_count}💬`)
    .join("\n");

  const profile = slug === "william"
    ? "@williamnmadruga (contador, empresários/MEI como público)"
    : "@madrugacontabilidade (contabilidade empresarial, PME)";

  const context = `
Perfil: ${profile}
Seguidores: ${followers.toLocaleString("pt-BR")}
Posts analisados: ${media.length}

MÉTRICAS DO PERÍODO:
- Curtidas totais: ${totals.likes ?? "n/d"}
- Comentários: ${totals.comments ?? "n/d"}
- Compartilhamentos: ${totals.shares ?? "n/d"}
- Salvamentos: ${totals.saves ?? "n/d"}
- Visitas ao perfil: ${totals.profile_views ?? "n/d"}

ENGAJAMENTO MÉDIO POR FORMATO:
- Reels (${reels.length} posts): ${avgEng(reels)} interações/post
- Carrosséis (${carrosels.length} posts): ${avgEng(carrosels)} interações/post
- Fotos (${images.length} posts): ${avgEng(images)} interações/post

MELHORES HORÁRIOS (por engajamento histórico):
${bestHours.slice(0,3).map((h:{label:string;avg:number}, i:number) => `${i+1}º lugar: ${h.label} (média ${h.avg} interações)`).join("\n") || "Dados insuficientes"}

TOP 5 POSTS:
${topCaptions || "Sem dados"}
`.trim();

  const systemPrompt = `Você é um analista sênior de redes sociais especialista em Instagram para contadores e empresários brasileiros.
Você recebe dados REAIS de uma conta e gera insights acionáveis, específicos e diretos.
Você NUNCA inventa dados — apenas analisa o que foi fornecido.
Sua linguagem é direta, profissional, sem rodeios. Foca no que mais impacta resultado.`;

  const userPrompt = `Com base nos dados reais abaixo, gere exatamente 4 insights estratégicos em JSON.

DADOS REAIS:
${context}

Retorne APENAS JSON válido (sem markdown, sem explicação) no formato:
{
  "insights": [
    {
      "id": "i1",
      "tipo": "formato" | "horario" | "conteudo" | "frequencia",
      "titulo": "frase curta e direta (máx 60 chars)",
      "descricao": "análise baseada nos dados reais acima (2-3 frases, cite números reais)",
      "impacto": "alto" | "medio" | "baixo",
      "confianca": 70-95,
      "metricas": [{"label": "string", "valor": "string"}],
      "meta": "objetivo específico e mensurável",
      "passos": ["ação 1", "ação 2", "ação 3"],
      "exemplos": ["exemplo concreto 1", "exemplo concreto 2"]
    }
  ]
}

Insights devem cobrir: melhor formato, melhor horário, tema de conteúdo que mais performa, e frequência/consistência.`;

  try {
    const res = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return Response.json({ insights: parsed.insights ?? [] });
  } catch (e) {
    console.error("[ai/insights]", e);
    return Response.json({ error: "Falha ao gerar insights" }, { status: 500 });
  }
}
