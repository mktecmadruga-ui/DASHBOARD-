export interface KPI {
  label: string;
  valor: number;
  variacao: number;
  periodo: string;
  icon: string;
  formato: "numero" | "porcentagem" | "duracao";
}

export interface GrowthData {
  data: string;
  seguidores: number;
  alcance: number;
  engajamento: number;
}

export interface ContentItem {
  id: string;
  tipo: "reel" | "feed" | "story";
  titulo: string;
  thumbnail: string;
  curtidas: number;
  comentarios: number;
  compartilhamentos: number;
  salvamentos: number;
  alcance: number;
  impressoes: number;
  visualizacoes?: number;
  retencao?: number;
  publicadoEm: string;
}

export interface AudienceData {
  genero: { label: string; valor: number }[];
  idade: { faixa: string; valor: number }[];
  paises: { nome: string; valor: number }[];
  cidades: { nome: string; valor: number }[];
  horasAtivas: { hora: number; dia: number; valor: number }[];
}

export interface CompetitorData {
  nome: string;
  usuario: string;
  seguidores: number;
  engajamento: number;
  frequencia: number;
  crescimento: number;
}

export interface AIInsight {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "horario" | "formato" | "conteudo" | "frequencia";
  confianca: number;
  impacto: "alto" | "medio" | "baixo";
}

export interface CalendarEvent {
  id: string;
  titulo: string;
  data: string;
  scheduledAt?: string;        // ISO datetime for auto-posting "2026-05-10T18:00"
  tipo: "reel" | "feed" | "story" | "carrossel";
  status: "agendado" | "publicado" | "rascunho" | "roteiro" | "criativo";
  // AI-generated content
  copy?: string;
  legenda?: string;
  hashtags?: string[];
  prompt?: string;
  creative?: string;          // legacy single
  creativeName?: string;
  creatives?: { dataUrl: string; name: string }[]; // up to 10
  alteracoes?: string;        // change requests from William
}

export interface AlertItem {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "viral" | "queda" | "crescimento" | "atencao";
  tempo: string;
}
