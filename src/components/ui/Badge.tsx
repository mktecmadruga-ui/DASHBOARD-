import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BadgeProps {
  value: number;
  suffix?: string;
  /** Show "—" when value is exactly 0 instead of "+0,0%" */
  neutralOnZero?: boolean;
  className?: string;
}

export default function Badge({ value, suffix = "%", neutralOnZero = true, className }: BadgeProps) {
  const isZero     = Math.abs(value) < 0.05; // ~0 after rounding
  const isPositive = value > 0;
  const isNeutral  = neutralOnZero && isZero;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const tone = isNeutral
    ? "bg-slate-100 text-slate-500"
    : isPositive
      ? "bg-success/10 text-success"
      : "bg-danger/10 text-danger";

  const label = isNeutral
    ? "estável"
    : `${isPositive ? "+" : ""}${value.toFixed(1).replace(".", ",")}${suffix}`;

  return (
    <span
      aria-label={`Variação: ${label}`}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
        tone,
        className
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {isNeutral
        ? <span>—</span>
        : <span>{(isPositive ? "+" : "") + value.toFixed(1).replace(".", ",") + suffix}</span>}
    </span>
  );
}
