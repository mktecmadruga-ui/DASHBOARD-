import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(".", ",") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(".", ",") + "K";
  }
  return num.toLocaleString("pt-BR");
}

export function formatPercent(num: number): string {
  return num.toFixed(1).replace(".", ",") + "%";
}

export function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  }
  return `${seconds}s`;
}
