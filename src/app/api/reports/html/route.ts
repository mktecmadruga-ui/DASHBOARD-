/**
 * GET /api/reports/html?slug=X&days=Y
 * Returns a fully-styled A4 HTML report (same design language as checklist-entrevista.html).
 * Open in new tab → Cmd+P → Save as PDF.
 */
import { NextRequest } from "next/server";
import { fetchProfile, fetchMedia, fetchAccountInsights, fetchAudienceDemographics } from "@/lib/instagram-api";
import type { AccountSlug } from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(".", ",") + "K";
  return String(n);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") ?? "william") as AccountSlug;
  const days = Number(searchParams.get("days") ?? 30);

  const [profile, media, insights, audience] = await Promise.all([
    fetchProfile(slug),
    fetchMedia(slug, 50),
    fetchAccountInsights(slug, days),
    fetchAudienceDemographics(slug),
  ]);

  if (!profile) return new Response("Perfil não encontrado", { status: 500 });

  const reels  = media.filter(p => p.media_type === "VIDEO");
  const carros = media.filter(p => p.media_type === "CAROUSEL_ALBUM");
  const images = media.filter(p => p.media_type === "IMAGE");
  const avg    = (arr: typeof media) =>
    arr.length ? Math.round(arr.reduce((s, p) => s + p.like_count + p.comments_count, 0) / arr.length) : 0;

  const topPosts = [...media]
    .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
    .slice(0, 5);

  const totals  = insights?.totals;
  const engRate = totals && profile.followers_count
    ? ((totals.likes + totals.comments) / Math.max(media.length, 1) / profile.followers_count * 100).toFixed(2)
    : "0";

  // Gender
  const genderMap: Record<string, number> = {};
  for (const g of audience?.genderAge ?? []) genderMap[g.gender] = (genderMap[g.gender] ?? 0) + g.value;
  const gTotal = Object.values(genderMap).reduce((a, b) => a + b, 0) || 1;
  const genderPct = Object.entries(genderMap)
    .map(([g, v]) => ({ label: g === "M" ? "Masculino" : g === "F" ? "Feminino" : "Outro", pct: Math.round(v / gTotal * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const cities    = (audience?.cities ?? []).slice(0, 5);
  const countries = (audience?.countries ?? []).slice(0, 4);
  const maxCity   = cities[0]?.value || 1;

  // Claude narrative
  const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
  const context = `Perfil: @${profile.username} — ${profile.name}
Seguidores: ${profile.followers_count.toLocaleString("pt-BR")}
Período analisado: últimos ${days} dias
Curtidas: ${totals?.likes ?? 0} | Comentários: ${totals?.comments ?? 0} | Compartilhamentos: ${totals?.shares ?? 0} | Salvamentos: ${totals?.saves ?? 0} | Visitas ao perfil: ${totals?.profile_views ?? 0}
Taxa de engajamento: ${engRate}%
Reels: ${reels.length} posts (média ${avg(reels)} interações) | Carrosséis: ${carros.length} posts (média ${avg(carros)} interações) | Fotos: ${images.length} posts (média ${avg(images)} interações)
Top posts: ${topPosts.slice(0, 3).map(p => `${p.like_count}❤ ${p.comments_count}💬`).join(" / ")}
Audiência: ${genderPct.map(g => `${g.label} ${g.pct}%`).join(", ")} | Top cidades: ${cities.slice(0, 3).map(c => c.name).join(", ") || "n/d"}`;

  let narrative = {
    resumo: `@${profile.username} registrou ${fmt(totals?.likes ?? 0)} curtidas e ${fmt(totals?.comments ?? 0)} comentários nos últimos ${days} dias, com taxa de engajamento de ${engRate}% sobre ${fmt(profile.followers_count)} seguidores.`,
    destaques: [
      `${reels.length} Reels publicados com média de ${fmt(avg(reels))} interações por post`,
      `${fmt(totals?.saves ?? 0)} salvamentos indicam conteúdo de alto valor para o público`,
      `${fmt(totals?.profile_views ?? 0)} visitas ao perfil no período analisado`,
    ],
    oportunidades: [
      "Aumentar frequência de publicação nos dias de maior engajamento",
      "Explorar mais o formato com melhor desempenho médio",
      "Engajar ativamente nos comentários para ampliar o alcance orgânico",
    ],
    recomendacoes: [
      `Priorizar ${avg(reels) >= avg(carros) && avg(reels) >= avg(images) ? "Reels" : avg(carros) >= avg(images) ? "Carrosséis" : "Fotos"} — formato com maior engajamento médio no período`,
      "Publicar nos horários de pico identificados no histórico de posts",
      "Usar CTAs diretos para aumentar salvamentos e compartilhamentos",
    ],
  };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res  = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          messages: [{ role: "user", content: `Você é analista sênior de Instagram Marketing para o Brasil. Com os dados abaixo, escreva um relatório executivo profissional em português brasileiro.\n\n${context}\n\nRetorne APENAS JSON válido:\n{"resumo":"2-3 frases executivas — use os números reais","destaques":["destaque 1","destaque 2","destaque 3"],"oportunidades":["oportunidade 1","oportunidade 2","oportunidade 3"],"recomendacoes":["recomendação 1","recomendação 2","recomendação 3"]}` }],
        }),
      });
      const data   = await res.json();
      const text   = data.content?.[0]?.text ?? "{}";
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
      // Only overwrite if Claude returned non-empty values
      if (parsed.resumo)                         narrative.resumo         = parsed.resumo;
      if (parsed.destaques?.length)              narrative.destaques      = parsed.destaques;
      if (parsed.oportunidades?.length)          narrative.oportunidades  = parsed.oportunidades;
      if (parsed.recomendacoes?.length)          narrative.recomendacoes  = parsed.recomendacoes;
    } catch { /* fallback above */ }
  }

  const date    = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const initial = profile.username.charAt(0).toUpperCase();
  const maxAvg  = Math.max(avg(reels), avg(carros), avg(images), 1);

  function bar(val: number, max: number, color: string) {
    const w = Math.max(Math.round(val / max * 100), val > 0 ? 4 : 0);
    return `<div style="background:#E2E8F0;border-radius:4px;height:8px;"><div style="background:${color};border-radius:4px;height:8px;width:${w}%;"></div></div>`;
  }

  function postType(t: string) {
    return t === "VIDEO" ? "Reel" : t === "CAROUSEL_ALBUM" ? "Carrossel" : "Foto";
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório — @${profile.username}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  :root{
    --purple:#5B21B6;--purple-mid:#7C3AED;--purple-lt:#8B5CF6;
    --purple-bg:#F5F3FF;--purple-bdr:#DDD6FE;
    --dark:#0F172A;--mid:#334155;--light:#64748B;--lighter:#94A3B8;--line:#E2E8F0;--white:#FFFFFF;
  }
  body{font-family:'Inter',system-ui,sans-serif;background:#F1F5F9;color:var(--dark);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;background:var(--white);margin:0 auto 16mm;padding:14mm 16mm 12mm;position:relative;overflow:hidden;}
  @media print{
    body{background:white;}
    .page{margin:0;page-break-after:always;break-after:page;}
    .page:last-child{page-break-after:auto;}
    .no-print{display:none!important;}
  }
  @page{size:A4;margin:0;}

  /* topbar */
  .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10mm;padding-bottom:4mm;border-bottom:1px solid var(--line);}
  .topbar-left{display:flex;align-items:center;gap:6px;}
  .brand-dot{width:18px;height:18px;background:var(--purple-mid);border-radius:50%;flex-shrink:0;}
  .brand-label{font-size:7pt;color:var(--lighter);text-transform:uppercase;letter-spacing:1.2px;font-weight:600;display:block;line-height:1;}
  .brand-name{font-size:13pt;font-weight:800;color:var(--dark);line-height:1;}
  .topbar-pg{font-size:8.5pt;color:var(--lighter);}

  /* hero */
  .hero{display:grid;grid-template-columns:1fr 1fr;gap:10mm;align-items:start;margin-bottom:9mm;}
  .hero-eyebrow{font-size:9pt;color:var(--light);font-weight:400;margin-bottom:4mm;}
  .hero-title-accent{font-size:17pt;font-weight:800;color:var(--purple-mid);line-height:1.1;margin-bottom:3mm;}
  .hero-title-main{font-size:38pt;font-weight:900;color:var(--dark);line-height:.95;letter-spacing:-1.5px;margin-bottom:5mm;}
  .hero-sub{font-size:9pt;color:var(--purple-mid);line-height:1.5;font-weight:500;}
  .hero-right{padding-top:2mm;}
  .profile-row{display:flex;align-items:center;gap:8px;margin-bottom:6mm;}
  .profile-avatar{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--purple),var(--purple-lt));display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .profile-avatar span{color:white;font-weight:900;font-size:20pt;}
  .profile-name{font-size:14pt;font-weight:800;color:var(--dark);}
  .profile-handle{font-size:10pt;color:var(--light);margin-top:2px;}
  .pill-list{display:flex;flex-direction:column;gap:3mm;}
  .pill{border:1.5px solid var(--purple-bdr);border-radius:50px;padding:3mm 8mm;text-align:center;font-size:9pt;font-weight:600;color:var(--purple-mid);}

  /* quote block */
  .quote-block{background:linear-gradient(135deg,var(--purple) 0%,#4C1D95 100%);border-radius:14px;padding:9mm 12mm;margin-bottom:9mm;position:relative;overflow:hidden;}
  .quote-block::before{content:open-quote;position:absolute;top:-6mm;left:8mm;font-size:80pt;color:rgba(255,255,255,.12);font-family:Georgia,serif;line-height:1;}
  .quote-text{font-size:12pt;font-weight:700;color:white;line-height:1.55;position:relative;}

  /* section header */
  .section-header{display:flex;align-items:flex-end;gap:5mm;margin-bottom:5mm;padding-bottom:3mm;border-bottom:1px solid var(--line);}
  .section-num{font-size:32pt;font-weight:900;color:var(--purple-mid);line-height:1;letter-spacing:-1px;}
  .section-eyebrow{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.5px;color:var(--lighter);font-weight:600;margin-bottom:1.5mm;}
  .section-title{font-size:16pt;font-weight:800;color:var(--dark);line-height:1;}

  /* kpi grid */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:8mm;}
  .kpi-card{background:var(--purple-bg);border:1px solid var(--purple-bdr);border-radius:12px;padding:4mm;text-align:center;}
  .kpi-icon{font-size:13pt;margin-bottom:2mm;}
  .kpi-val{font-size:18pt;font-weight:900;color:var(--dark);letter-spacing:-.5px;margin-bottom:1mm;}
  .kpi-label{font-size:7pt;color:var(--light);text-transform:uppercase;letter-spacing:.5px;font-weight:600;}

  /* destaques */
  .highlight-list{display:flex;flex-direction:column;gap:2.5mm;}
  .highlight-item{display:flex;align-items:flex-start;gap:3mm;background:#F0FDF4;border:1px solid #DCFCE7;border-radius:10px;padding:3mm 4mm;}
  .highlight-check{color:#22C55E;font-weight:800;font-size:11pt;flex-shrink:0;}
  .highlight-text{font-size:10pt;color:#166534;line-height:1.5;}

  /* format cards */
  .format-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:8mm;}
  .format-card{background:var(--purple-bg);border:1.5px solid var(--purple-bdr);border-radius:14px;padding:5mm 4mm;text-align:center;}
  .format-icon{font-size:20pt;margin-bottom:3mm;}
  .format-label{font-size:8pt;color:var(--light);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:2mm;}
  .format-count{font-size:26pt;font-weight:900;color:var(--dark);letter-spacing:-1px;margin-bottom:1mm;}
  .format-sub{font-size:8pt;color:var(--lighter);margin-bottom:4mm;}
  .format-bar-bg{background:#E2E8F0;border-radius:4px;height:6px;margin-bottom:3mm;}
  .format-avg{font-size:11pt;font-weight:700;color:var(--dark);}
  .format-avg span{font-size:8.5pt;color:var(--light);font-weight:400;}

  /* top posts */
  .post-list{display:flex;flex-direction:column;gap:2.5mm;margin-bottom:8mm;}
  .post-item{display:flex;align-items:center;gap:4mm;padding:3mm 4mm;border-radius:12px;border:1.5px solid var(--line);background:#FAFAFA;}
  .post-item.top{background:var(--purple-bg);border-color:var(--purple-bdr);}
  .post-rank{width:30px;height:30px;border-radius:9px;background:#E2E8F0;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .post-rank.top{background:var(--purple-mid);}
  .post-rank span{font-weight:900;font-size:11pt;color:var(--light);}
  .post-rank.top span{color:white;}
  .post-info{flex:1;min-width:0;}
  .post-caption{font-size:10.5pt;font-weight:600;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1mm;}
  .post-meta{font-size:8.5pt;color:var(--light);}
  .post-stats{display:flex;gap:5mm;flex-shrink:0;}
  .post-stat-likes{font-size:10.5pt;color:#EF4444;font-weight:700;}
  .post-stat-comments{font-size:10.5pt;color:#3B82F6;font-weight:700;}

  /* opportunities */
  .opps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:8mm;}
  .opp-card{background:#FFFBEB;border:1.5px solid #FEF3C7;border-radius:12px;padding:4mm;}
  .opp-label{font-size:7pt;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:var(--light);margin-bottom:2mm;}
  .opp-text{font-size:10pt;color:#92400E;line-height:1.5;}

  /* audience */
  .audience-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:6mm;}
  .aud-section-label{font-size:8.5pt;font-weight:700;color:var(--light);text-transform:uppercase;letter-spacing:1px;margin-bottom:4mm;}
  .bar-row{margin-bottom:3mm;}
  .bar-label-row{display:flex;justify-content:space-between;margin-bottom:1.5mm;}
  .bar-name{font-size:10.5pt;color:var(--dark);font-weight:600;}
  .bar-val{font-size:10.5pt;color:var(--dark);font-weight:800;}
  .bar-bg{background:#E2E8F0;border-radius:4px;height:8px;}

  /* countries */
  .country-chips{display:flex;gap:2.5mm;flex-wrap:wrap;margin-bottom:6mm;}
  .country-chip{background:var(--purple-bg);border:1.5px solid var(--purple-bdr);border-radius:50px;padding:2mm 5mm;font-size:10pt;color:var(--purple-mid);font-weight:600;}

  /* recommendations */
  .rec-list{display:flex;flex-direction:column;gap:3mm;margin-bottom:7mm;}
  .rec-item{display:flex;align-items:flex-start;gap:4mm;background:var(--purple-bg);border:1.5px solid var(--purple-bdr);border-radius:12px;padding:4mm 5mm;}
  .rec-num{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,var(--purple),var(--purple-lt));display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .rec-num span{color:white;font-weight:900;font-size:11pt;}
  .rec-text{font-size:10.5pt;color:var(--mid);line-height:1.6;}

  /* closing strip */
  .closing-strip{background:linear-gradient(135deg,var(--purple) 0%,#4C1D95 100%);border-radius:12px;padding:5mm 7mm;display:flex;align-items:center;justify-content:space-between;margin-bottom:8mm;}
  .closing-by{font-size:8pt;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;}
  .closing-name{font-size:14pt;font-weight:800;color:white;}
  .closing-ai{font-size:8.5pt;color:rgba(255,255,255,.45);}

  /* footer */
  .footer{position:absolute;bottom:10mm;left:16mm;right:16mm;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:3mm;}
  .footer p{font-size:8pt;color:var(--lighter);}

  /* print button */
  .print-btn{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,var(--purple-mid),var(--purple));color:white;border:none;border-radius:50px;padding:14px 28px;font-size:13pt;font-weight:700;font-family:'Inter',sans-serif;cursor:pointer;box-shadow:0 8px 32px rgba(92,37,237,.35);z-index:999;}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Salvar PDF</button>

<!-- ══════════════════════ PAGE 1 ══════════════════════ -->
<div class="page">

  <div class="topbar">
    <div class="topbar-left">
      <div class="brand-dot"></div>
      <div>
        <span class="brand-label">Relatório Instagram</span>
        <span class="brand-name">Madruga Dashboard</span>
      </div>
    </div>
    <span class="topbar-pg">1 / 3</span>
  </div>

  <div class="hero">
    <div class="hero-left">
      <p class="hero-eyebrow">${date}</p>
      <p class="hero-title-accent">Últimos ${days} dias</p>
      <p class="hero-title-main">Relatório<br>de<br>Desempenho</p>
      <p class="hero-sub">Dados reais via Instagram Graph API<br>+ narrativa gerada com Claude AI</p>
    </div>
    <div class="hero-right">
      <div class="profile-row">
        <div class="profile-avatar"><span>${initial}</span></div>
        <div>
          <p class="profile-name">${profile.name}</p>
          <p class="profile-handle">@${profile.username}</p>
        </div>
      </div>
      <div class="pill-list">
        <div class="pill">${fmt(profile.followers_count)} seguidores</div>
        <div class="pill">${media.length} posts publicados</div>
        <div class="pill">${engRate}% taxa de engajamento</div>
      </div>
    </div>
  </div>

  <div class="quote-block">
    <p class="quote-text">${narrative.resumo}</p>
  </div>

  <div class="section-header">
    <span class="section-num">01</span>
    <div><p class="section-eyebrow">Período analisado</p><p class="section-title">Destaques</p></div>
  </div>
  <div class="highlight-list" style="margin-bottom:8mm;">
    ${narrative.destaques.map(d => `
    <div class="highlight-item">
      <span class="highlight-check">✓</span>
      <p class="highlight-text">${d}</p>
    </div>`).join("")}
  </div>

  <div class="section-header">
    <span class="section-num">02</span>
    <div><p class="section-eyebrow">Métricas gerais</p><p class="section-title">KPIs do Período</p></div>
  </div>
  <div class="kpi-grid">
    ${[
      { icon:"👥", val: fmt(profile.followers_count), label:"Seguidores" },
      { icon:"❤️", val: fmt(totals?.likes ?? 0),      label:"Curtidas" },
      { icon:"💬", val: fmt(totals?.comments ?? 0),   label:"Comentários" },
      { icon:"↗",  val: fmt(totals?.shares ?? 0),     label:"Compartilhamentos" },
      { icon:"🔖", val: fmt(totals?.saves ?? 0),      label:"Salvamentos" },
      { icon:"👁",  val: fmt(totals?.profile_views ?? 0), label:"Visitas ao Perfil" },
      { icon:"⚡", val: `${engRate}%`,                 label:"Engajamento" },
      { icon:"📸", val: String(media.length),          label:"Posts" },
    ].map(k => `
    <div class="kpi-card">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-val">${k.val}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join("")}
  </div>

  <div class="footer">
    <p>Madruga Dashboard · dados reais Instagram API</p>
    <p>Confidencial</p>
  </div>
</div>

<!-- ══════════════════════ PAGE 2 ══════════════════════ -->
<div class="page">

  <div class="topbar">
    <div class="topbar-left">
      <div class="brand-dot"></div>
      <div>
        <span class="brand-label">Relatório Instagram · @${profile.username} · ${date}</span>
        <span class="brand-name">Madruga Dashboard</span>
      </div>
    </div>
    <span class="topbar-pg">2 / 3</span>
  </div>

  <div class="section-header">
    <span class="section-num">03</span>
    <div><p class="section-eyebrow">Conteúdo publicado</p><p class="section-title">Performance por Formato</p></div>
  </div>
  <div class="format-grid">
    ${[
      { icon:"▶", label:"Reels",      count:reels.length,  avgVal:avg(reels),  color:"#7C3AED" },
      { icon:"◫", label:"Carrosséis", count:carros.length, avgVal:avg(carros), color:"#3B82F6" },
      { icon:"🖼", label:"Fotos",      count:images.length, avgVal:avg(images), color:"#22C55E" },
    ].map(f => `
    <div class="format-card">
      <div class="format-icon">${f.icon}</div>
      <div class="format-label">${f.label}</div>
      <div class="format-count">${f.count}</div>
      <div class="format-sub">posts publicados</div>
      <div class="format-bar-bg"><div style="background:${f.color};border-radius:4px;height:6px;width:${Math.max(Math.round(f.avgVal/maxAvg*100),f.avgVal>0?4:0)}%;"></div></div>
      <div class="format-avg">${fmt(f.avgVal)} <span>inter./post</span></div>
    </div>`).join("")}
  </div>

  <div class="section-header">
    <span class="section-num">04</span>
    <div><p class="section-eyebrow">Melhores publicações</p><p class="section-title">Top 5 Posts</p></div>
  </div>
  <div class="post-list">
    ${topPosts.map((p, i) => `
    <div class="post-item${i === 0 ? " top" : ""}">
      <div class="post-rank${i === 0 ? " top" : ""}"><span>#${i + 1}</span></div>
      <div class="post-info">
        <div class="post-caption">${(p.caption ?? "Sem legenda").slice(0, 72)}${(p.caption?.length ?? 0) > 72 ? "…" : ""}</div>
        <div class="post-meta">${postType(p.media_type)} · ${new Date(p.timestamp).toLocaleDateString("pt-BR", { day:"2-digit", month:"short" })}</div>
      </div>
      <div class="post-stats">
        <span class="post-stat-likes">❤ ${fmt(p.like_count)}</span>
        <span class="post-stat-comments">💬 ${fmt(p.comments_count)}</span>
      </div>
    </div>`).join("")}
  </div>

  <div class="section-header">
    <span class="section-num">05</span>
    <div><p class="section-eyebrow">Análise estratégica</p><p class="section-title">Oportunidades Identificadas</p></div>
  </div>
  <div class="opps-grid">
    ${narrative.oportunidades.map((o, i) => `
    <div class="opp-card">
      <div class="opp-label">Oportunidade ${i + 1}</div>
      <div class="opp-text">${o}</div>
    </div>`).join("")}
  </div>

  <div class="footer">
    <p>Madruga Dashboard · dados reais Instagram API</p>
    <p>Confidencial</p>
  </div>
</div>

<!-- ══════════════════════ PAGE 3 ══════════════════════ -->
<div class="page">

  <div class="topbar">
    <div class="topbar-left">
      <div class="brand-dot"></div>
      <div>
        <span class="brand-label">Relatório Instagram · @${profile.username} · ${date}</span>
        <span class="brand-name">Madruga Dashboard</span>
      </div>
    </div>
    <span class="topbar-pg">3 / 3</span>
  </div>

  <div class="section-header">
    <span class="section-num">06</span>
    <div><p class="section-eyebrow">Dados da audiência</p><p class="section-title">Perfil do Público</p></div>
  </div>
  <div class="audience-grid">
    <div>
      <p class="aud-section-label">Gênero</p>
      ${genderPct.map((g, i) => {
        const colors = ["#7C3AED", "#3B82F6", "#22C55E"];
        return `
      <div class="bar-row">
        <div class="bar-label-row"><span class="bar-name">${g.label}</span><span class="bar-val">${g.pct}%</span></div>
        <div class="bar-bg"><div style="background:${colors[i] ?? "#7C3AED"};border-radius:4px;height:8px;width:${g.pct}%;"></div></div>
      </div>`;
      }).join("")}
    </div>
    <div>
      <p class="aud-section-label">Top Cidades</p>
      ${cities.map((city, i) => `
      <div class="bar-row">
        <div class="bar-label-row"><span class="bar-name">${i + 1}. ${city.name}</span><span class="bar-val">${city.value}</span></div>
        <div class="bar-bg"><div style="background:linear-gradient(90deg,#7C3AED,#8B5CF6);border-radius:4px;height:8px;width:${Math.round(city.value / maxCity * 100)}%;"></div></div>
      </div>`).join("")}
    </div>
  </div>

  ${countries.length > 0 ? `
  <div class="country-chips">
    ${countries.map(c => `<span class="country-chip">${c.code} · ${c.value}</span>`).join("")}
  </div>` : ""}

  <div class="section-header">
    <span class="section-num">07</span>
    <div><p class="section-eyebrow">Plano de ação</p><p class="section-title">Recomendações Estratégicas</p></div>
  </div>
  <div class="rec-list">
    ${narrative.recomendacoes.map((r, i) => `
    <div class="rec-item">
      <div class="rec-num"><span>${i + 1}</span></div>
      <p class="rec-text">${r}</p>
    </div>`).join("")}
  </div>

  ${profile.biography ? `
  <div style="background:#F8FAFC;border-radius:12px;padding:4mm 5mm;border:1px solid var(--line);margin-bottom:6mm;">
    <p style="font-size:8pt;color:var(--lighter);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:2mm;">Bio do perfil</p>
    <p style="font-size:10.5pt;color:#475569;line-height:1.55;">${profile.biography}</p>
  </div>` : ""}

  <div class="closing-strip">
    <div>
      <p class="closing-by">Gerado por</p>
      <p class="closing-name">Madruga Dashboard</p>
    </div>
    <p class="closing-ai">Instagram API + Claude AI · ${new Date().getFullYear()}</p>
  </div>

  <div class="footer">
    <p>Madruga Dashboard · dados reais Instagram API + Claude AI</p>
    <p>Confidencial</p>
  </div>
</div>

</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
