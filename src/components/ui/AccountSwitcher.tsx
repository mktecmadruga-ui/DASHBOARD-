"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { accounts, type AccountId } from "@/data/accounts";
import { cn } from "@/lib/utils";

const accountList = Object.values(accounts);

export default function AccountSwitcher() {
  const { account, setAccountId } = useAccount();
  const [open, setOpen] = useState(false);

  function select(id: AccountId) {
    setAccountId(id);
    setOpen(false);
  }

  return (
    <div className="relative px-2 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 transition-all cursor-pointer group"
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: account.cor }}
        >
          {account.avatar}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-sm font-semibold truncate leading-tight">{account.nomeCompleto}</p>
          <p className="text-slate-400 text-xs truncate">{account.usuario}</p>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-slate-800 border border-white/10 rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
            >
              <div className="p-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-1.5 font-medium">
                  Trocar conta
                </p>
                {accountList.map((acc) => {
                  const isActive = acc.id === account.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => select(acc.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left",
                        isActive ? "bg-white/10" : "hover:bg-white/5"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: acc.cor }}
                      >
                        {acc.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{acc.nomeCompleto}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 text-xs">@</span>
                          <p className="text-slate-400 text-xs truncate">{acc.usuario.replace("@", "")}</p>
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
