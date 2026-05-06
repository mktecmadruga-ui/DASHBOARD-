import type { KPI, GrowthData, AIInsight, AlertItem } from "@/types";

export type AccountId = "william" | "escritorio";

export interface Account {
  id: AccountId;
  nome: string;
  nomeCompleto: string;
  usuario: string;
  avatar: string;
  cor: string;
  nicho: string;
  kpis: KPI[];
  growth30: GrowthData[];
  growth90: GrowthData[];
  growth6m: GrowthData[];
  insights: AIInsight[];
  alertas: AlertItem[];
}

// ─── @williamnmadruga ────────────────────────────────────────────────────────
const williamKpis: KPI[] = [
  { label: "Seguidores",          valor: 2605,   variacao:  3.2,  periodo: "mês",    icon: "users",    formato: "numero" },
  { label: "Posts Publicados",    valor: 203,    variacao:  2.0,  periodo: "mês",    icon: "trending", formato: "numero" },
  { label: "Alcance",             valor: 18400,  variacao: 12.5,  periodo: "semana", icon: "eye",      formato: "numero" },
  { label: "Impressões",          valor: 31200,  variacao:  8.1,  periodo: "semana", icon: "bar",      formato: "numero" },
  { label: "Views de Reels",      valor: 48600,  variacao: 18.3,  periodo: "mês",    icon: "play",     formato: "numero" },
  { label: "Taxa de Engajamento", valor: 9.75,   variacao:  0.3,  periodo: "mês",    icon: "heart",    formato: "porcentagem" },
  { label: "Compartilhamentos",   valor: 184,    variacao:  5.7,  periodo: "semana", icon: "share",    formato: "numero" },
  { label: "Salvamentos",         valor: 412,    variacao:  9.4,  periodo: "semana", icon: "bookmark", formato: "numero" },
];

const williamGrowth30: GrowthData[] = [
  { data: "06 Abr", seguidores: 2410, alcance: 16800, engajamento: 8.9 },
  { data: "09 Abr", seguidores: 2438, alcance: 17100, engajamento: 9.1 },
  { data: "12 Abr", seguidores: 2460, alcance: 17400, engajamento: 9.0 },
  { data: "15 Abr", seguidores: 2490, alcance: 17600, engajamento: 9.3 },
  { data: "18 Abr", seguidores: 2510, alcance: 17800, engajamento: 9.2 },
  { data: "21 Abr", seguidores: 2538, alcance: 18000, engajamento: 9.4 },
  { data: "24 Abr", seguidores: 2561, alcance: 18100, engajamento: 9.5 },
  { data: "27 Abr", seguidores: 2578, alcance: 18300, engajamento: 9.6 },
  { data: "30 Abr", seguidores: 2592, alcance: 18350, engajamento: 9.7 },
  { data: "05 Mai", seguidores: 2605, alcance: 18400, engajamento: 9.75 },
];

const williamGrowth90: GrowthData[] = [
  { data: "05 Fev", seguidores: 2180, alcance: 13200, engajamento: 7.8 },
  { data: "15 Fev", seguidores: 2220, alcance: 14100, engajamento: 8.1 },
  { data: "25 Fev", seguidores: 2268, alcance: 14800, engajamento: 8.2 },
  { data: "07 Mar", seguidores: 2310, alcance: 15500, engajamento: 8.4 },
  { data: "17 Mar", seguidores: 2350, alcance: 16000, engajamento: 8.6 },
  { data: "27 Mar", seguidores: 2390, alcance: 16500, engajamento: 8.8 },
  { data: "06 Abr", seguidores: 2410, alcance: 16800, engajamento: 8.9 },
  { data: "16 Abr", seguidores: 2490, alcance: 17600, engajamento: 9.3 },
  { data: "26 Abr", seguidores: 2578, alcance: 18300, engajamento: 9.6 },
  { data: "05 Mai", seguidores: 2605, alcance: 18400, engajamento: 9.75 },
];

const williamGrowth6m: GrowthData[] = [
  { data: "Nov", seguidores: 1820, alcance: 8900,  engajamento: 6.5 },
  { data: "Dez", seguidores: 1950, alcance: 10200, engajamento: 7.0 },
  { data: "Jan", seguidores: 2080, alcance: 11800, engajamento: 7.4 },
  { data: "Fev", seguidores: 2220, alcance: 14100, engajamento: 8.1 },
  { data: "Mar", seguidores: 2390, alcance: 16500, engajamento: 8.8 },
  { data: "Abr", seguidores: 2490, alcance: 17600, engajamento: 9.3 },
  { data: "Mai", seguidores: 2605, alcance: 18400, engajamento: 9.75 },
];

