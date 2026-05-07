/**
 * GET /api/cron/competitor-insights
 * Runs 3x/week via Vercel Cron (Mon/Wed/Fri).
 * Fetches latest competitor posts from Apify, asks AI for fresh video ideas,
 * sends a summary to Telegram.
 */
import { fetchLastRunPosts, COMPETITORS_BY_ACCOUNT } from "@/lib/apify";
import { sendTelegram, isAuthorisedCron } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface PostBrief { username: string; caption: string; eng: number; type: string; url: string }

export async function GET(req: Request) {
  if (!isAuthorisedCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allComps = Array.from(new Set(Object.values(COMPETITORS_BY_ACCOUNT).flat()));

  let topPosts: PostBrief[] = [];
  try {
    const results = await fetchLastRunPosts(allComps);
    topPosts = results.flatMap(r =>
      r.posts.slice(0, 2).map(p => ({
        username: r.username,
        caption:  (p.caption ?? "").replace(/\n+/g, " ").slice(0, 200),
        eng:      p.engagement,
        type:     p.mediaType,
        url:      p.url,
      }))
    ).sort((a, b) => b.eng - a.eng).slice(0, 10);
  } catch (e) {
    console.error("[competitor-insights] apify error", e);
  }

  if (topPosts.length === 0) {
    await sendTelegram({
      text: `📊 <b>Insights de concorrentes</b>\n\nSem posts recentes pra analisar. Rode o refresh em /benchmark pra atualizar.`,
    });
    return Response.json({ ok: true, message: "no posts" });
  }

  // Generate insights via OpenAI
  let aiOutput = "";
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const context = topPosts.map((p, i) =>
      `${i+1}. @${p.username} (${p.type}, ${p.eng} interações): "${p.caption}"`
    ).join("\n");

    const prompt = `Você é um estrategista de conteúdo de Instagram para William Madruga (contador) e Madruga Contabilidade (PME). Analise os 10 posts mais engajados dos concorrentes (contadores, finanças, gestão) e gere 3 ideias VIRAIS de Reels que ele pode gravar essa semana.

POSTS DOS CONCORRENTES:
${context}

Retorne APENAS JSON válido:
{
  "tendencia": "1 frase sobre o padrão que está bombando",
  "ideias": [
    { "titulo": "título curto", "hook": "primeiros 3s do reel — frase exata", "estrutura": "2-3 frases sobre o desenvolvimento" },
    { "titulo": "...", "hook": "...", "estrutura": "..." },
    { "titulo": "...", "hook": "...", "estrutura": "..." }
  ]
}`;

    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.85,
          max_tokens: 1200,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);

      const ideas = (parsed.ideias as Array<{ titulo: string; hook: string; estrutura: string }>) ?? [];
      aiOutput = `<b>📈 Tendência:</b> ${escapeHtml(parsed.tendencia ?? "")}

${ideas.map((i, idx) => `<b>💡 Ideia ${idx + 1}: ${escapeHtml(i.titulo)}</b>
🎬 <b>Hook:</b> "${escapeHtml(i.hook)}"
📝 ${escapeHtml(i.estrutura)}`).join("\n\n")}`;
    } catch (e) {
      console.error("[competitor-insights] openai error", e);
      aiOutput = "Não consegui gerar ideias agora.";
    }
  } else {
    aiOutput = topPosts.slice(0, 3).map((p, i) =>
      `<b>${i+1}.</b> @${p.username} (${p.eng} inter.)\n<i>${escapeHtml(p.caption.slice(0, 120))}…</i>`
    ).join("\n\n");
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const fullText = `🎯 <b>Insights de concorrentes — ${today}</b>

${aiOutput}

📊 <b>Top 3 posts mais engajados:</b>
${topPosts.slice(0, 3).map((p, i) => `${i+1}. @${p.username} — ${p.eng} interações`).join("\n")}`;

  const r = await sendTelegram({
    text: fullText,
    dedup: { type: "competitor_insight", reference_id: new Date().toISOString().slice(0, 10) },
  });

  return Response.json({ ok: r.ok, sent: !r.skipped, posts: topPosts.length, error: r.error });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
