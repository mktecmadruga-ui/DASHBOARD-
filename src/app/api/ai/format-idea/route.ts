/**
 * POST /api/ai/format-idea
 * Suporta qualquer URL: YouTube (transcrição de legendas), Instagram (meta + visão),
 * ou qualquer link genérico (meta tags + GPT-4o vision na imagem).
 * Também aceita ideia em texto livre sem URL.
 *
 * Body: { rawIdea?: string, videoUrl?: string, slug?: "william"|"madruga" }
 * Returns: { titulo, tipo, prompt, justificativa, transcript?, imageDesc?, transcriptError? }
 */
import { NextRequest } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Use GPT-4o (not mini) for vision reliability
const VISION_MODEL = "gpt-4o";
const TEXT_MODEL   = "gpt-4o-mini";

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) { const m = url.match(re); if (m) return m[1]; }
  return null;
}

async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  const tries = [
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: "pt" }),
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: "pt-BR" }),
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }),
    () => YoutubeTranscript.fetchTranscript(videoId),
  ];
  for (const fn of tries) {
    try {
      const segs = await fn();
      if (segs?.length) return segs.map(s => s.text).join(" ").replace(/\s+/g, " ").trim();
    } catch { /* next */ }
  }
  throw new Error("Legendas não disponíveis neste vídeo");
}

// ─── Generic URL meta-tag extraction ─────────────────────────────────────────

const BOT_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

function extractMeta(html: string, property: string): string {
  // Try og: property
  const og = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
          ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"))?.[1]
          ?? "";
  if (og) return decodeHtmlEntities(og);
  // name= fallback
  const name = property.replace("og:", "");
  return decodeHtmlEntities(
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ?? ""
  );
}

function decodeHtmlEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

interface PageMeta {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  siteName: string;
}

async function fetchPageMeta(url: string): Promise<PageMeta> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BOT_UA,
      "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar URL`);
  const html = await res.text();

  return {
    title:       extractMeta(html, "og:title")       || extractMeta(html, "twitter:title"),
    description: extractMeta(html, "og:description") || extractMeta(html, "twitter:description"),
    imageUrl:    extractMeta(html, "og:image")        || extractMeta(html, "twitter:image"),
    videoUrl:    extractMeta(html, "og:video:url")    || extractMeta(html, "og:video"),
    siteName:    extractMeta(html, "og:site_name"),
  };
}

// ─── GPT-4o Vision — analyze image ───────────────────────────────────────────

async function analyzeImageWithVision(imageUrl: string, apiKey: string): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
          {
            type: "text",
            text: `Analise essa imagem de um post do Instagram para fins de criação de conteúdo.
Retorne um JSON com:
{
  "textos": "todo o texto visível na imagem, palavra por palavra",
  "descricao": "descrição visual do conteúdo (layout, cores, elementos, pessoas, expressões)",
  "tema": "qual o tema/mensagem principal que o post tenta comunicar",
  "tipo_post": "arte/carrossel/foto/video-thumbnail/screenshot"
}
Responda SOMENTE com JSON válido.`,
          },
        ],
      }],
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error("Vision API falhou");
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const obj = JSON.parse(raw);
    const parts = [];
    if (obj.textos)    parts.push(`TEXTO VISÍVEL: ${obj.textos}`);
    if (obj.tema)      parts.push(`TEMA: ${obj.tema}`);
    if (obj.descricao) parts.push(`VISUAL: ${obj.descricao}`);
    if (obj.tipo_post) parts.push(`TIPO: ${obj.tipo_post}`);
    return parts.join("\n");
  } catch {
    return raw;
  }
}

// ─── William's voice ──────────────────────────────────────────────────────────

