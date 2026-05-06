"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import { useAccount } from "@/context/AccountContext";
import { Zap, TrendingDown, TrendingUp, AlertTriangle, Loader2, X, ChevronRight, Target, Lightbulb, BarChart2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { InstagramMedia } from "@/lib/instagram-api";

interface Alert {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "viral" | "queda" | "crescimento" | "atencao";
  tempo: string;
  // detail
  metricas?: { label: string; valor: string }[];
  acoes?: string[];
  aprendizado?: string;
}

const iconMap   = { viral: Zap, queda: TrendingDown, crescimento: TrendingUp, atencao: AlertTriangle };
const colorMap  = {
  viral:       "text-primary bg-primary/10",
  queda:       "text-danger bg-danger/10",
  crescimento: "text-success bg-success/10",
  atencao:     "text-warning bg-warning/10",
};
const borderMap = {
  viral:       "border-primary/20 bg-primary/3",
  queda:       "border-danger/20 bg-danger/3",
  crescimento: "border-success/20 bg-success/3",
  atencao:     "border-warning/20 bg-warning/3",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "há menos de 1h";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

function AlertModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const Icon = iconMap[alert.tipo];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
        className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.16)] border border-slate-100">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-50 flex-shrink-0">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", colorMap[alert.tipo])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-dark leading-tight">{alert.titulo}</h3>
            <p className="text-xs text-text-light mt-0.5">{alert.tempo}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
            <X className="w-4 h-4 text-text-medium" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Descrição */}
          <p className="text-sm text-text-medium leading-relaxed">{alert.descricao}</p>

          {/* Métricas */}
          {alert.metricas && alert.metricas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-text-dark">Dados do alerta</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {alert.metricas.map((m, i) => (
                  <div key={i} className={cn("p-3 rounded-2xl border", borderMap[alert.tipo])}>
                    <p className="text-xs text-text-light">{m.label}</p>
                    <p className="text-sm font-bold text-text-dark mt-0.5">{m.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aprendizado */}
          {alert.aprendizado && (
            <div className={cn("flex items-start gap-3 p-4 rounded-2xl border", borderMap[alert.tipo])}>
              <Target className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: alert.tipo === "queda" ? "#FF5A5F" : alert.tipo === "viral" ? "#7B61FF" : alert.tipo === "crescimento" ? "#22C55E" : "#FFB800" }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: alert.tipo === "queda" ? "#FF5A5F" : alert.tipo === "viral" ? "#7B61FF" : alert.tipo === "crescimento" ? "#22C55E" : "#FFB800" }}>
                  O que isso significa
                </p>
                <p className="text-xs text-text-medium leading-relaxed">{alert.aprendizado}</p>
              </div>
            </div>
          )}

          {/* Ações */}
          {alert.acoes && alert.acoes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-warning" />
                <h4 className="text-sm font-semibold text-text-dark">O que fazer agora</h4>
              </div>
              <div className="space-y-2">
                {alert.acoes.map((acao, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs text-text-medium leading-relaxed flex-1">{acao}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function generateAlerts(posts: InstagramMedia[], followers: number): Alert[] {
  if (!posts.length) return [];
  const alerts: Alert[] = [];
  const totalLikes    = posts.reduce((s, p) => s + p.like_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);
  const avgLikes    = totalLikes / posts.length;
  const avgComments = totalComments / posts.length;
  const sorted = [...posts].sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count));
  const top    = sorted[0];
  const worst  = sorted[sorted.length - 1];
  const engRate = ((avgLikes + avgComments) / Math.max(followers, 1)) * 100;

  // 1. Post viral / alto desempenho
  if (top && (top.like_count + top.comments_count) > (avgLikes + avgComments) * 1.6) {
    const ratio = ((top.like_count + top.comments_count) / Math.max(avgLikes + avgComments, 1)).toFixed(1);
    const topEng = ((top.like_count + top.comments_count) / followers * 100).toFixed(1);
    alerts.push({
      id: "a1",
      titulo: top.media_type === "VIDEO" ? "🔥 Reel com desempenho excepcional" : "🔥 Post viral detectado",
      descricao: `"${(top.caption ?? "sem legenda").slice(0, 60)}…" está ${ratio}× acima da sua média de engajamento.`,
      tipo: "viral",
      tempo: relativeTime(top.timestamp),
      metricas: [
        { label: "Curtidas",           valor: formatNumber(top.like_count) },
        { label: "Comentários",        valor: formatNumber(top.comments_count) },
        { label: "Engajamento",        valor: `${topEng}%` },
        { label: "vs. média",          valor: `${ratio}×` },
      ],
      aprendizado: `Esse ${top.media_type === "VIDEO" ? "Reel" : "post"} ressoou muito acima da média. O algoritmo do Instagram vai continuar distribuindo esse conteúdo organicamente nas próximas horas — responda todos os comentários rapidamente para amplificar o alcance.`,
      acoes: [
        "Responda TODOS os comentários nas próximas 2 horas para sinalizar engajamento ao algoritmo",
        "Identifique o que funcionou: gancho, formato, horário ou tema — e replique",
        "Crie um post de follow-up sobre o mesmo tema para surfar o momento",
        "Compartilhe nos Stories com CTA para salvar e compartilhar",
        "Salve as métricas para comparar nos próximos conteúdos similares",
      ],
    });
  }

  // 2. Engajamento acima da média (post recente)
  const recentGood = posts.slice(0, 5).find(p => p.like_count > avgLikes * 1.2 && p.id !== top?.id);
  if (recentGood) {
    const diff = Math.round((recentGood.like_count / Math.max(avgLikes, 1) - 1) * 100);
    alerts.push({
      id: "a2",
      titulo: "📈 Engajamento acima da média",
      descricao: `Seu ${recentGood.media_type === "VIDEO" ? "Reel" : recentGood.media_type === "CAROUSEL_ALBUM" ? "carrossel" : "post"} recente teve ${diff}% mais curtidas que o habitual.`,
      tipo: "crescimento",
      tempo: relativeTime(recentGood.timestamp),
      metricas: [
        { label: "Curtidas",     valor: formatNumber(recentGood.like_count) },
        { label: "Comentários",  valor: formatNumber(recentGood.comments_count) },
        { label: "Média curtidas", valor: formatNumber(Math.round(avgLikes)) },
        { label: "Variação",     valor: `+${diff}%` },
      ],
      aprendizado: "Posts que superam a média sinalizam ao algoritmo que seu conteúdo é relevante, aumentando o alcance orgânico dos próximos posts nas próximas 24-48h.",
      acoes: [
        "Analise o que esse post tem de diferente: hook, tema, horário ou formato",
        "Publique conteúdo no mesmo tema nos próximos 3 dias para aproveitar o momentum",
        "Adicione um Stories perguntando o que seu público quer ver mais",
        "Use o mesmo estilo de legenda ou CTA nos próximos posts",
      ],
    });
  }

  // 3. Post com baixo engajamento
  if (worst && (worst.like_count + worst.comments_count) < (avgLikes + avgComments) * 0.4 && worst.id !== top?.id) {
    const worstEng = ((worst.like_count + worst.comments_count) / followers * 100).toFixed(1);
    alerts.push({
      id: "a3",
      titulo: "⚠️ Post com baixo desempenho",
      descricao: `"${(worst.caption ?? "sem legenda").slice(0, 55)}…" teve performance abaixo do esperado.`,
      tipo: "queda",
      tempo: relativeTime(worst.timestamp),
      metricas: [
        { label: "Curtidas",         valor: formatNumber(worst.like_count) },
        { label: "Comentários",      valor: formatNumber(worst.comments_count) },
        { label: "Engajamento",      valor: `${worstEng}%` },
        { label: "vs. média",        valor: `${((worst.like_count + worst.comments_count) / Math.max(avgLikes + avgComments, 1) * 100).toFixed(0)}%` },
      ],
      aprendizado: "Posts com baixo engajamento nas primeiras horas ficam com distribuição orgânica reduzida. Identifique o problema antes de publicar conteúdo similar.",
      acoes: [
        "Verifique o horário — publicar fora do pico pode reduzir o alcance em até 50%",
        "Revise o hook: os primeiros 3 segundos (Reel) ou primeira linha (feed) são decisivos",
        "Adicione um CTA direto nos Stories apontando para esse post para reativar o alcance",
        "Teste o mesmo conteúdo com um título diferente na próxima semana",
        "Evite publicar no mesmo horário e dia da semana deste post",
      ],
    });
  }

  // 4. Taxa de engajamento geral
  if (engRate > 4) {
    alerts.push({
      id: "a4",
      titulo: "🎯 Taxa de engajamento excelente",
      descricao: `Média de ${engRate.toFixed(1)}% — muito acima da média do Instagram (1-3%).`,
      tipo: "crescimento",
      tempo: "análise geral",
      metricas: [
        { label: "Sua taxa",        valor: `${engRate.toFixed(1)}%` },
        { label: "Média Instagram", valor: "1–3%" },
        { label: "Sua categoria",   valor: "Top 10%" },
        { label: "Total posts",     valor: `${posts.length}` },
      ],
      aprendizado: "Uma taxa de engajamento acima de 4% é excelente e indica que seu conteúdo é altamente relevante para seu público. Isso atrai parceiros comerciais e melhora o alcance orgânico.",
      acoes: [
        "Mantenha a consistência de publicação — a queda de frequência é o principal risco",
        "Documente o que está funcionando: formato, horário, tipo de conteúdo",
        "Explore parcerias e collabs com contas do mesmo nicho para crescer",
        "Considere monetizar o canal — essa taxa de eng. é atrativa para anunciantes",
      ],
    });
  } else if (engRate < 1) {
    alerts.push({
      id: "a4",
      titulo: "⚠️ Engajamento abaixo da média",
      descricao: `Taxa de ${engRate.toFixed(1)}% está abaixo do esperado para contas do seu nicho.`,
      tipo: "atencao",
      tempo: "análise geral",
      metricas: [
        { label: "Sua taxa",        valor: `${engRate.toFixed(1)}%` },
        { label: "Benchmark",       valor: "2–5%" },
        { label: "Diferença",       valor: `-${(2 - engRate).toFixed(1)}pp` },
        { label: "Seguidores",      valor: formatNumber(followers) },
      ],
      aprendizado: "Engajamento baixo pode indicar público desalinhado, conteúdo pouco relevante, horários inadequados ou falta de CTAs. É possível melhorar com ajustes pontuais.",
      acoes: [
        "Faça enquetes nos Stories para entender o que seu público quer ver",
        "Adicione perguntas diretas ao final de cada post (ex: 'Você já passou por isso?')",
        "Teste publicar nos horários de pico: geralmente 7h-9h e 19h-21h",
        "Use a fórmula: Problema → Agitação → Solução nos primeiros 3 segundos",
        "Revise as hashtags — use entre 5-10 tags específicas do nicho",
      ],
    });
  }

  // 5. Frequência de publicação
  if (posts.length >= 2) {
    const daysRange = Math.max(1, Math.round((Date.now() - new Date(posts[posts.length - 1].timestamp).getTime()) / 86400000));
    const freq = (posts.length / daysRange) * 7;
    if (freq < 2.5) {
      alerts.push({
        id: "a5",
        titulo: "📅 Frequência de publicação baixa",
        descricao: `Publicando ~${freq.toFixed(1)}× por semana. Perfis ativos publicam 4-5× e crescem 2× mais rápido.`,
        tipo: "atencao",
        tempo: "análise semanal",
        metricas: [
          { label: "Sua frequência", valor: `${freq.toFixed(1)}×/sem` },
          { label: "Recomendado",    valor: "4–5×/sem" },
          { label: "Posts analisados", valor: `${posts.length}` },
          { label: "Período",        valor: `${daysRange} dias` },
        ],
        aprendizado: "O algoritmo do Instagram favorece perfis que publicam consistentemente. Abaixo de 3 posts por semana, o alcance orgânico cai progressivamente.",
        acoes: [
          "Grave conteúdo em lote: reserve 2h por semana para gravar 5-6 Reels de uma vez",
          "Use o Calendário de Conteúdo para planejar pautas com 2 semanas de antecedência",
          "Transforme 1 Reel em 3 formatos: Reel + Carrossel + Story",
          "Stories diários são mais fáceis de manter — bastidores, perguntas rápidas",
          "Defina uma grade fixa: ex. Reel Ter/Qui/Sáb, Feed Seg/Qua, Stories todos os dias",
        ],
      });
    }
  }

  return alerts.slice(0, 5);
}

export default function SmartAlerts() {
  const { account } = useAccount();
  const slug = account.id === "william" ? "william" : "madruga";
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Alert | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/instagram/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.media && data.profile) {
          setAlerts(generateAlerts(data.media, data.profile.followers_count));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <>
      <Card delay={0.3}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">Alertas Inteligentes</h3>
            <p className="text-xs text-text-light mt-0.5">Clique para ver análise completa</p>
          </div>
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </div>

        <div className="flex flex-col gap-2.5">
          {alerts.map((alert, i) => {
            const Icon = iconMap[alert.tipo];
            return (
              <motion.button key={alert.id} type="button" onClick={() => setSelected(alert)}
                initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={cn("flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left w-full hover:shadow-sm group", borderMap[alert.tipo])}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", colorMap[alert.tipo])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-dark">{alert.titulo}</p>
                  <p className="text-xs text-text-light mt-0.5 line-clamp-2">{alert.descricao}</p>
                  <p className="text-[10px] text-text-light/60 mt-1">{alert.tempo}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </motion.button>
            );
          })}
          {!loading && alerts.length === 0 && (
            <p className="text-sm text-text-light text-center py-4">Nenhum alerta no momento.</p>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {selected && <AlertModal alert={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
