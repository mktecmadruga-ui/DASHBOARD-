import type { ContentItem } from "@/types";

export const reelsData: ContentItem[] = [
  { id: "r1", tipo: "reel", titulo: "5 dicas para empreender em 2026", thumbnail: "", curtidas: 45200, comentarios: 1820, compartilhamentos: 8400, salvamentos: 12300, alcance: 520000, impressoes: 680000, visualizacoes: 485000, retencao: 72, publicadoEm: "2026-04-28" },
  { id: "r2", tipo: "reel", titulo: "Rotina produtiva de manhã", thumbnail: "", curtidas: 38100, comentarios: 1450, compartilhamentos: 6200, salvamentos: 9800, alcance: 420000, impressoes: 550000, visualizacoes: 398000, retencao: 68, publicadoEm: "2026-04-25" },
  { id: "r3", tipo: "reel", titulo: "Como criar conteúdo viral", thumbnail: "", curtidas: 52800, comentarios: 2100, compartilhamentos: 11200, salvamentos: 15400, alcance: 680000, impressoes: 890000, visualizacoes: 642000, retencao: 78, publicadoEm: "2026-04-20" },
  { id: "r4", tipo: "reel", titulo: "Mindset de crescimento", thumbnail: "", curtidas: 29500, comentarios: 980, compartilhamentos: 4800, salvamentos: 7200, alcance: 310000, impressoes: 420000, visualizacoes: 285000, retencao: 62, publicadoEm: "2026-04-18" },
  { id: "r5", tipo: "reel", titulo: "Ferramentas de IA para criadores", thumbnail: "", curtidas: 61200, comentarios: 2800, compartilhamentos: 14500, salvamentos: 18900, alcance: 890000, impressoes: 1120000, visualizacoes: 820000, retencao: 82, publicadoEm: "2026-04-15" },
];

export const feedData: ContentItem[] = [
  { id: "f1", tipo: "feed", titulo: "Carrossel: Métricas que importam", thumbnail: "", curtidas: 18500, comentarios: 920, compartilhamentos: 3200, salvamentos: 8400, alcance: 185000, impressoes: 240000, publicadoEm: "2026-04-30" },
  { id: "f2", tipo: "feed", titulo: "Infográfico: Tendências 2026", thumbnail: "", curtidas: 22100, comentarios: 1100, compartilhamentos: 4500, salvamentos: 11200, alcance: 210000, impressoes: 280000, publicadoEm: "2026-04-27" },
  { id: "f3", tipo: "feed", titulo: "Antes e depois da marca", thumbnail: "", curtidas: 15800, comentarios: 780, compartilhamentos: 2100, salvamentos: 5400, alcance: 145000, impressoes: 190000, publicadoEm: "2026-04-22" },
];

export const storiesData: ContentItem[] = [
  { id: "s1", tipo: "story", titulo: "Bastidores da gravação", thumbnail: "", curtidas: 0, comentarios: 420, compartilhamentos: 180, salvamentos: 0, alcance: 82000, impressoes: 95000, publicadoEm: "2026-05-04" },
  { id: "s2", tipo: "story", titulo: "Q&A com seguidores", thumbnail: "", curtidas: 0, comentarios: 680, compartilhamentos: 220, salvamentos: 0, alcance: 78000, impressoes: 88000, publicadoEm: "2026-05-03" },
  { id: "s3", tipo: "story", titulo: "Enquete: próximo conteúdo", thumbnail: "", curtidas: 0, comentarios: 950, compartilhamentos: 340, salvamentos: 0, alcance: 91000, impressoes: 102000, publicadoEm: "2026-05-02" },
];

export const contentMetrics = {
  reels: { views: 3420000, retencaoMedia: 72, completionRate: 64, tempoMedio: 18, replayRate: 23, shares: 45100, saves: 63600 },
  feed: { engajamento: 5.2, impressoes: 710000, comentarios: 2800, alcance: 540000 },
  stories: { exits: 12, replies: 2050, tapsForward: 34, tapsBack: 8, ctr: 3.8 },
};
