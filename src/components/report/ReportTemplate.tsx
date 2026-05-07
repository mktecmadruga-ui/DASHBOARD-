"use client";

/**
 * A4 PDF Report Template — premium design matching checklist visual language.
 * 794px × 1123px = A4 at 96dpi. Captured page-by-page with html2canvas.
 */

import { formatNumber } from "@/lib/utils";

export interface ReportData {
  profile: { username: string; name: string; followers_count: number; biography: string };
  media: Array<{ id:string; caption?:string; media_type:string; like_count:number; comments_count:number; timestamp:string }>;
  totals: { likes:number; comments:number; shares:number; saves:number; profile_views:number } | null;
  audience: { genderPct: {label:string;pct:number}[]; cities: {name:string;value:number}[]; countries: {code:string;value:number}[] };
  computed: { reelsCount:number; reelsAvg:number; carrosCount:number; carrosAvg:number; imagesCount:number; imagesAvg:number; engRate:string; totalPosts:number };
  narrative: { resumo:string; destaques:string[]; oportunidades:string[]; recomendacoes:string[] };
  days: number;
  generatedAt: string;
}

// ─── Design tokens (matching checklist palette) ───────────────────────────────
const C = {
  purple:    "#5B21B6",
  purpleMid: "#7C3AED",
  purpleLt:  "#8B5CF6",
  purpleBg:  "#F5F3FF",
  purpleBdr: "#DDD6FE",
  dark:      "#0F172A",
  mid:       "#334155",
  light:     "#64748B",
  lighter:   "#94A3B8",
  line:      "#E2E8F0",
  white:     "#FFFFFF",
  greenBg:   "#F0FDF4",
  greenBdr:  "#DCFCE7",
  greenText: "#166534",
  yellowBg:  "#FFFBEB",
  yellowBdr: "#FEF3C7",
  yellowText:"#92400E",
};

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

// ─── Top bar ─────────────────────────────────────────────────────────────────
function TopBar({ username, page, total }: { username: string; page: number; total: number }) {
  const date = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, paddingBottom:14, borderBottom:`1px solid ${C.line}` }}>
      <span style={{ fontFamily:FONT, fontSize:9, fontWeight:500, color:C.light, letterSpacing:.3 }}>
        Relatório de Desempenho · <strong style={{ color:C.purpleMid, fontWeight:700 }}>@{username}</strong> · {date}
      </span>
      <span style={{ fontFamily:FONT, fontSize:9, color:C.lighter, fontWeight:500 }}>{page}/{total}</span>
    </div>
  );
}

