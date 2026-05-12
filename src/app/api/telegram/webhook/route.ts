/**
 * POST /api/telegram/webhook
 * Telegram bot for William — creates calendar events via chat.
 *
 * Flow:
 *   /novo → choose type → date → time → prompt (text or audio) → AI generates → approve/edit → saved to calendar
 */
import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_CHATS = (process.env.TELEGRAM_ALLOWED_CHATS ?? process.env.TELEGRAM_CHAT_ID_WILLIAM ?? "").split(",").map(s => s.trim()).filter(Boolean);

// ─── Telegram API helpers ────────────────────────────────────────────────────

async function sendMessage(chat_id: string, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TELEGRAM_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "HTML", ...extra }),
  });
}

async function editMessage(chat_id: string, message_id: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TELEGRAM_BASE}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, message_id, text, parse_mode: "HTML", ...extra }),
  });
}

async function answerCallback(callback_query_id: string) {
  await fetch(`${TELEGRAM_BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id }),
  });
}

async function getFileUrl(file_id: string): Promise<string | null> {
  const res = await fetch(`${TELEGRAM_BASE}/getFile?file_id=${file_id}`);
  const data = await res.json();
  if (!data.ok) return null;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
}

// ─── Session helpers ─────────────────────────────────────────────────────────

type SessionState = "idle" | "awaiting_type" | "awaiting_account" | "awaiting_date" | "awaiting_time" | "awaiting_prompt" | "awaiting_edit" | "awaiting_approval" | "awaiting_change_request" | "awaiting_idea_account" | "awaiting_idea_input" | "awaiting_idea_photos";

interface SessionData {
  tipo?: string;
  slug?: string;
  date?: string;      // YYYY-MM-DD
  time?: string;      // HH:MM
  prompt?: string;
  titulo?: string;
  copy?: string;
  legenda?: string;
  hashtags?: string[];
  preview_msg_id?: number;
  // For review flow
  review_event_id?: string;
  review_titulo?: string;
  // For /ideia photo collection
  idea_photos?: string[];       // Telegram file_ids
  idea_raw_text?: string;       // any text context sent alongside
}

async function getSession(chat_id: string): Promise<{ state: SessionState; data: SessionData }> {
  const sb = getSupabase();
  if (!sb) return { state: "idle", data: {} };
  const { data } = await sb.from("telegram_sessions").select("*").eq("chat_id", chat_id).maybeSingle();
  return data ? { state: data.state as SessionState, data: data.data as SessionData } : { state: "idle", data: {} };
}

async function setSession(chat_id: string, state: SessionState, data: SessionData) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("telegram_sessions").upsert({ chat_id, state, data, updated_at: new Date().toISOString() });
}

async function clearSession(chat_id: string) {
  await setSession(chat_id, "idle", {});
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(input: string): string | null {
  const lower = input.trim().toLowerCase();
  const now = new Date();

  if (lower === "hoje") {
    return now.toISOString().slice(0, 10);
  }
  if (lower === "amanhã" || lower === "amanha") {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (lower === "depois de amanhã" || lower === "depois de amanha") {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  // DD/MM or DD/MM/YYYY
  const slash = lower.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    const year = slash[3] ?? now.getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  // DD de mês
  const months: Record<string, string> = {
    janeiro: "01", fevereiro: "02", março: "03", marco: "03",
    abril: "04", maio: "05", junho: "06", julho: "07",
    agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  };
  const written = lower.match(/^(\d{1,2})\s+(?:de\s+)?(\w+)/);
  if (written && months[written[2]]) {
    return `${now.getFullYear()}-${months[written[2]]}-${written[1].padStart(2, "0")}`;
  }

  return null;
}

function parseTime(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})[:h]?(\d{2})?/);
  if (!match) return null;
  const h = match[1].padStart(2, "0");
  const m = (match[2] ?? "00").padStart(2, "0");
  if (parseInt(h) > 23 || parseInt(m) > 59) return null;
  return `${h}:${m}`;
}

// ─── AI content generation ───────────────────────────────────────────────────

async function transcribeAudio(fileUrl: string): Promise<string | null> {
  if (!OPENAI_KEY) return null;
  const audioRes = await fetch(fileUrl);
  const audioBlob = await audioRes.blob();

  const form = new FormData();
  form.append("file", audioBlob, "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "pt");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });
  const data = await res.json();
  return data.text ?? null;
}

/** GPT-4o Vision on 1–N Telegram photo file_ids (screenshots, artes, carrossel) */
async function analyzePhotos(fileIds: string[]): Promise<string> {
  if (!OPENAI_KEY || !fileIds.length) return "";

  // Resolve all file URLs from Telegram
  const urls: string[] = [];
  for (const fid of fileIds) {
    const url = await getFileUrl(fid);
    if (url) urls.push(url);
  }
  if (!urls.length) return "";

  const isCarousel = urls.length > 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];

  content.push({
    type: "text",
    text: isCarousel
      ? `Analise estes ${urls.length} slides de um carrossel do Instagram para criação de conteúdo.
Retorne JSON com:
{
  "slides": [
    { "slide": 1, "textos": "todo texto visível", "descricao": "descrição visual", "tema": "mensagem do slide" }
  ],
  "tema_geral": "mensagem principal do carrossel completo",
  "tipo_post": "carrossel"
}`
      : `Analise esta imagem de um post de Instagram para criação de conteúdo.
Retorne JSON com:
{
  "textos": "todo texto visível na imagem, palavra por palavra",
  "tema": "tema/mensagem principal que o post comunica",
  "descricao": "descrição visual: layout, cores, pessoas, expressões, elementos gráficos",
  "tipo_post": "arte_grafica | foto_pessoa | foto_produto | video_thumbnail | screenshot"
}`,
  });

  for (const url of urls) {
    content.push({ type: "image_url", image_url: { url, detail: "high" } });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: isCarousel ? 1500 : 700,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const obj = JSON.parse(raw);

    if (isCarousel && Array.isArray(obj.slides)) {
      const parts = [`TIPO: carrossel (${obj.slides.length} slides)`];
      if (obj.tema_geral) parts.push(`TEMA GERAL: ${obj.tema_geral}`);
      for (const s of obj.slides) {
        parts.push(`\nSLIDE ${s.slide}:`);
        if (s.textos)   parts.push(`  Texto: ${s.textos}`);
        if (s.tema)     parts.push(`  Mensagem: ${s.tema}`);
        if (s.descricao) parts.push(`  Visual: ${s.descricao}`);
      }
      return parts.join("\n");
    } else {
      const parts: string[] = [];
      if (obj.tipo_post) parts.push(`TIPO: ${obj.tipo_post}`);
      if (obj.textos)    parts.push(`TEXTO VISÍVEL:\n${obj.textos}`);
      if (obj.tema)      parts.push(`TEMA: ${obj.tema}`);
      if (obj.descricao) parts.push(`VISUAL: ${obj.descricao}`);
      return parts.join("\n");
    }
  } catch {
    return "";
  }
}

async function generateContent(tipo: string, slug: string, prompt: string): Promise<{ titulo: string; copy: string; legenda: string; hashtags: string[] } | null> {
  if (!OPENAI_KEY) return null;

  const isWilliam = slug === "william";
  const account = isWilliam ? "William Madruga (contador, advogado e palestrante — perfil pessoal)" : "Madruga Contabilidade (escritório contábil que atende PMEs)";
  const tom = isWilliam ? "pessoal, especialista e acessível — William fala em primeira pessoa, traduz o técnico para o prático" : "profissional e confiável para PMEs — linguagem leve, foca no impacto no negócio do empresário";
  const tipoLabel = tipo === "reel" ? "Reel" : tipo === "carrossel" ? "Carrossel" : tipo === "story" ? "Story" : "Post de Feed";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Você é um criador de conteúdo para Instagram da conta ${account}.
Tom: ${tom}

Crie um ${tipoLabel} com base no seguinte briefing:
"${prompt}"

Retorne APENAS JSON válido com estes campos:
{
  "titulo": "título interno curto para organização (máx 60 chars)",
  "copy": "${tipo === "reel" || tipo === "story" ? "roteiro completo do vídeo dividido por cenas: GANCHO (0-3s), desenvolvimento e CTA final — inclua o que aparece na tela e o que é falado" : "texto completo dos slides do carrossel, um slide por parágrafo"}",
  "legenda": "legenda do post para Instagram com emojis e CTA (máx 200 palavras, SEM hashtags)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

Regras para hashtags: entre 5 e 8, sem o símbolo #, mix de específicas e amplas.`,
      }],
    }),
  });

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      titulo: parsed.titulo ?? "",
      copy: parsed.copy ?? "",
      legenda: parsed.legenda ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    };
  } catch {
    return null;
  }
}

