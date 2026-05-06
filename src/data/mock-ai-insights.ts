import type { AIInsight, AlertItem } from "@/types";

export const aiInsights: AIInsight[] = [
  {
    id: "ai1",
    titulo: "Melhor horário para postar",
    descricao: "Seus Reels publicados entre 19h-21h têm 47% mais engajamento. Considere concentrar publicações nesse período.",
    tipo: "horario",
    confianca: 94,
    impacto: "alto",
  },
  {
    id: "ai2",
    titulo: "Duração ideal de Reels",
    descricao: "Reels entre 15-25 segundos têm retenção 3.2x maior que vídeos longos. Seu sweet spot é 18 segundos.",
    tipo: "formato",
    confianca: 89,
    impacto: "alto",
  },
  {
    id: "ai3",
    titulo: "Hooks que convertem",
    descricao: "Vídeos que começam com pergunta retêm 78% da audiência nos 3 primeiros segundos vs 52% com intros genéricas.",
    tipo: "conteudo",
    confianca: 87,
    impacto: "alto",
  },
  {
    id: "ai4",
    titulo: "Frequência de postagem",
    descricao: "Sua taxa ideal é 5-6 posts/semana. Acima disso, o engajamento por post cai 15%. Stories diários mantêm a audiência ativa.",
    tipo: "frequencia",
    confianca: 82,
    impacto: "medio",
  },
  {
    id: "ai5",
    titulo: "CTAs mais eficazes",
    descricao: "CTAs com 'Salve para depois' geram 2.8x mais salvamentos que 'Curta e compartilhe'. Salvamentos impulsionam o algoritmo.",
    tipo: "conteudo",
    confianca: 91,
    impacto: "alto",
  },
];

export const smartAlerts: AlertItem[] = [
  {
    id: "a1",
    titulo: "Reel viral detectado! 🔥",
    descricao: "\"Ferramentas de IA para criadores\" ultrapassou 800K views em 5 dias — 3.4x acima da sua média.",
    tipo: "viral",
    tempo: "2h atrás",
  },
  {
    id: "a2",
    titulo: "Queda no alcance de Stories",
    descricao: "Alcance de Stories caiu 18% esta semana. Considere usar mais enquetes e stickers interativos.",
    tipo: "queda",
    tempo: "5h atrás",
  },
  {
    id: "a3",
    titulo: "Pico de novos seguidores",
    descricao: "+2.400 seguidores nas últimas 24h — provavelmente impulsionado pelo Reel viral.",
    tipo: "crescimento",
    tempo: "1d atrás",
  },
  {
    id: "a4",
    titulo: "Retenção em queda nos Reels",
    descricao: "A retenção média caiu de 72% para 65% nos últimos 7 dias. Revise os hooks dos últimos vídeos.",
    tipo: "atencao",
    tempo: "2d atrás",
  },
];
