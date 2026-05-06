import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BadgeProps {
  value: number;
  suffix?: string;
}

export default function Badge({ value, suffix = "%" }: BadgeProps) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
        isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}
      {value.toFixed(1).replace(".", ",")}{suffix}
    </span>
  );
}