// ─── /ideia: format with AI and save as rascunho ────────────────────────────

async function processIdeaAndSave(opts: {
  chat_id: string;
  slug: string;
  appUrl: string;
  rawIdea: string;
  extraContext: string;
  transcriptWarn: string;
}): Promise<void> {
  const { chat_id, slug, appUrl, rawIdea, extraContext, transcriptWarn } = opts;

  if (!OPENAI_KEY) {
    await sendMessage(chat_id, "❌ OPENAI_API_KEY não configurada.");
    return;
  }

  const isWilliam = slug !== "madruga";
  const accountVoice = isWilliam
    ? `William Madruga — contador, advogado e palestrante (perfil pessoal @williamnmadruga).
Voz: direta, posicionada, profissional + humana. Fala em 1ª pessoa. Traduz técnico em impacto prático.
Público: empresários, MEI, donos de PMEs.`
    : `Madruga Contabilidade — escritório contábil que atende +1000 empresas (@madrugacontabilidade).
Voz: leve, acessível, próxima. Fala COM o empresário, não PARA.
Público: empresários de todos os portes no Sul do Brasil.`;

  const contextParts: string[] = [];
  if (rawIdea)      contextParts.push(`IDEIA/CONTEXTO DO CRIADOR:\n${rawIdea}`);
  if (extraContext) contextParts.push(extraContext);

  let ideaResult: { titulo?: string; tipo?: string; prompt?: string; justificativa?: string } = {};
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você é o assistente criativo de Instagram de: ${accountVoice}

Analise TODO o material recebido (transcrição, texto visível em artes, descrição visual, caption, áudio) e transforme em um briefing completo de produção.

FORMATOS: reel | carrossel | story | feed

RETORNE APENAS JSON VÁLIDO:
{
  "titulo": "título interno chamativo que resume o conteúdo (máx 70 chars)",
  "tipo": "reel" | "carrossel" | "story" | "feed",
  "prompt": "BRIEFING COMPLETO DE PRODUÇÃO com: (1) tema central e insight principal extraído do material, (2) gancho viral para os 3 primeiros segundos, (3) estrutura cena a cena para reel OU slide a slide para carrossel com timecodes/numeração, (4) tom emocional e linguagem, (5) CTA final. Mínimo 150 palavras. Use o conteúdo real analisado, não invente.",
  "justificativa": "por que esse formato e ângulo vão performar — cite elementos específicos do material analisado (1-2 frases)"
}`,
          },
          {
            role: "user",
            content: contextParts.join("\n\n") || "Sem material enviado.",
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`OpenAI ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "{}";
    try { ideaResult = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); ideaResult = m ? JSON.parse(m[0]) : {}; }
  } catch (e) {
    await sendMessage(chat_id, `❌ Erro na IA: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  if (!ideaResult.titulo) {
    await sendMessage(chat_id, "❌ A IA não retornou um briefing válido. Tente novamente com mais detalhes.");
    return;
  }

  // Save rascunho
  const sb = getSupabase();
  const hoje = new Date().toISOString().slice(0, 10);
  let saveError: string | null = null;

  if (sb) {
    const { error } = await sb.from("calendar_events").insert({
      id: `tg_idea_${Date.now()}`,
      slug,
      titulo: ideaResult.titulo,
      data: hoje,
      tipo: ideaResult.tipo ?? "reel",
      status: "rascunho",
      copy: ideaResult.prompt ?? null,
      legenda: ideaResult.justificativa ?? null,
    });
    if (error) saveError = error.message;
  } else {
    saveError = "Supabase não configurado";
  }

  if (saveError) {
    await sendMessage(chat_id, `❌ Erro ao salvar rascunho: <code>${saveError}</code>`);
    return;
  }

  const tipoEmoji = ideaResult.tipo === "reel" ? "🎬" : ideaResult.tipo === "carrossel" ? "🎠" : ideaResult.tipo === "story" ? "📸" : "📝";
  const slugLabel = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const warnLine  = transcriptWarn ? `\n\n⚠️ <i>${transcriptWarn}</i>` : "";

  await sendMessage(chat_id,
    `✅ <b>Ideia salva no rascunho!</b>\n\n${tipoEmoji} <b>${ideaResult.titulo}</b>\n👤 ${slugLabel}\n\n📋 <i>${(ideaResult.justificativa ?? "").slice(0, 250)}</i>${warnLine}\n\n<a href="${appUrl}/calendario">Abrir Calendário →</a>`,
    { disable_web_page_preview: true }
  );
}

// ─── Preview messages ─────────────────────────────────────────────────────────

const TELEGRAM_MAX = 4000; // safe limit (Telegram allows 4096)

/** Split a long text into chunks that fit within Telegram's message limit */
function splitText(text: string, max = TELEGRAM_MAX): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= max) { chunks.push(remaining); break; }
    // Try to split on a newline near the limit
    const slice = remaining.slice(0, max);
    const lastNewline = slice.lastIndexOf("\n");
    const cutAt = lastNewline > max * 0.6 ? lastNewline : max;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }
  return chunks;
}

/** Sends the full preview — roteiro in separate messages if needed, buttons on the last */
async function sendPreview(chat_id: string, data: SessionData): Promise<number | null> {
  const tipoEmoji = data.tipo === "reel" ? "🎬" : data.tipo === "carrossel" ? "🎠" : data.tipo === "story" ? "📸" : "📝";
  const slugLabel = data.slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const hashtagLine = data.hashtags?.length ? `\n\n<code>${data.hashtags.map(h => `#${h}`).join(" ")}</code>` : "";

  const header = `${tipoEmoji} <b>${data.titulo}</b>\n👤 ${slugLabel}\n📅 ${data.date} às ${data.time}`;
  const roteiro = data.copy ? `📝 <b>Roteiro:</b>\n<i>${data.copy}</i>` : "";
  const legendaBlock = `📱 <b>Legenda:</b>\n<i>${data.legenda}</i>${hashtagLine}`;

  // Send header + roteiro (split if needed)
  if (roteiro) {
    const roteiroChunks = splitText(`${header}\n\n${roteiro}`);
    for (let i = 0; i < roteiroChunks.length; i++) {
      await sendMessage(chat_id, roteiroChunks[i]);
    }
  } else {
    await sendMessage(chat_id, header);
  }

  // Send legenda + hashtags + buttons (this is the message we track for editing)
  const finalText = `${legendaBlock}\n\nO que deseja fazer?`;
  const res = await fetch(`${TELEGRAM_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text: finalText,
      parse_mode: "HTML",
      reply_markup: APPROVAL_KEYBOARD,
    }),
  });
  const resData = await res.json();
  return resData.ok ? resData.result.message_id : null;
}