// ─── Section heading (large number + title, checklist style) ─────────────────
function SectionHead({ num, eyebrow, title }: { num: string; eyebrow: string; title: string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.line}` }}>
      <span style={{ fontFamily:FONT, fontSize:38, fontWeight:900, color:C.purpleMid, lineHeight:1, letterSpacing:-1 }}>{num}</span>
      <div>
        <p style={{ fontFamily:FONT, fontSize:7.5, textTransform:"uppercase" as const, letterSpacing:1.5, color:C.lighter, fontWeight:600, margin:"0 0 3px" }}>{eyebrow}</p>
        <p style={{ fontFamily:FONT, fontSize:16, fontWeight:800, color:C.dark, margin:0, lineHeight:1 }}>{title}</p>
      </div>
    </div>
  );
}

// ─── PAGE 1 — Cover + KPIs + Executive summary ───────────────────────────────
export function ReportPage1({ data }: { data: ReportData }) {
  const t = data.totals;
  const kpis = [
    { label:"Seguidores",        value: formatNumber(data.profile.followers_count), icon:"👥" },
    { label:"Curtidas",          value: formatNumber(t?.likes??0),                  icon:"❤️" },
    { label:"Comentários",       value: formatNumber(t?.comments??0),               icon:"💬" },
    { label:"Compartilhamentos", value: formatNumber(t?.shares??0),                 icon:"↗" },
    { label:"Salvamentos",       value: formatNumber(t?.saves??0),                  icon:"🔖" },
    { label:"Visitas ao Perfil", value: formatNumber(t?.profile_views??0),          icon:"👁" },
    { label:"Taxa Engajamento",  value: `${data.computed.engRate}%`,                icon:"⚡" },
    { label:"Posts no Período",  value: String(data.computed.totalPosts),           icon:"📸" },
  ];

  const initial = data.profile.username.charAt(0).toUpperCase();

  return (
    <div id="report-p1" style={{ width:794, minHeight:1123, background:C.white, fontFamily:FONT, padding:"36px 44px", boxSizing:"border-box", position:"relative", overflow:"hidden" }}>

      {/* Background decoration */}
      <div style={{ position:"absolute", top:-60, right:-60, width:280, height:280, borderRadius:"50%", background:`radial-gradient(circle,${C.purpleMid}20,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:80, left:-40, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${C.purpleLt}10,transparent 70%)`, pointerEvents:"none" }} />

      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, paddingBottom:14, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:20, height:20, background:C.purpleMid, borderRadius:"50%", flexShrink:0 }} />
          <div>
            <span style={{ fontFamily:FONT, fontSize:7, color:C.lighter, textTransform:"uppercase" as const, letterSpacing:1.2, fontWeight:600, display:"block", lineHeight:1 }}>Relatório Instagram</span>
            <span style={{ fontFamily:FONT, fontSize:13, fontWeight:800, color:C.dark, lineHeight:1 }}>Madruga Dashboard</span>
          </div>
        </div>
        <span style={{ fontFamily:FONT, fontSize:9, color:C.lighter }}>1/3</span>
      </div>

      {/* Hero grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, alignItems:"start", marginBottom:28 }}>
        {/* Left — title */}
        <div>
          <p style={{ fontFamily:FONT, fontSize:9, color:C.light, fontWeight:400, margin:"0 0 10px" }}>
            {new Date(data.generatedAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}
          </p>
          <p style={{ fontFamily:FONT, fontSize:15, fontWeight:800, color:C.purpleMid, lineHeight:1.1, margin:"0 0 6px" }}>
            Últimos {data.days} dias
          </p>
          <p style={{ fontFamily:FONT, fontSize:34, fontWeight:900, color:C.dark, lineHeight:.95, letterSpacing:-1.5, margin:"0 0 14px" }}>
            Relatório<br/>de<br/>Desempenho
          </p>
          <p style={{ fontFamily:FONT, fontSize:9, color:C.purpleMid, lineHeight:1.5, fontWeight:500, margin:0 }}>
            Dados reais via Instagram Graph API<br/>+ narrativa gerada com Claude AI
          </p>
        </div>

        {/* Right — profile card + pills */}
        <div style={{ paddingTop:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg,${C.purple},${C.purpleLt})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ color:C.white, fontWeight:900, fontSize:20, fontFamily:FONT }}>{initial}</span>
            </div>
            <div>
              <p style={{ fontFamily:FONT, fontSize:14, fontWeight:800, color:C.dark, margin:0 }}>{data.profile.name}</p>
              <p style={{ fontFamily:FONT, fontSize:10, color:C.light, margin:"2px 0 0" }}>@{data.profile.username}</p>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              `${formatNumber(data.profile.followers_count)} seguidores`,
              `${data.computed.totalPosts} posts publicados`,
              `${data.computed.engRate}% taxa de engajamento`,
            ].map(pill => (
              <div key={pill} style={{ border:`1.5px solid ${C.purpleBdr}`, borderRadius:50, padding:"8px 16px", textAlign:"center", fontFamily:FONT, fontSize:9, fontWeight:600, color:C.purpleMid }}>
                {pill}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote block — executive summary */}
      <div style={{ background:`linear-gradient(135deg,${C.purple} 0%,#4C1D95 100%)`, borderRadius:14, padding:"20px 24px", marginBottom:22, position:"relative", overflow:"hidden" }}>
        <span style={{ position:"absolute", top:-10, left:14, fontSize:72, color:"rgba(255,255,255,.1)", fontFamily:"Georgia, serif", lineHeight:1 }}>&ldquo;</span>
        <p style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color:C.white, lineHeight:1.55, margin:0, position:"relative" }}>
          {data.narrative.resumo}
        </p>
      </div>

      {/* Highlights */}
      <SectionHead num="01" eyebrow="Período analisado" title="Destaques do Período" />
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {data.narrative.destaques.map((d,i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, background:C.greenBg, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.greenBdr}` }}>
            <span style={{ color:"#22C55E", fontWeight:800, fontSize:12, flexShrink:0, fontFamily:FONT }}>✓</span>
            <p style={{ fontFamily:FONT, fontSize:10, color:C.greenText, margin:0, lineHeight:1.5 }}>{d}</p>
          </div>
        ))}
      </div>

      {/* KPI grid */}
      <div style={{ marginTop:22 }}>
        <SectionHead num="02" eyebrow="Métricas gerais" title="KPIs do Período" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background:C.purpleBg, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.purpleBdr}`, textAlign:"center" }}>
              <p style={{ fontFamily:FONT, fontSize:9, margin:"0 0 4px" }}>{k.icon}</p>
              <p style={{ fontFamily:FONT, fontSize:18, fontWeight:900, color:C.dark, margin:"0 0 3px", letterSpacing:-0.5 }}>{k.value}</p>
              <p style={{ fontFamily:FONT, fontSize:7.5, color:C.light, margin:0, textTransform:"uppercase" as const, letterSpacing:.5, fontWeight:600 }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:24, left:44, right:44, display:"flex", justifyContent:"space-between", borderTop:`1px solid ${C.line}`, paddingTop:10 }}>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Madruga Dashboard · dados reais Instagram API</p>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Confidencial</p>
      </div>
    </div>
  );
}

