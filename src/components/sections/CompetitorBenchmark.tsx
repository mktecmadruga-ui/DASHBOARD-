"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAccount } from "@/context/AccountContext";
import { formatNumber } from "@/lib/utils";
import { X, ExternalLink, TrendingUp, Users, Heart, Image, Play, Layers } from "lucide-react";

interface Competitor {
  usuario: string;
  nome: string;
  seguidores: number;
  engajamento: number;
  frequencia: number;
  crescimento: number;
  nicho: string;
  bio: string;
  tipoConteudo: string[];
  pontosFortes: string[];
  oportunidades: string[];
  mediaLikes: number;
  mediaComentarios: number;
  postsMes: number;
}

const competitors: Competitor[] = [
  {
    usuario: "@oliviasensata",
    nome: "Olívia Sensata",
    seguidores: 1800000,
    engajamento: 3.8,
    frequencia: 7,
    crescimento: 4.2,
    nicho: "Finanças Pessoais",
    bio: "Educação financeira para quem quer crescer sem enrolação. Mais de 1,8M aprendendo juntos.",
    tipoConteudo: ["Reels", "Carrosséis", "Stories"],
    pontosFortes: ["Tom direto e acessível ao iniciante", "Consistência diária de publicações", "Alta interação nos comentários", "Pauta fiscal e pessoal bem equilibrada"],
    oportunidades: ["Pouco conteúdo específico sobre MEI e autônomos", "Lacuna em contabilidade empresarial para PMEs"],
    mediaLikes: 12400,
    mediaComentarios: 820,
    postsMes: 28,
  },
  {
    usuario: "@contadorrevoltado",
    nome: "Contador Revoltado",
    seguidores: 520000,
    engajamento: 6.1,
    frequencia: 5,
    crescimento: 8.7,
    nicho: "Contabilidade & Impostos",
    bio: "Contador que fala o que ninguém tem coragem. Impostos, burocracia e como sobreviver ao Brasil.",
    tipoConteudo: ["Reels", "Feed", "Stories"],
    pontosFortes: ["Posicionamento opinativo gera alto compartilhamento", "Humor como diferencial de marca", "Reels virais sobre tributação", "Comunidade engajada nos comentários"],
    oportunidades: ["Conteúdo técnico sobre Simples Nacional pouco explorado", "Público empresarial quase inexistente no perfil"],
    mediaLikes: 8200,
    mediaComentarios: 1100,
    postsMes: 20,
  },
  {
    usuario: "@diegomontalvao",
    nome: "Diego Montalvão",
    seguidores: 380000,
    engajamento: 5.4,
    frequencia: 4,
    crescimento: 6.3,
    nicho: "Contabilidade Empresarial",
    bio: "Simplificando a contabilidade para empresários. Gestão, impostos e crescimento de negócios.",
    tipoConteudo: ["Reels", "Carrosséis", "Lives"],
    pontosFortes: ["Autoridade consolidada em contabilidade empresarial", "Linguagem técnica mas acessível", "Lives frequentes gerando comunidade ativa"],
    oportunidades: ["Frequência de Reels abaixo do ideal — menos de 1/semana", "Stories com baixa interação e poucos CTAs"],
    mediaLikes: 5600,
    mediaComentarios: 340,
    postsMes: 16,
  },
];