/** Compact single-message preview for edit confirmation (no buttons) */
function buildPreviewText(data: SessionData): string {
  const tipoEmoji = data.tipo === "reel" ? "🎬" : data.tipo === "carrossel" ? "🎠" : data.tipo === "story" ? "📸" : "📝";
  const slugLabel = data.slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
  const hashtagLine = data.hashtags?.length ? `\n\n<code>${data.hashtags.map(h => `#${h}`).join(" ")}</code>` : "";
  return `${tipoEmoji} <b>${data.titulo}</b>\n👤 ${slugLabel}\n📅 ${data.date} às ${data.time}\n\n📱 <b>Legenda:</b>\n<i>${data.legenda}</i>${hashtagLine}`;
}

const APPROVAL_KEYBOARD = {
  inline_keyboard: [[
    { text: "✅ Aprovar", callback_data: "approve" },
    { text: "✏️ Editar", callback_data: "edit" },
    { text: "❌ Cancelar", callback_data: "cancel" },
  ]],
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Validate Telegram secret token (set via setWebhook with secret_token param)
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = req.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== expectedSecret) {
      return new Response("forbidden", { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return new Response("ok");

  // Handle inline button presses
  if (body.callback_query) {
    const cq = body.callback_query;
    const chat_id = String(cq.message.chat.id);
    const action = cq.data as string;

    await answerCallback(cq.id);

    // Security: only William can use this bot
    if (ALLOWED_CHATS.length > 0 && !ALLOWED_CHATS.includes(chat_id)) {
      await sendMessage(chat_id, "⛔ Acesso não autorizado.");
      return new Response("ok");
    }

    const { state, data } = await getSession(chat_id);

    if (action === "approve" && state === "awaiting_approval") {
      // Save to calendar
      const sb = getSupabase();
      let saveError: string | null = null;

      if (sb && data.tipo && data.slug && data.date && data.titulo) {
        const scheduled_at = data.time ? `${data.date}T${data.time}:00` : null;
        // Store hashtags as comma-separated text to avoid text[] type issues
        const hashtagsText = data.hashtags?.length ? data.hashtags.join(",") : null;
        const { error } = await sb.from("calendar_events").insert({
          id: `tg_${Date.now()}`,
          slug: data.slug,
          titulo: data.titulo,
          data: data.date,
          tipo: data.tipo,
          status: "planejado",
          scheduled_at,
          legenda: data.legenda ?? null,
          copy: data.copy ?? null,
          hashtags: hashtagsText,
        });
        if (error) saveError = `DB error: ${error.message} (code: ${error.code})`;
      } else {
        saveError = `Dados incompletos: tipo=${data.tipo} slug=${data.slug} date=${data.date} titulo=${data.titulo}`;
      }

      if (saveError) {
        await sendMessage(chat_id, `❌ Erro ao salvar no calendário: <code>${saveError}</code>\n\nTente aprovar novamente ou verifique o Supabase.`);
      } else {
        await editMessage(chat_id, cq.message.message_id,
          `✅ <b>Conteúdo salvo no calendário!</b>\n\n${buildPreviewText(data)}`,
          { reply_markup: { inline_keyboard: [] } }
        );
        await clearSession(chat_id);
      }

    } else if (action === "edit" && state === "awaiting_approval") {
      await setSession(chat_id, "awaiting_edit", data);
      // Remove buttons from preview but keep the content visible
      await editMessage(chat_id, cq.message.message_id, buildPreviewText(data), { reply_markup: { inline_keyboard: [] } });
      await sendMessage(chat_id, `✏️ Me manda o que você quer alterar (texto ou áudio):`);

    } else if (action === "cancel") {
      await clearSession(chat_id);
      await editMessage(chat_id, cq.message.message_id, buildPreviewText(data), { reply_markup: { inline_keyboard: [] } });
      await sendMessage(chat_id, "❌ Criação cancelada. Use /novo para começar.");

    } else if (action.startsWith("type_")) {
      const tipo = action.replace("type_", "");
      await setSession(chat_id, "awaiting_account", { tipo });
      await sendMessage(chat_id, `Para qual conta?\n`, {
        reply_markup: {
          inline_keyboard: [[
            { text: "👤 @williamnmadruga", callback_data: "account_william" },
            { text: "🏢 @madrugacontabilidade", callback_data: "account_madruga" },
          ]],
        },
      });

    } else if (action.startsWith("idea_account_")) {
      const slug = action.replace("idea_account_", "");
      await setSession(chat_id, "awaiting_idea_input", { slug });
      const slugLabel = slug === "william" ? "@williamnmadruga" : "@madrugacontabilidade";
      await editMessage(chat_id, cq.message.message_id,
        `💡 <b>Nova Ideia → ${slugLabel}</b>\n\nManda o link, áudio 🎙️ ou texto da ideia.\n\n<i>YouTube, Instagram, texto livre — qualquer formato vale!</i>`,
        { reply_markup: { inline_keyboard: [] } }
      );

    } else if (action.startsWith("account_")) {
      const slug = action.replace("account_", "");
      const newData = { ...data, slug };
      await setSession(chat_id, "awaiting_date", newData);
      await sendMessage(chat_id, `📅 Para qual data?\n\n<i>Ex: hoje, amanhã, 15/05, 20 de maio</i>`);

    // ── Review callbacks (from "📤 William" button in calendar) ──
    } else if (action.startsWith("rev_approve_")) {
      const eventId = action.replace("rev_approve_", "");
      const sb = getSupabase();
      if (sb) {
        await sb.from("calendar_events").update({ status: "agendado" }).eq("id", eventId);
      }
      await editMessage(chat_id, cq.message.message_id,
        `✅ <b>Criativo aprovado e agendado!</b>\n\nO post foi marcado como agendado no calendário.`,
        { reply_markup: { inline_keyboard: [] } }
      );
      await clearSession(chat_id);

    } else if (action.startsWith("rev_change_")) {
      const eventId = action.replace("rev_change_", "");
      await setSession(chat_id, "awaiting_change_request", { review_event_id: eventId });
      // Remove buttons from the message
      await fetch(`${TELEGRAM_BASE}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } }),
      });
      await sendMessage(chat_id, `✏️ Descreve as alterações que queres no criativo:`);
    }

    return new Response("ok");
  }

  // Handle regular messages
  const msg = body.message;
  if (!msg) return new Response("ok");

  const chat_id = String(msg.chat.id);
  const text = (msg.text ?? "").trim();

  // ── /meuid — always allowed, before security check ──
  if (text === "/meuid") {
    await sendMessage(chat_id, `🆔 Seu chat ID é: <code>${chat_id}</code>`);
    return new Response("ok");
  }

  // Security
  if (ALLOWED_CHATS.length > 0 && !ALLOWED_CHATS.includes(chat_id)) {
    await sendMessage(chat_id, `⛔ Acesso não autorizado.\n\nSeu chat ID: <code>${chat_id}</code>`);
    return new Response("ok");
  }

  const { state, data } = await getSession(chat_id);

  // ── /ideia command ──
  if (text === "/ideia") {
    await clearSession(chat_id);
    await setSession(chat_id, "awaiting_idea_account", {});
    await sendMessage(chat_id, "💡 <b>Nova Ideia</b>\n\nPara qual conta?", {
      reply_markup: {
        inline_keyboard: [[
          { text: "👤 @williamnmadruga", callback_data: "idea_account_william" },
          { text: "🏢 @madrugacontabilidade", callback_data: "idea_account_madruga" },
        ]],
      },
    });
    return new Response("ok");
  }

  // ── /novo command ──
  if (text === "/novo" || text === "/criar" || text.toLowerCase() === "novo") {
    await clearSession(chat_id);
    await setSession(chat_id, "awaiting_type", {});
    await sendMessage(chat_id, "🎨 <b>Novo conteúdo</b>\n\nQual o tipo do criativo?", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🎬 Reel", callback_data: "type_reel" },
          { text: "🎠 Carrossel", callback_data: "type_carrossel" },
        ], [
          { text: "📸 Story", callback_data: "type_story" },
          { text: "📝 Feed", callback_data: "type_feed" },
        ]],
      },
    });
    return new Response("ok");
  }

  // ── /cancelar ──
  if (text === "/cancelar" || text === "/cancel") {
    await clearSession(chat_id);
    await sendMessage(chat_id, "❌ Operação cancelada. Use /novo para começar.");
    return new Response("ok");
  }

  // ── /start or /help ──
  if (text === "/start" || text === "/help") {
    await sendMessage(chat_id, `👋 <b>Bot de Conteúdo — Madruga</b>

Comandos disponíveis:
/ideia — Salvar ideia rápida no rascunho (link, áudio ou texto)
/novo — Criar conteúdo completo com data e roteiro
/cancelar — Cancelar operação em andamento
/meuid — Ver seu chat ID`);
    return new Response("ok");
  }

  // ── /meuid — show chat id (for setup) ──
  if (text === "/meuid") {
    await sendMessage(chat_id, `🆔 Seu chat ID é: <code>${chat_id}</code>`);
    return new Response("ok");
  }

  // ── State machine ──

  if (state === "awaiting_date") {
    const parsed = parseDate(text);
    if (!parsed) {
      await sendMessage(chat_id, `❌ Não entendi a data. Tente:\n<i>hoje, amanhã, 15/05, 20 de maio</i>`);
      return new Response("ok");
    }
    const newData = { ...data, date: parsed };
    await setSession(chat_id, "awaiting_time", newData);
    await sendMessage(chat_id, `⏰ Qual o horário?\n\n<i>Ex: 18:00, 9h, 20h30</i>`);
    return new Response("ok");
  }

  if (state === "awaiting_time") {
    const parsed = parseTime(text);
    if (!parsed) {
      await sendMessage(chat_id, `❌ Não entendi o horário. Tente:\n<i>18:00, 9h, 20h30</i>`);
      return new Response("ok");
    }
    const newData = { ...data, time: parsed };
    await setSession(chat_id, "awaiting_prompt", newData);
    await sendMessage(chat_id, `💡 Agora me manda o prompt do conteúdo!\n\n<i>Pode ser texto ou áudio 🎙️\nDescreva o tema, ângulo, referências — quanto mais detalhe, melhor o resultado.</i>`);
    return new Response("ok");
  }

  if (state === "awaiting_prompt" || state === "awaiting_edit") {
    let prompt = text;

    // Handle voice/audio
    const voice = msg.voice ?? msg.audio;
    if (voice && !prompt) {
      await sendMessage(chat_id, "🎙️ Transcrevendo áudio...");
      const fileUrl = await getFileUrl(voice.file_id);
      if (fileUrl) {
        const transcribed = await transcribeAudio(fileUrl);
        if (transcribed) {
          prompt = transcribed;
          await sendMessage(chat_id, `📝 <i>Transcrição: "${transcribed}"</i>`);
        } else {
          await sendMessage(chat_id, "❌ Não consegui transcrever o áudio. Tente enviar o prompt em texto.");
          return new Response("ok");
        }
      }
    }

    if (!prompt) {
      await sendMessage(chat_id, "Por favor, manda o prompt em texto ou áudio 🎙️");
      return new Response("ok");
    }

    // For edit: merge prompt with previous legenda
    const editContext = state === "awaiting_edit" && data.legenda
      ? `Conteúdo anterior:\n${data.legenda}\n\nAlterações solicitadas:\n${prompt}`
      : prompt;

    await sendMessage(chat_id, "✨ Gerando conteúdo...");

    const generated = await generateContent(data.tipo!, data.slug!, editContext);
    if (!generated) {
      await sendMessage(chat_id, "❌ Erro ao gerar conteúdo. Tente novamente.");
      return new Response("ok");
    }

    const newData: SessionData = { ...data, prompt, titulo: generated.titulo, copy: generated.copy, legenda: generated.legenda, hashtags: generated.hashtags };
    await setSession(chat_id, "awaiting_approval", newData);

    const msgId = await sendPreview(chat_id, newData);
    if (msgId) {
      newData.preview_msg_id = msgId;
      await setSession(chat_id, "awaiting_approval", newData);
    }
    return new Response("ok");
  }

  // ── awaiting_change_request — William sent his change notes ──
  if (state === "awaiting_change_request") {
    if (!text) {
      await sendMessage(chat_id, "Manda as alterações em texto 📝");
      return new Response("ok");
    }

    const eventId = data.review_event_id;
    if (eventId) {
      const sb = getSupabase();
      if (sb) {
        await sb.from("calendar_events")
          .update({ alteracoes: text })
          .eq("id", eventId);
      }
    }

    await clearSession(chat_id);
    await sendMessage(chat_id, `✅ Alterações registradas no calendário!`);
    return new Response("ok");
  }

  // ── awaiting_idea_photos — collecting carousel/creative screenshots ──────────
  if (state === "awaiting_idea_photos") {
    const photo = msg.photo;

    if (photo) {
      // Add highest-res version of this photo to the accumulated list
      const best = photo[photo.length - 1];
      const existing = data.idea_photos ?? [];
      const updated = [...existing, best.file_id];
      await setSession(chat_id, "awaiting_idea_photos", { ...data, idea_photos: updated });
      await sendMessage(chat_id,
        `📸 Foto ${updated.length} recebida!\n\nMande mais slides ou envie /analisar para processar${updated.length === 1 ? " (ou qualquer texto com contexto adicional)" : "."}`
      );
      return new Response("ok");
    }

    // /analisar or any text triggers processing
    const photos = data.idea_photos ?? [];
    if (!photos.length) {
      await sendMessage(chat_id, "Nenhuma foto recebida. Mande as imagens primeiro.");
      return new Response("ok");
    }

    const slugP = data.slug ?? "william";
    const appUrlP = process.env.NEXT_PUBLIC_APP_URL ?? "https://madruga-dashboard.vercel.app";
    const extraTextP = text !== "/analisar" ? text : (data.idea_raw_text ?? "");

    await sendMessage(chat_id, `🖼️ Analisando ${photos.length > 1 ? `${photos.length} imagens` : "imagem"} com GPT-4o Vision...`);
    const visionResult = await analyzePhotos(photos);

    if (!visionResult) {
      await sendMessage(chat_id, "❌ Não consegui analisar as imagens. Tente de novo ou mande o texto da ideia.");
      await clearSession(chat_id);
      return new Response("ok");
    }

    await sendMessage(chat_id, "✨ Formatando briefing...");
    await processIdeaAndSave({ chat_id, slug: slugP, appUrl: appUrlP, rawIdea: extraTextP, extraContext: `--- ANÁLISE VISUAL DOS CRIATIVOS ---\n${visionResult}`, transcriptWarn: "" });
    await clearSession(chat_id);
    return new Response("ok");
  }

  // ── awaiting_idea_input — process the idea (link, audio, or text) ──
  if (state === "awaiting_idea_input") {
    const slug = data.slug ?? "william";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://madruga-dashboard.vercel.app";

    // ── Photo(s) sent directly — switch to photo collection mode ─────────────
    const incomingPhoto = msg.photo;
    if (incomingPhoto) {
      const best = incomingPhoto[incomingPhoto.length - 1];
      await setSession(chat_id, "awaiting_idea_photos", {
        ...data,
        idea_photos: [best.file_id],
        idea_raw_text: text || undefined,
      });
      await sendMessage(chat_id,
        `📸 Foto 1 recebida!\n\nSe for um carrossel, mande os outros slides.\nQuando terminar, mande /analisar ou escreva contexto adicional.`
      );
      return new Response("ok");
    }

    let rawIdea = text;
    let extraContext = "";        // extra info from URL/audio beyond raw text
    let transcriptWarn = "";

    // ── 1. Voice/audio message ─────────────────────────────────────────────────
    const voice = msg.voice ?? msg.audio;
    if (voice) {
      await sendMessage(chat_id, "🎙️ Transcrevendo áudio...");
      const fileUrl = await getFileUrl(voice.file_id);
      if (fileUrl) {
        const transcribed = await transcribeAudio(fileUrl);
        if (transcribed) {
          rawIdea = transcribed;
          await sendMessage(chat_id, `📝 <i>Transcrição: "${transcribed.slice(0, 200)}${transcribed.length > 200 ? "..." : ""}"</i>`);
        } else {
          await sendMessage(chat_id, "❌ Não consegui transcrever o áudio. Tente texto ou link.");
          return new Response("ok");
        }
      }
    }

    // ── 2. URL in text — full extraction: transcript + vision + meta ──────────
    const urlMatch = text.match(/https?:\/\/\S+/);
    if (urlMatch) {
      const pageUrl = urlMatch[0];
      rawIdea = text.replace(urlMatch[0], "").trim();

      await sendMessage(chat_id, "🔍 Analisando conteúdo do link...");

      // ── YouTube: closed captions via YoutubeTranscript ──────────────────────
      const ytMatch = pageUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        try {
          const { YoutubeTranscript } = await import("youtube-transcript");
          const segs = await YoutubeTranscript.fetchTranscript(ytMatch[1], { lang: "pt" })
            .catch(() => YoutubeTranscript.fetchTranscript(ytMatch[1], { lang: "en" }))
            .catch(() => YoutubeTranscript.fetchTranscript(ytMatch[1]));
          if (segs?.length) {
            const transcript = segs.map(s => s.text).join(" ").replace(/\s+/g, " ").trim().slice(0, 4500);
            extraContext = `TRANSCRIÇÃO COMPLETA DO VÍDEO:\n${transcript}`;
          } else {
            transcriptWarn = "Legendas não disponíveis no YouTube.";
          }
        } catch {
          transcriptWarn = "Legendas não disponíveis no YouTube.";
        }

      } else {
        // ── Instagram / generic URL: meta + vision + audio ──────────────────
        let html = "";
        let imageUrl = "";
        let ogVideoUrl = "";
        const metaParts: string[] = [];

        // Step A: fetch page meta
        try {
          const pageRes = await fetch(pageUrl, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
            redirect: "follow",
          });
          if (pageRes.ok) {
            html = await pageRes.text();
            const getMeta = (prop: string) =>
              html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
              ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"))?.[1]
              ?? html.match(new RegExp(`<meta[^>]+name=["']${prop.replace("og:", "")}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
              ?? "";
            const decode = (s: string) => s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
            const site  = decode(getMeta("og:site_name"));
            const title = decode(getMeta("og:title") || getMeta("twitter:title"));
            const desc  = decode(getMeta("og:description") || getMeta("twitter:description"));
            imageUrl    = decode(getMeta("og:image") || getMeta("twitter:image"));
            ogVideoUrl  = decode(getMeta("og:video:url") || getMeta("og:video:secure_url") || getMeta("og:video"));

            if (site)  metaParts.push(`PLATAFORMA: ${site}`);
            if (title) metaParts.push(`TÍTULO/LEGENDA: ${title}`);
            if (desc && desc !== title) metaParts.push(`DESCRIÇÃO/CAPTION: ${desc}`);
          }
        } catch {
          transcriptWarn = "Não consegui acessar o link.";
        }

        const contextSections: string[] = [];
        if (metaParts.length) contextSections.push(metaParts.join("\n"));

        // Step B: GPT-4o vision on thumbnail/image (reads text in arte, describes visual)
        if (imageUrl && OPENAI_KEY) {
          try {
            await sendMessage(chat_id, "🖼️ Analisando imagem/thumbnail com visão...");
            const vRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
              body: JSON.stringify({
                model: "gpt-4o",
                max_tokens: 700,
                response_format: { type: "json_object" },
                messages: [{
                  role: "user",
                  content: [
                    { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                    { type: "text", text: `Analise esta imagem de um post de Instagram para criação de conteúdo.
Retorne JSON com:
{
  "textos": "todo texto visível na imagem, palavra por palavra",
  "tema": "tema/mensagem principal que o post comunica",
  "descricao": "descrição visual: layout, cores, pessoas, expressões, elementos gráficos",
  "tipo_post": "arte_grafica | foto_pessoa | foto_produto | carrossel_capa | video_thumbnail | screenshot"
}` }
                  ]
                }]
              })
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              const vRaw = vData.choices?.[0]?.message?.content ?? "{}";
              const vObj = JSON.parse(vRaw);
              const vParts: string[] = [];
              if (vObj.tipo_post) vParts.push(`TIPO DE CRIATIVO: ${vObj.tipo_post}`);
              if (vObj.textos)    vParts.push(`TEXTO VISÍVEL NA ARTE:\n${vObj.textos}`);
              if (vObj.tema)      vParts.push(`TEMA/MENSAGEM: ${vObj.tema}`);
              if (vObj.descricao) vParts.push(`DESCRIÇÃO VISUAL: ${vObj.descricao}`);
              if (vParts.length)  contextSections.push(`--- ANÁLISE VISUAL DA IMAGEM ---\n${vParts.join("\n")}`);
            }
          } catch { /* vision failed — continue with meta only */ }
        }

        // Step C: try to transcribe video audio via og:video
        if (ogVideoUrl && OPENAI_KEY) {
          try {
            await sendMessage(chat_id, "🎬 Tentando transcrever áudio do vídeo...");
            // HEAD first to check size — Whisper limit is 25 MB
            const headRes = await fetch(ogVideoUrl, { method: "HEAD" });
            const sizeBytes = parseInt(headRes.headers.get("content-length") ?? "0");
            const sizeMB = sizeBytes / (1024 * 1024);

            if (sizeMB < 23 || sizeBytes === 0) {
              const vidRes = await fetch(ogVideoUrl);
              if (vidRes.ok) {
                const vidBlob = await vidRes.blob();
                const form = new FormData();
                form.append("file", vidBlob, "video.mp4");
                form.append("model", "whisper-1");
                form.append("language", "pt");
                const wRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${OPENAI_KEY}` },
                  body: form,
                });
                if (wRes.ok) {
                  const wData = await wRes.json();
                  if (wData.text) {
                    contextSections.push(`--- TRANSCRIÇÃO DO ÁUDIO DO VÍDEO ---\n${wData.text.slice(0, 4000)}`);
                  }
                }
              }
            } else {
              transcriptWarn = `Vídeo muito grande (${sizeMB.toFixed(0)} MB) — transcrição de áudio ignorada.`;
            }
          } catch {
            // video transcription failed silently — image vision + meta are enough
          }
        }

        extraContext = contextSections.join("\n\n");
      }
    }

    if (!rawIdea && !extraContext) {
      await sendMessage(chat_id, "Manda o link, áudio 🎙️, foto ou texto da ideia.");
      return new Response("ok");
    }

    await sendMessage(chat_id, "✨ Formatando ideia com IA...");
    await processIdeaAndSave({ chat_id, slug, appUrl, rawIdea, extraContext, transcriptWarn });
    await clearSession(chat_id);
    return new Response("ok");
  }

  // Fallback
  if (state === "idle") {
    await sendMessage(chat_id, `Use /ideia para salvar uma ideia rápida ou /novo para criar conteúdo completo.`);
  }

  return new Response("ok");
}