const williamInsights: AIInsight[] = [
  { id: "w1", titulo: "Melhor horário para postar", descricao: "Seus Reels publicados entre 19h–21h têm 47% mais engajamento. Agende seus próximos conteúdos nessa janela.", tipo: "horario", confianca: 94, impacto: "alto" },
  { id: "w2", titulo: "Duração ideal de Reels", descricao: "Reels entre 25–35 segundos têm taxa de conclusão 3.2× maior. Evite passar de 45 segundos.", tipo: "formato", confianca: 88, impacto: "alto" },
  { id: "w3", titulo: "Frequência de posts", descricao: "Postar 5–6× por semana mantém o alcance estável. Abaixo de 3× o algoritmo reduz distribuição.", tipo: "frequencia", confianca: 81, impacto: "medio" },
  { id: "w4", titulo: "Hooks que mais convertem", descricao: "Reels que começam com uma pergunta direta têm 2.8× mais salvamentos que outros formatos.", tipo: "conteudo", confianca: 76, impacto: "medio" },
];

const williamAlertas: AlertItem[] = [
  { id: "wa1", titulo: "Reel viral detectado 🔥", descricao: "Seu Reel 'Como escalar negócios' atingiu 420K views em 48h.", tipo: "viral", tempo: "2h atrás" },
  { id: "wa2", titulo: "Pico de seguidores", descricao: "+3.200 novos seguidores nas últimas 24h — acima da média.", tipo: "crescimento", tempo: "5h atrás" },
  { id: "wa3", titulo: "Queda de alcance", descricao: "Alcance dos Stories caiu 18% nos últimos 3 dias.", tipo: "queda", tempo: "1 dia atrás" },
  { id: "wa4", titulo: "Taxa de retenção baixa", descricao: "Último carrossel tem retenção de apenas 34% — abaixo da sua média de 58%.", tipo: "atencao", tempo: "2 dias atrás" },
];

// ─── @madrugacontabilidade ───────────────────────────────────────────────────
const escritorioKpis: KPI[] = [
  { label: "Seguidores",          valor: 1637,   variacao:  5.8,  periodo: "mês",    icon: "users",    formato: "numero" },
  { label: "Posts Publicados",    valor: 66,     variacao:  8.0,  periodo: "mês",    icon: "trending", formato: "numero" },
  { label: "Alcance",             valor: 9800,   variacao: 22.4,  periodo: "semana", icon: "eye",      formato: "numero" },
  { label: "Impressões",          valor: 18400,  variacao: 16.7,  periodo: "semana", icon: "bar",      formato: "numero" },
  { label: "Views de Reels",      valor: 22000,  variacao: 31.5,  periodo: "mês",    icon: "play",     formato: "numero" },
  { label: "Taxa de Engajamento", valor: 0.67,   variacao:  1.4,  periodo: "mês",    icon: "heart",    formato: "porcentagem" },
  { label: "Compartilhamentos",   valor: 64,     variacao: 12.3,  periodo: "semana", icon: "share",    formato: "numero" },
  { label: "Salvamentos",         valor: 148,    variacao: 18.9,  periodo: "semana", icon: "bookmark", formato: "numero" },
];

const escritorioGrowth30: GrowthData[] = [
  { data: "06 Abr", seguidores: 1548, alcance: 7800, engajamento: 0.55 },
  { data: "09 Abr", seguidores: 1560, alcance: 8100, engajamento: 0.58 },
  { data: "12 Abr", seguidores: 1571, alcance: 8400, engajamento: 0.60 },
  { data: "15 Abr", seguidores: 1582, alcance: 8600, engajamento: 0.61 },
  { data: "18 Abr", seguidores: 1595, alcance: 8800, engajamento: 0.62 },
  { data: "21 Abr", seguidores: 1604, alcance: 9100, engajamento: 0.63 },
  { data: "24 Abr", seguidores: 1616, alcance: 9300, engajamento: 0.65 },
  { data: "27 Abr", seguidores: 1624, alcance: 9500, engajamento: 0.66 },
  { data: "30 Abr", seguidores: 1630, alcance: 9680, engajamento: 0.67 },
  { data: "05 Mai", seguidores: 1637, alcance: 9800, engajamento: 0.67 },
];