function CompetitorModal({ comp, myData, onClose }: { comp: Competitor; myData: { seguidores: number; engajamento: number }; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto z-10"
        >
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-6 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold flex-shrink-0">
              {comp.usuario.charAt(1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-text-dark">{comp.nome}</h3>
              <p className="text-xs text-text-light">{comp.usuario} · {comp.nicho}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://instagram.com/${comp.usuario.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-text-medium" />
              </a>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-text-medium" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <p className="text-xs text-text-medium leading-relaxed italic">&ldquo;{comp.bio}&rdquo;</p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Seguidores", value: formatNumber(comp.seguidores), Icon: Users, color: "text-primary bg-primary/10" },
                { label: "Engajamento", value: `${comp.engajamento}%`, Icon: Heart, color: "text-danger bg-danger/10" },
                { label: "Posts/mês", value: String(comp.postsMes), Icon: Image, color: "text-info bg-info/10" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-2xl bg-slate-50 text-center">
                  <div className={`w-8 h-8 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <stat.Icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-text-dark">{stat.value}</p>
                  <p className="text-[10px] text-text-light">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-2xl bg-danger/5 border border-danger/10 text-center">
                <p className="text-sm font-bold text-text-dark">{formatNumber(comp.mediaLikes)}</p>
                <p className="text-[10px] text-text-light">méd. curtidas/post</p>
              </div>
              <div className="flex-1 p-3 rounded-2xl bg-info/5 border border-info/10 text-center">
                <p className="text-sm font-bold text-text-dark">{formatNumber(comp.mediaComentarios)}</p>
                <p className="text-[10px] text-text-light">méd. comentários/post</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-medium mb-2 uppercase tracking-wide">Formatos usados</p>
              <div className="flex flex-wrap gap-2">
                {comp.tipoConteudo.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
              <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Você vs {comp.nome}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-medium">Seguidores</span>
                  <span className="text-text-dark">{formatNumber(myData.seguidores)} vs {formatNumber(comp.seguidores)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-medium">Engajamento</span>
                  <span className={myData.engajamento >= comp.engajamento ? "text-success font-semibold" : "text-danger font-semibold"}>
                    {myData.engajamento.toFixed ? myData.engajamento.toFixed(1) : myData.engajamento}% vs {comp.engajamento}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <p className="text-xs font-semibold text-text-dark">O que ele faz bem</p>
              </div>
              <div className="space-y-1.5">
                {comp.pontosFortes.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-text-medium"><span className="text-success mt-0.5">✓</span>{p}</div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-warning" />
                <p className="text-xs font-semibold text-text-dark">Lacunas que você pode explorar</p>
              </div>
              <div className="space-y-1.5">
                {comp.oportunidades.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-text-medium"><span className="text-warning mt-0.5">→</span>{o}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function CompetitorBenchmark() {
  const { account } = useAccount();
  const [selected, setSelected] = useState<Competitor | null>(null);
  const mySeguidores = account.kpis[0]?.valor ?? 0;
  const myEngajamento = account.kpis[5]?.valor ?? 0;

  return (
    <>
      <Card className="col-span-4" delay={0.65}>
        <h3 className="text-lg font-semibold text-text-dark mb-1">Benchmark</h3>
        <p className="text-sm text-text-light mb-4">Clique para análise detalhada</p>

        <div className="p-3 rounded-2xl bg-primary/8 border border-primary/20 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
                {account.usuario.charAt(1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary">{account.usuario}</p>
                <span className="text-[10px] text-primary/70">Você</span>
              </div>
            </div>
            <Badge value={3.2} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-xs font-semibold text-text-dark">{formatNumber(mySeguidores)}</p><p className="text-[10px] text-text-light">Seguidores</p></div>
            <div><p className="text-xs font-semibold text-text-dark">{typeof myEngajamento === "number" ? myEngajamento.toFixed(1) : myEngajamento}%</p><p className="text-[10px] text-text-light">Engajamento</p></div>
            <div><p className="text-xs font-semibold text-text-dark">{account.id === "william" ? "5x/sem" : "3x/sem"}</p><p className="text-[10px] text-text-light">Frequência</p></div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {competitors.map((comp) => (
            <button key={comp.usuario} type="button" onClick={() => setSelected(comp)}
              className="w-full text-left p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                    {comp.usuario.charAt(1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-dark group-hover:text-primary transition-colors">{comp.usuario}</p>
                    <p className="text-[10px] text-text-light">{comp.nicho}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge value={comp.crescimento} />
                  <Layers className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs font-semibold text-text-dark">{formatNumber(comp.seguidores)}</p><p className="text-[10px] text-text-light">Seguidores</p></div>
                <div><p className="text-xs font-semibold text-text-dark">{comp.engajamento}%</p><p className="text-[10px] text-text-light">Engajamento</p></div>
                <div><p className="text-xs font-semibold text-text-dark">{comp.frequencia}x/sem</p><p className="text-[10px] text-text-light">Frequência</p></div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {selected && <CompetitorModal comp={selected} myData={{ seguidores: mySeguidores, engajamento: myEngajamento }} onClose={() => setSelected(null)} />}
    </>
  );
}