const WILLIAM_VOICE = `
IDENTIDADE DE MARCA — William Madruga / Madruga Contabilidade
Contador e empresário. Fala de contabilidade, impostos e gestão com a visão de quem ESTÁ NO JOGO.
VOZ: Direto. Posicionado. Nunca neutro quando o assunto afeta o empresário.
TOM: Profissional + humano. Usa dados reais, fatos técnicos, ligando ao bolso e à vida real do empresário.
PÚBLICO: Empresários, MEI, autônomos, donos de PMEs que pagam impostos e estão cansados de linguagem técnica.

PADRÃO VIRAL:
- NOTÍCIA URGENTE + IMPACTO DIRETO no bolso/CNPJ
- STORYTELLING PESSOAL + EXPERTISE (vulnerabilidade → insight profissional)
- CONTRANARRATIVA + POSICIONAMENTO (o que ninguém fala)
- TREND PÚBLICA + PERSPECTIVA DO CONTADOR

NÃO FAZER: conteúdo genérico, ton de professor, hooks fracos ("Você sabia que..."), CTAs fracos ("Me siga").
`;

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { rawIdea = "", videoUrl = "", slug = "william" } = await req.json().catch(() => ({}));

  if (!rawIdea.trim() && !videoUrl.trim()) {
    return Response.json({ error: "Informe uma ideia ou URL" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });

  let transcript    = "";
  let imageDesc     = "";
  let pageMeta: Partial<PageMeta> = {};
  let transcriptError = "";
  const isWilliam = slug !== "madruga";

  // ── 1. Process URL ──────────────────────────────────────────────────────────
  if (videoUrl.trim()) {
    const youtubeId = extractYoutubeId(videoUrl);

    if (youtubeId) {
      // ── YouTube: full audio transcript ──
      try {
        let text = await fetchYoutubeTranscript(youtubeId);
        if (text.length > 5000) text = text.slice(0, 5000) + "…";
        transcript = text;
      } catch (e) {
        transcriptError = e instanceof Error ? e.message : "Erro na transcrição do YouTube";
      }

    } else {
      // ── Instagram / generic URL: meta tags + vision ──
      try {
        pageMeta = await fetchPageMeta(videoUrl);
      } catch (e) {
        transcriptError = `Não foi possível acessar a URL: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Vision on the page image (thumbnail, art, carousel cover)
      if (pageMeta.imageUrl) {
        try {
          imageDesc = await analyzeImageWithVision(pageMeta.imageUrl, apiKey);
        } catch {
          // Vision failed silently — still have meta text
        }
      }

      // Build text block from meta
      const parts: string[] = [];
      if (pageMeta.siteName) parts.push(`PLATAFORMA: ${pageMeta.siteName}`);
      if (pageMeta.title)       parts.push(`TÍTULO: ${pageMeta.title}`);
      if (pageMeta.description) parts.push(`LEGENDA/DESCRIÇÃO: ${pageMeta.description}`);
      transcript = parts.join("\n");
    }
  }

  // ── 2. Build OpenAI message ────────────────────────────────────────────────
  const systemPrompt = `Você é o assistente criativo do perfil @${isWilliam ? "williamnmadruga" : "madrugacontabilidade"} no Instagram.
Transforme o material recebido num BRIEFING estruturado para produção de conteúdo.

${WILLIAM_VOICE}

FORMATOS:
- reel: vídeo 15–90s (melhor alcance orgânico)
- carrossel: slides (melhor para salvar e compartilhar)
- story: sequência de telas (engajamento imediato)
- feed: imagem única (autoridade e referência)

RETORNE APENAS JSON VÁLIDO:
{
  "titulo": "Título chamativo (máx 80 chars)",
  "tipo": "reel" | "carrossel" | "story" | "feed",
  "prompt": "Briefing completo: tema central, insight principal, estrutura sugerida (cenas/slides com timecodes para Reel), gancho viral, tom emocional, CTA. Mínimo 150 palavras.",
  "justificativa": "Por que esse formato e ângulo vão performar. 1-2 frases."
}`;

  const contextParts: string[] = [];
  if (rawIdea.trim())    contextParts.push(`IDEIA DO CRIADOR:\n${rawIdea}`);
  if (transcript.trim()) contextParts.push(`CONTEÚDO EXTRAÍDO DA URL:\n${transcript}`);
  if (imageDesc.trim())  contextParts.push(`ANÁLISE VISUAL DA IMAGEM:\n${imageDesc}`);
  contextParts.push("Transforme em briefing criativo no estilo do perfil.");

  // Choose model: vision already done separately, so text model is enough here
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: contextParts.join("\n\n") },
        ],
        temperature: 0.82,
        max_tokens: 1400,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: { titulo: string; tipo: string; prompt: string; justificativa: string };
    try { parsed = JSON.parse(raw); }
    catch { parsed = JSON.parse((raw.match(/\{[\s\S]*\}/) ?? ["{}"])[0]); }

    return Response.json({
      titulo:          parsed.titulo        ?? "",
      tipo:            parsed.tipo          ?? "reel",
      prompt:          parsed.prompt        ?? "",
      justificativa:   parsed.justificativa ?? "",
      transcript:      transcript  || undefined,
      imageDesc:       imageDesc   || undefined,
      transcriptError: transcriptError || undefined,
    });
  } catch (e) {
    console.error("format-idea error:", e);
    return Response.json({ error: "Falha ao formatar ideia" }, { status: 500 });
  }
}
