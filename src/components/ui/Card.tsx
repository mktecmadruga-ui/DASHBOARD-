"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  /** Optional standardized header title */
  title?: React.ReactNode;
  /** Small secondary line under the title */
  subtitle?: React.ReactNode;
  /** Right-side header actions (buttons, dropdowns, etc.) */
  actions?: React.ReactNode;
  /** Optional id for anchor navigation (e.g. "sec-calendar") */
  id?: string;
  /** Pad-less variant for full-bleed content (charts, tables) */
  flush?: boolean;
}

export default function Card({
  children,
  className,
  hover = true,
  delay = 0,
  title,
  subtitle,
  actions,
  id,
  flush = false,
}: CardProps) {
  const hasHeader = title || actions;
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "bg-white rounded-3xl border border-slate-100 shadow-glass transition-shadow duration-300 scroll-mt-24",
        !flush && "p-6",
        hover && "hover:shadow-glass-hover hover:-translate-y-0.5",
        className
      )}
    >
      {hasHeader && (
        <header className={cn(
          "flex items-start justify-between gap-3 mb-5",
          flush && "px-6 pt-6"
        )}>
          <div className="min-w-0">
            {title && (
              typeof title === "string"
                ? <h3 className="text-lg font-semibold text-text-dark leading-tight">{title}</h3>
                : title
            )}
            {subtitle && (
              typeof subtitle === "string"
                ? <p className="text-sm text-text-light mt-0.5">{subtitle}</p>
                : <div className="mt-0.5">{subtitle}</div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>
      )}
      {flush ? <div className={hasHeader ? "" : "p-6"}>{children}</div> : children}
    </motion.section>
  );
}
