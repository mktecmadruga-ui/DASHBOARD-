import type { KPI } from "@/types";

export const kpis: KPI[] = [
  { label: "Seguidores", valor: 285420, variacao: 3.2, periodo: "mês", icon: "users", formato: "numero" },
  { label: "Crescimento Mensal", valor: 4.8, variacao: 1.2, periodo: "mês", icon: "trending", formato: "porcentagem" },
  { label: "Alcance", valor: 1243000, variacao: 12.5, periodo: "semana", icon: "eye", formato: "numero" },
  { label: "Impressões", valor: 2156000, variacao: 8.1, periodo: "semana", icon: "bar", formato: "numero" },
  { label: "Views de Reels", valor: 3420000, variacao: 18.3, periodo: "mês", icon: "play", formato: "numero" },
  { label: "Taxa de Engajamento", valor: 4.8, variacao: 0.3, periodo: "mês", icon: "heart", formato: "porcentagem" },
  { label: "Compartilhamentos", valor: 12840, variacao: 5.7, periodo: "semana", icon: "share", formato: "numero" },
  { label: "Salvamentos", valor: 28500, variacao: 9.4, periodo: "semana", icon: "bookmark", formato: "numero" },
];
