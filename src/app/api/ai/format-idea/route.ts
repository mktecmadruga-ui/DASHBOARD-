/**
 * POST /api/ai/format-idea
 * Recebe uma ideia bruta (texto) + URL opcional de vídeo do YouTube.
 * Transcreve o vídeo (se fornecido) e formata tudo com a comunicação do William/Madruga.
 * Retorna: { titulo, tipo, prompt, transcript? }
 */
import { NextRequest } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL      = "gpt-4o-mini";

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Try Portuguese first, then auto-generated, then any
  const attempts = [
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: "pt" }),
    () => YoutubeTranscript.fetchTranscript(videoId, { lang: "pt-BR" }),
    () => YoutubeTranscript.fetchTranscript(videoId),
  ];
  for (const attempt of attempts) {
    try {
      const segments = await attempt();
      if (segments?.length) {
        return segments.map(s => s.text).join(" ").replace(/\s+/g, " ").trim();
      }
    } catch { /* try next */ }
  }
  throw new Error("Transcrição não disponível para este vídeo");
}

const WILLIAM_VOICE = `
IDENTIDADE DE MARCA — William Madruga / Madruga Contabilidade
Contador e empresário. Fala de contabilidade, impostos e gestão com a visão de quem ESTÁ NO JOGO.
VOZ: Direto. Posicionado. Nunca neutro quando o assunto afeta o empresário.
TOM: Profissional + humano. Usa dados reais, fatos técnicos, ligando ao bolso e à vida real do empresário.
PÚBLICO: Empresários, MEI, autônomos, donos de PMEs que pagam impostos e estão cansados de linguagem técnica.

PADRÃO VIRAL (baseado nos posts com +200 curtidas):
- NOTÍCIA URGENTE + IMPACTO DIRETO no bolso/CNPJ
- STORYTELLING PESSOAL + EXPERTISE (vulnerabilidade → insight profissional)
- CONTRANARRATIVA + POSICIONAMENTO (o que ninguém fala)
- TREND PÚBLICA + PERSPECTIVA DO CONTADOR

NÃO FAZER: conteúdo genérico, tom de professor, hooks fracos ("Você sabia que..."), CTAs fracos ("Me siga").
`;

export async function POST(req: NextRequest) {
  const { rawIdea, videoUrl, slug } = await req.json().catch(() => ({}));
  if (!rawIdea && !videoUrl) {
    return Response.json({ error: "Informe uma ideia ou URL de vídeo" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });

  // 1. Transcrição de vídeo (se fornecida)
  let transcript = "";
  let transcriptError = "";
  if (videoUrl) {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) {
      transcriptError = "URL do YouTube não reconhecida";
    } else {
      try {
        transcript = await fetchTranscript(videoId);
        // Limit to ~4000 chars to avoid token explosion
        if (transcript.length > 4000) transcript = transcript.slice(0, 4000) + "...";
      } catch (e) {
        transcriptError = e instanceof Error ? e.message : "Erro na transcrição";
      }
    }
  }

  // 2. Build prompt for OpenAI
  const isWilliam = !slug || slug === "william";

  const systemPrompt = `Você é o assistente criativo do perfil @${isWilliam ? "williamnmadruga" : "madrugacontabilidade"} no Instagram.
Sua tarefa: receber uma ideia bruta (e opcionalmente uma transcrição de vídeo) e transformar tudo num BRIEFING estruturado para a produção de conteúdo.

${WILLIAM_VOICE}

FORMATOS DISPONÍVEIS:
- reel: vídeo curto 15–90s (melhor alcance)
- carrossel: série de imagens/slides (melhor salvamento)
- story: stories sequenciais (engajamento direto)
- feed: post imagem única (formação de autoridade)

RETORNE APENAS JSON VÁLIDO:
{
  "titulo": "Título chamativo para o conteúdo (máx 80 chars)",
  "tipo": "reel" | "carrossel" | "story" | "feed",
  "prompt": "Briefing completo para o criador de conteúdo. Inclua: tema central, principal insight, estrutura sugerida (cenas/slides), gancho viral, tom emocional e CTA ideal. Mínimo 120 palavras.",
  "justificativa": "Por que esse formato e esse ângulo são os melhores para viralizar. 1-2 frases."
}`;

  let userContent = "";
  if (rawIdea) userContent += `IDEIA BRUTA:\n${rawIdea}\n\n`;
  if (transcript) userContent += `TRANSCRIÇÃO DO VÍDEO (use como base de conteúdo):\n${transcript}\n\n`;
  userContent += "Transforme isso num briefing criativo seguindo a identidade do perfil.";

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
        temperature: 0.8,
        max_tokens: 1200,
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
      titulo:         parsed.titulo        ?? "",
      tipo:           parsed.tipo          ?? "reel",
      prompt:         parsed.prompt        ?? "",
      justificativa:  parsed.justificativa ?? "",
      transcript:     transcript || undefined,
      transcriptError: transcriptError || undefined,
    });
  } catch (e) {
    console.error("format-idea error:", e);
    return Response.json({ error: "Falha ao formatar ideia" }, { status: 500 });
  }
}