const escritorioGrowth90: GrowthData[] = [
  { data: "05 Fev", seguidores: 1380, alcance: 5400, engajamento: 0.42 },
  { data: "15 Fev", seguidores: 1408, alcance: 5900, engajamento: 0.45 },
  { data: "25 Fev", seguidores: 1432, alcance: 6300, engajamento: 0.48 },
  { data: "07 Mar", seguidores: 1458, alcance: 6800, engajamento: 0.50 },
  { data: "17 Mar", seguidores: 1480, alcance: 7200, engajamento: 0.52 },
  { data: "27 Mar", seguidores: 1510, alcance: 7600, engajamento: 0.54 },
  { data: "06 Abr", seguidores: 1548, alcance: 7800, engajamento: 0.55 },
  { data: "16 Abr", seguidores: 1582, alcance: 8600, engajamento: 0.61 },
  { data: "26 Abr", seguidores: 1624, alcance: 9500, engajamento: 0.66 },
  { data: "05 Mai", seguidores: 1637, alcance: 9800, engajamento: 0.67 },
];

const escritorioGrowth6m: GrowthData[] = [
  { data: "Nov", seguidores: 1180, alcance: 3600, engajamento: 0.30 },
  { data: "Dez", seguidores: 1225, alcance: 4100, engajamento: 0.33 },
  { data: "Jan", seguidores: 1290, alcance: 4700, engajamento: 0.37 },
  { data: "Fev", seguidores: 1380, alcance: 5400, engajamento: 0.42 },
  { data: "Mar", seguidores: 1480, alcance: 7200, engajamento: 0.52 },
  { data: "Abr", seguidores: 1582, alcance: 8600, engajamento: 0.61 },
  { data: "Mai", seguidores: 1637, alcance: 9800, engajamento: 0.67 },
];

const escritorioInsights: AIInsight[] = [
  { id: "e1", titulo: "Conteúdo de imposto dá resultado", descricao: "Posts sobre IR e IRPF têm 4.1× mais salvamentos que outros temas. Explore pautas fiscais sazonais.", tipo: "conteudo", confianca: 96, impacto: "alto" },
  { id: "e2", titulo: "Melhor horário para o escritório", descricao: "Seu público B2B engaja mais entre 7h–9h e 12h–13h — horários de intervalo do trabalho.", tipo: "horario", confianca: 91, impacto: "alto" },
  { id: "e3", titulo: "Carrosséis educativos vencem", descricao: "Carrosséis com dicas práticas de contabilidade têm 5.6× mais compartilhamentos que Reels.", tipo: "formato", confianca: 87, impacto: "alto" },
  { id: "e4", titulo: "Aumente a frequência", descricao: "Contas contábeis que postam 4+ vezes por semana crescem 2× mais rápido no nicho B2B.", tipo: "frequencia", confianca: 79, impacto: "medio" },
];

const escritorioAlertas: AlertItem[] = [
  { id: "ea1", titulo: "Carrossel viral 🔥",    descricao: "Seu carrossel 'Simples Nacional 2026' teve 28K alcance — recorde do perfil.",    tipo: "viral",      tempo: "3h atrás" },
  { id: "ea2", titulo: "Crescimento acelerado", descricao: "+890 seguidores em 24h — 3× acima da média do perfil.",                          tipo: "crescimento", tempo: "6h atrás" },
  { id: "ea3", titulo: "Engajamento em alta",   descricao: "Taxa de engajamento chegou a 7.2% — top 5% do nicho contábil.",                  tipo: "crescimento", tempo: "1 dia atrás" },
  { id: "ea4", titulo: "Story sem resposta",    descricao: "Enquete do último Story teve apenas 12% de participação — abaixo da sua média.", tipo: "atencao",     tempo: "2 dias atrás" },
];

// ─── Mapa final ───────────────────────────────────────────────────────────────
export const accounts: Record<AccountId, Account> = {
  william: {
    id: "william",
    nome: "William",
    nomeCompleto: "William Madruga",
    usuario: "@williamnmadruga",
    avatar: "W",
    cor: "#7B61FF",
    nicho: "Negócios & Empreendedorismo",
    kpis:      williamKpis,
    growth30:  williamGrowth30,
    growth90:  williamGrowth90,
    growth6m:  williamGrowth6m,
    insights:  williamInsights,
    alertas:   williamAlertas,
  },
  escritorio: {
    id: "escritorio",
    nome: "Escritório",
    nomeCompleto: "Madruga Contabilidade",
    usuario: "@madrugacontabilidade",
    avatar: "M",
    cor: "#3B82F6",
    nicho: "Contabilidade & Finanças",
    kpis:      escritorioKpis,
    growth30:  escritorioGrowth30,
    growth90:  escritorioGrowth90,
    growth6m:  escritorioGrowth6m,
    insights:  escritorioInsights,
    alertas:   escritorioAlertas,
  },
};