// ─── PAGE 2 — Content performance + Top posts ─────────────────────────────────
export function ReportPage2({ data }: { data: ReportData }) {
  const c = data.computed;
  const maxAvg = Math.max(c.reelsAvg, c.carrosAvg, c.imagesAvg, 1);
  const formats = [
    { label:"Reels",      count:c.reelsCount,  avg:c.reelsAvg,  color:C.purpleMid, icon:"▶" },
    { label:"Carrosséis", count:c.carrosCount, avg:c.carrosAvg, color:"#3B82F6",   icon:"◫" },
    { label:"Fotos",      count:c.imagesCount, avg:c.imagesAvg, color:"#22C55E",   icon:"🖼" },
  ];

  return (
    <div id="report-p2" style={{ width:794, minHeight:1123, background:C.white, fontFamily:FONT, padding:"36px 44px", boxSizing:"border-box", position:"relative", overflow:"hidden" }}>

      <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle,${C.purpleMid}15,transparent 70%)`, pointerEvents:"none" }} />

      <TopBar username={data.profile.username} page={2} total={3} />

      {/* Section 03 — Format performance */}
      <div style={{ marginBottom:26 }}>
        <SectionHead num="03" eyebrow="Conteúdo publicado" title="Performance por Formato" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {formats.map(f => (
            <div key={f.label} style={{ background:C.purpleBg, borderRadius:14, padding:"18px 16px", border:`1.5px solid ${C.purpleBdr}`, textAlign:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:f.color+"22", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
              </div>
              <p style={{ fontFamily:FONT, fontSize:9, fontWeight:600, color:C.light, textTransform:"uppercase" as const, letterSpacing:.5, margin:"0 0 4px" }}>{f.label}</p>
              <p style={{ fontFamily:FONT, fontSize:28, fontWeight:900, color:C.dark, margin:"0 0 2px", letterSpacing:-1 }}>{f.count}</p>
              <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:"0 0 12px" }}>posts publicados</p>
              <div style={{ background:`${C.line}`, borderRadius:6, height:6, marginBottom:6 }}>
                <div style={{ background:f.color, borderRadius:6, height:6, width:`${Math.round(f.avg/maxAvg*100)}%`, minWidth:f.avg>0?8:0 }} />
              </div>
              <p style={{ fontFamily:FONT, fontSize:11, color:C.dark, margin:0, fontWeight:700 }}>
                {formatNumber(f.avg)} <span style={{ fontSize:8.5, color:C.light, fontWeight:400 }}>inter./post</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 04 — Top posts */}
      <div style={{ marginBottom:26 }}>
        <SectionHead num="04" eyebrow="Melhores publicações" title="Top 5 Posts" />
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.media.map((post, i) => {
            const type = post.media_type==="VIDEO"?"Reel":post.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Foto";
            const cap  = (post.caption??"").slice(0,72)+((post.caption?.length??0)>72?"…":"");
            const isTop = i === 0;
            return (
              <div key={post.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:12, background:isTop?C.purpleBg:"#FAFAFA", border:`1.5px solid ${isTop?C.purpleBdr:C.line}` }}>
                <div style={{ width:32, height:32, borderRadius:10, background:isTop?C.purpleMid:"#E2E8F0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:FONT, color:isTop?C.white:C.light, fontWeight:900, fontSize:12 }}>#{i+1}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:FONT, fontSize:10.5, color:C.dark, margin:"0 0 2px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {cap || "Sem legenda"}
                  </p>
                  <p style={{ fontFamily:FONT, fontSize:8.5, color:C.light, margin:0 }}>
                    {type} · {new Date(post.timestamp).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
                  </p>
                </div>
                <div style={{ display:"flex", gap:14, flexShrink:0 }}>
                  <span style={{ fontFamily:FONT, fontSize:10.5, color:"#EF4444", fontWeight:700 }}>❤ {formatNumber(post.like_count)}</span>
                  <span style={{ fontFamily:FONT, fontSize:10.5, color:"#3B82F6", fontWeight:700 }}>💬 {formatNumber(post.comments_count)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 05 — Opportunities */}
      <div>
        <SectionHead num="05" eyebrow="Análise estratégica" title="Oportunidades Identificadas" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {data.narrative.oportunidades.map((o, i) => (
            <div key={i} style={{ background:C.yellowBg, borderRadius:12, padding:"14px 14px", border:`1.5px solid ${C.yellowBdr}` }}>
              <p style={{ fontFamily:FONT, fontSize:8.5, color:C.light, textTransform:"uppercase" as const, letterSpacing:1, fontWeight:700, margin:"0 0 6px" }}>Oportunidade {i+1}</p>
              <p style={{ fontFamily:FONT, fontSize:10, color:C.yellowText, margin:0, lineHeight:1.55 }}>{o}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:"absolute", bottom:24, left:44, right:44, display:"flex", justifyContent:"space-between", borderTop:`1px solid ${C.line}`, paddingTop:10 }}>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Madruga Dashboard · dados reais Instagram API</p>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Confidencial</p>
      </div>
    </div>
  );
}

// ─── PAGE 3 — Audience + Recommendations ─────────────────────────────────────
export function ReportPage3({ data }: { data: ReportData }) {
  const maxCity = data.audience.cities[0]?.value || 1;

  return (
    <div id="report-p3" style={{ width:794, minHeight:1123, background:C.white, fontFamily:FONT, padding:"36px 44px", boxSizing:"border-box", position:"relative", overflow:"hidden" }}>

      <div style={{ position:"absolute", bottom:-60, right:-60, width:240, height:240, borderRadius:"50%", background:`radial-gradient(circle,${C.purpleLt}12,transparent 70%)`, pointerEvents:"none" }} />

      <TopBar username={data.profile.username} page={3} total={3} />

      {/* Section 06 — Audience */}
      <div style={{ marginBottom:26 }}>
        <SectionHead num="06" eyebrow="Dados da audiência" title="Perfil do Público" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
          {/* Gender */}
          <div>
            <p style={{ fontFamily:FONT, fontSize:8.5, fontWeight:700, color:C.light, textTransform:"uppercase" as const, letterSpacing:1, margin:"0 0 12px" }}>Gênero</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {data.audience.genderPct.map((g, i) => {
                const colors = [C.purpleMid, "#3B82F6", "#22C55E"];
                return (
                  <div key={g.label}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontFamily:FONT, fontSize:10.5, color:C.dark, fontWeight:600 }}>{g.label}</span>
                      <span style={{ fontFamily:FONT, fontSize:10.5, color:C.dark, fontWeight:800 }}>{g.pct}%</span>
                    </div>
                    <div style={{ background:C.line, borderRadius:4, height:8 }}>
                      <div style={{ background:colors[i]??C.purpleMid, borderRadius:4, height:8, width:`${g.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top cities */}
          <div>
            <p style={{ fontFamily:FONT, fontSize:8.5, fontWeight:700, color:C.light, textTransform:"uppercase" as const, letterSpacing:1, margin:"0 0 12px" }}>Top Cidades</p>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {data.audience.cities.map((city, i) => (
                <div key={city.name}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:FONT, fontSize:10, color:C.dark, fontWeight:600 }}>{i+1}. {city.name}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, color:C.light }}>{city.value}</span>
                  </div>
                  <div style={{ background:C.line, borderRadius:4, height:6 }}>
                    <div style={{ background:`linear-gradient(90deg,${C.purpleMid},${C.purpleLt})`, borderRadius:4, height:6, width:`${Math.round(city.value/maxCity*100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Countries */}
        {data.audience.countries.length > 0 && (
          <div style={{ marginTop:16, display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {data.audience.countries.map(c => (
              <span key={c.code} style={{ fontFamily:FONT, background:C.purpleBg, border:`1.5px solid ${C.purpleBdr}`, borderRadius:50, padding:"6px 14px", fontSize:10, color:C.purpleMid, fontWeight:600 }}>
                {c.code} · {c.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Section 07 — Recommendations */}
      <div style={{ marginBottom:22 }}>
        <SectionHead num="07" eyebrow="Plano de ação" title="Recomendações Estratégicas" />
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.narrative.recomendacoes.map((r, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, background:C.purpleBg, borderRadius:12, padding:"14px 16px", border:`1.5px solid ${C.purpleBdr}` }}>
              <div style={{ width:28, height:28, borderRadius:9, background:`linear-gradient(135deg,${C.purple},${C.purpleLt})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:FONT, color:C.white, fontWeight:900, fontSize:11 }}>{i+1}</span>
              </div>
              <p style={{ fontFamily:FONT, fontSize:10.5, color:C.mid, margin:0, lineHeight:1.6 }}>{r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      {data.profile.biography && (
        <div style={{ background:"#F8FAFC", borderRadius:12, padding:"14px 16px", border:`1px solid ${C.line}` }}>
          <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:"0 0 5px", textTransform:"uppercase" as const, letterSpacing:.5, fontWeight:600 }}>Bio do perfil</p>
          <p style={{ fontFamily:FONT, fontSize:10.5, color:"#475569", margin:0, lineHeight:1.55 }}>{data.profile.biography}</p>
        </div>
      )}

      {/* Closing strip */}
      <div style={{ marginTop:20, background:`linear-gradient(135deg,${C.purple},#4C1D95)`, borderRadius:12, padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontFamily:FONT, fontSize:8.5, color:"rgba(255,255,255,.6)", margin:"0 0 2px", textTransform:"uppercase" as const, letterSpacing:1, fontWeight:600 }}>Gerado por</p>
          <p style={{ fontFamily:FONT, fontSize:13, fontWeight:800, color:C.white, margin:0 }}>Madruga Dashboard</p>
        </div>
        <p style={{ fontFamily:FONT, fontSize:8.5, color:"rgba(255,255,255,.5)", margin:0 }}>Instagram API + Claude AI · {new Date().getFullYear()}</p>
      </div>

      <div style={{ position:"absolute", bottom:24, left:44, right:44, display:"flex", justifyContent:"space-between", borderTop:`1px solid ${C.line}`, paddingTop:10 }}>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Madruga Dashboard · dados reais Instagram API + Claude AI</p>
        <p style={{ fontFamily:FONT, fontSize:8, color:C.lighter, margin:0 }}>Confidencial</p>
      </div>
    </div>
  );
}
