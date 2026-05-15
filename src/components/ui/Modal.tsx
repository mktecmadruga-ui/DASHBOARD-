"use client";

import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  /**
   * Hide the default header (you'll render your own).
   */
  hideHeader?: boolean;
  /**
   * Prevent close-on-backdrop-click (useful for destructive flows).
   */
  preventBackdropClose?: boolean;
}

const SIZE_CLASS: Record<Required<ModalProps>["size"], string> = {
  sm: "max-w-md",   // 448px — confirmations
  md: "max-w-lg",   // 512px — forms (default)
  lg: "max-w-2xl",  // 672px — content-rich (event editor, etc.)
  xl: "max-w-4xl",  // 896px — tables, lists
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  hideHeader = false,
  preventBackdropClose = false,
  children,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus first focusable element on open (basic focus management)
  useEffect(() => {
    if (!open) return;
    // Small delay so the spring animation can settle
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, button:not([aria-label="Fechar"]), [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={preventBackdropClose ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
            className={cn(
              "relative z-10 w-full max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.16)] border border-slate-100",
              SIZE_CLASS[size]
            )}
          >
            {!hideHeader && (
              <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-50 flex-shrink-0">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-lg font-semibold text-text-dark leading-tight">{title}</h2>
                  {description && (
                    <p id={descId} className="text-xs text-text-light mt-1 leading-relaxed">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <X className="w-4 h-4 text-text-medium" />
                </button>
              </header>
            )}

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 py-5 modal-scroll">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
