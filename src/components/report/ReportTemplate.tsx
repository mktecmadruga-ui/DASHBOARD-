"use client";

/**
 * A4 PDF Report Template — renders off-screen, captured page-by-page with html2canvas.
 * 794px wide × 1123px tall = A4 at 96dpi.
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

const A4 = { width: 794, height: 1123 };
const PURPLE = "#7B61FF";
const DARK   = "#0F172A";
const LIGHT  = "#64748B";
const BG     = "#F8F9FF";

// ─── Shared header strip ─────────────────────────────────────────────────────
function PageHeader({ data, page, total }: { data: ReportData; page: number; total: number }) {
  const date = new Date(data.generatedAt).toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:16, marginBottom:24, borderBottom:`1px solid #E2E8F0` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${PURPLE},#9B8CFF)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:"white", fontWeight:800, fontSize:13 }}>M</span>
        </div>
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:DARK, margin:0 }}>@{data.profile.username}</p>
          <p style={{ fontSize:9, color:LIGHT, margin:0 }}>Relatório · últimos {data.days} dias · {date}</p>
        </div>
      </div>
      <p style={{ fontSize:9, color:"#94A3B8", margin:0 }}>{page}/{total}</p>
    </div>
  );
}

// ─── Page 1: Cover + KPIs ─────────────────────────────────────────────────────
export function ReportPage1({ data }: { data: ReportData }) {
  const t = data.totals;
  const kpis = [
    { label:"Seguidores",       value: formatNumber(data.profile.followers_count) },
    { label:"Curtidas",         value: formatNumber(t?.likes??0)                  },
    { label:"Comentários",      value: formatNumber(t?.comments??0)               },
    { label:"Compartilhamentos",value: formatNumber(t?.shares??0)                 },
    { label:"Salvamentos",      value: formatNumber(t?.saves??0)                  },
    { label:"Visitas ao Perfil",value: formatNumber(t?.profile_views??0)          },
    { label:"Taxa Engajamento",  value: `${data.computed.engRate}%`               },
    { label:"Posts no Período",  value: String(data.computed.totalPosts)          },
  ];

  return (
    <div id="report-p1" style={{ width:A4.width, minHeight:A4.height, background:"white", fontFamily:"system-ui,sans-serif", padding:"40px 48px", boxSizing:"border-box", position:"relative", overflow:"hidden" }}>
      {/* Decorative gradient blob */}
      <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320, borderRadius:"50%", background:`radial-gradient(circle,${PURPLE}18,transparent 70%)`, pointerEvents:"none" }} />

      {/* Cover hero */}
      <div style={{ marginBottom:40, paddingBottom:32, borderBottom:"1px solid #F1F5F9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:16, background:`linear-gradient(135deg,${PURPLE},#9B8CFF)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ color:"white", fontWeight:800, fontSize:22 }}>{data.profile.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:DARK, margin:0, letterSpacing:-0.5 }}>{data.profile.name}</h1>
            <p style={{ fontSize:13, color:LIGHT, margin:"2px 0 0" }}>@{data.profile.username}</p>
          </div>
        </div>

        <div style={{ background:BG, borderRadius:16, padding:"16px 20px", border:"1px solid #EEF2FF" }}>
          <p style={{ fontSize:11, color:LIGHT, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Período analisado</p>
          <p style={{ fontSize:16, fontWeight:700, color:DARK, margin:0 }}>Últimos {data.days} dias · {new Date(data.generatedAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</p>
        </div>
      </div>

      {/* Resumo executivo */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>Resumo Executivo</h2>
        <p style={{ fontSize:12, lineHeight:1.7, color:"#334155", margin:0, background:"#F8F9FF", borderLeft:`3px solid ${PURPLE}`, padding:"12px 16px", borderRadius:"0 10px 10px 0" }}>
          {data.narrative.resumo}
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Métricas do Período</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background:BG, borderRadius:12, padding:"14px 16px", border:"1px solid #EEF2FF" }}>
              <p style={{ fontSize:18, fontWeight:800, color:DARK, margin:"0 0 3px", letterSpacing:-0.5 }}>{k.value}</p>
              <p style={{ fontSize:9, color:LIGHT, margin:0, textTransform:"uppercase", letterSpacing:0.5, fontWeight:600 }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Destaques */}
      <div>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 12px" }}>Destaques</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.narrative.destaques.map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#F0FDF4", borderRadius:10, padding:"10px 14px", border:"1px solid #DCFCE7" }}>
              <span style={{ color:"#22C55E", fontWeight:800, fontSize:12, flexShrink:0, marginTop:1 }}>✓</span>
              <p style={{ fontSize:11, color:"#166534", margin:0, lineHeight:1.5 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:28, left:48, right:48, display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #F1F5F9", paddingTop:12 }}>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>Gerado via Madruga Dashboard · dados reais Instagram API</p>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>1/3</p>
      </div>
    </div>
  );
}

// ─── Page 2: Content Performance + Top Posts ──────────────────────────────────
export function ReportPage2({ data }: { data: ReportData }) {
  const c = data.computed;
  const formats = [
    { label:"Reels",      count:c.reelsCount,  avg:c.reelsAvg,  color:PURPLE       },
    { label:"Carrosséis", count:c.carrosCount, avg:c.carrosAvg, color:"#3B82F6"    },
    { label:"Fotos",      count:c.imagesCount, avg:c.imagesAvg, color:"#22C55E"    },
  ];
  const maxAvg = Math.max(c.reelsAvg, c.carrosAvg, c.imagesAvg, 1);

  return (
    <div id="report-p2" style={{ width:A4.width, minHeight:A4.height, background:"white", fontFamily:"system-ui,sans-serif", padding:"40px 48px", boxSizing:"border-box", position:"relative" }}>
      <PageHeader data={data} page={2} total={3} />

      {/* Format performance */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Performance por Formato</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
          {formats.map(f => (
            <div key={f.label} style={{ background:BG, borderRadius:14, padding:"16px 18px", border:"1px solid #EEF2FF", textAlign:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:f.color+"20", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                <span style={{ fontSize:18 }}>{f.label==="Reels"?"▶":f.label==="Carrosséis"?"◫":"🖼"}</span>
              </div>
              <p style={{ fontSize:22, fontWeight:800, color:DARK, margin:"0 0 2px", letterSpacing:-0.5 }}>{f.count}</p>
              <p style={{ fontSize:9, color:LIGHT, margin:"0 0 10px", textTransform:"uppercase", letterSpacing:0.5 }}>posts publicados</p>
              <div style={{ background:"#F1F5F9", borderRadius:6, height:6, marginBottom:6 }}>
                <div style={{ background:f.color, borderRadius:6, height:6, width:`${Math.round(f.avg/maxAvg*100)}%`, minWidth:f.avg>0?8:0 }} />
              </div>
              <p style={{ fontSize:11, color:DARK, margin:0, fontWeight:700 }}>{formatNumber(f.avg)} <span style={{ fontSize:9, color:LIGHT, fontWeight:400 }}>interações/post</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Top posts */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Top 5 Posts</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.media.map((post,i) => {
            const type = post.media_type==="VIDEO"?"Reel":post.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Foto";
            const eng  = formatNumber(post.like_count + post.comments_count);
            const cap  = (post.caption??"").slice(0,70) + ((post.caption?.length??0)>70?"…":"");
            return (
              <div key={post.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, background:i===0?"#F5F3FF":"#FAFAFA", border:`1px solid ${i===0?"#DDD6FE":"#F1F5F9"}` }}>
                <div style={{ width:28, height:28, borderRadius:8, background:i===0?PURPLE:"#E2E8F0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:i===0?"white":"#64748B", fontWeight:800, fontSize:11 }}>#{i+1}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, color:DARK, margin:"0 0 2px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {cap || "Sem legenda"}
                  </p>
                  <p style={{ fontSize:9, color:LIGHT, margin:0 }}>
                    {type} · {new Date(post.timestamp).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
                  </p>
                </div>
                <div style={{ display:"flex", gap:12, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:"#EF4444", fontWeight:700 }}>❤ {formatNumber(post.like_count)}</span>
                  <span style={{ fontSize:11, color:"#3B82F6", fontWeight:700 }}>💬 {formatNumber(post.comments_count)}</span>
                  <span style={{ fontSize:11, color:LIGHT, fontWeight:600 }}>Σ {eng}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 12px" }}>Oportunidades Identificadas</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {data.narrative.oportunidades.map((o,i) => (
            <div key={i} style={{ background:"#FFFBEB", borderRadius:10, padding:"12px 14px", border:"1px solid #FEF3C7" }}>
              <p style={{ fontSize:10, color:"#92400E", margin:0, lineHeight:1.5 }}>→ {o}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:"absolute", bottom:28, left:48, right:48, display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #F1F5F9", paddingTop:12 }}>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>Gerado via Madruga Dashboard · dados reais Instagram API</p>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>2/3</p>
      </div>
    </div>
  );
}

// ─── Page 3: Audience + Recommendations ──────────────────────────────────────
export function ReportPage3({ data }: { data: ReportData }) {
  const maxCity = data.audience.cities[0]?.value || 1;

  return (
    <div id="report-p3" style={{ width:A4.width, minHeight:A4.height, background:"white", fontFamily:"system-ui,sans-serif", padding:"40px 48px", boxSizing:"border-box", position:"relative" }}>
      <PageHeader data={data} page={3} total={3} />

      {/* Audience */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:32 }}>
        {/* Gender */}
        <div>
          <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Audiência — Gênero</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.audience.genderPct.map((g,i) => {
              const colors = [PURPLE,"#3B82F6","#22C55E"];
              return (
                <div key={g.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:DARK, fontWeight:600 }}>{g.label}</span>
                    <span style={{ fontSize:11, color:DARK, fontWeight:700 }}>{g.pct}%</span>
                  </div>
                  <div style={{ background:"#F1F5F9", borderRadius:4, height:8 }}>
                    <div style={{ background:colors[i]??PURPLE, borderRadius:4, height:8, width:`${g.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top cities */}
        <div>
          <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Top Cidades</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.audience.cities.map((c,i) => (
              <div key={c.name}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:10, color:DARK, fontWeight:600 }}>{i+1}. {c.name}</span>
                  <span style={{ fontSize:10, color:LIGHT }}>{c.value}</span>
                </div>
                <div style={{ background:"#F1F5F9", borderRadius:4, height:6 }}>
                  <div style={{ background:`linear-gradient(90deg,${PURPLE},#9B8CFF)`, borderRadius:4, height:6, width:`${Math.round(c.value/maxCity*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Countries */}
      {data.audience.countries.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 12px" }}>Países</h2>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {data.audience.countries.map(c => (
              <span key={c.code} style={{ background:BG, border:"1px solid #EEF2FF", borderRadius:8, padding:"6px 12px", fontSize:11, color:DARK, fontWeight:600 }}>
                {c.code} · {c.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div style={{ marginBottom:32 }}>
        <h2 style={{ fontSize:13, fontWeight:700, color:PURPLE, textTransform:"uppercase", letterSpacing:1, margin:"0 0 14px" }}>Recomendações Estratégicas</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.narrative.recomendacoes.map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, background:BG, borderRadius:12, padding:"14px 16px", border:"1px solid #EEF2FF" }}>
              <div style={{ width:24, height:24, borderRadius:8, background:`linear-gradient(135deg,${PURPLE},#9B8CFF)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"white", fontWeight:800, fontSize:10 }}>{i+1}</span>
              </div>
              <p style={{ fontSize:11, color:"#334155", margin:0, lineHeight:1.6 }}>{r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      {data.profile.biography && (
        <div style={{ background:"#F8FAFC", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
          <p style={{ fontSize:9, color:LIGHT, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:0.5, fontWeight:600 }}>Bio do perfil</p>
          <p style={{ fontSize:11, color:"#475569", margin:0, lineHeight:1.5 }}>{data.profile.biography}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ position:"absolute", bottom:28, left:48, right:48, display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #F1F5F9", paddingTop:12 }}>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>Gerado via Madruga Dashboard · dados reais Instagram API + Claude AI</p>
        <p style={{ fontSize:9, color:"#CBD5E1", margin:0 }}>3/3</p>
      </div>
    </div>
  );
}
