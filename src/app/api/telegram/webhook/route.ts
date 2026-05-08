/**
 * POST /api/telegram/webhook
 * Telegram bot for William — creates calendar events via chat.
 *
 * Flow:
 *   /novo → choose type → date → time → prompt (text or audio) → AI generates → approve/edit → saved to calendar
 */
import { getSupabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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

type SessionState = "idle" | "awaiting_type" | "awaiting_account" | "awaiting_date" | "awaiting_time" | "awaiting_prompt" | "awaiting_edit" | "awaiting_approval";

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

    } else if (action.startsWith("account_")) {
      const slug = action.replace("account_", "");
      const newData = { ...data, slug };
      await setSession(chat_id, "awaiting_date", newData);
      await sendMessage(chat_id, `📅 Para qual data?\n\n<i>Ex: hoje, amanhã, 15/05, 20 de maio</i>`);
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
/novo — Criar novo conteúdo para o calendário
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

  // Fallback
  if (state === "idle") {
    await sendMessage(chat_id, `Use /novo para criar um novo conteúdo para o calendário.`);
  }

  return new Response("ok");
}
