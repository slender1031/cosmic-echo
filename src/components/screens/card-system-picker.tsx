"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CardSystem } from "@/lib/settings-context";

interface CardSystemPickerProps {
  open: boolean;
  current: CardSystem;
  onClose: () => void;
  onSelect: (system: CardSystem) => void;
}

export function CardSystemPicker({ open, current, onClose, onSelect }: CardSystemPickerProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh-CN";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40"
            style={{ backgroundColor: "rgba(40,30,50,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* bottom sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[28px] px-6 pb-10 pt-4"
            style={{ backgroundColor: "#fefdfe" }}
          >
            {/* drag handle */}
            <div className="mb-5 flex justify-center">
              <div className="h-1 w-10 rounded-full" style={{ backgroundColor: "#dbd5e8" }} />
            </div>

            <h3 className="font-heading text-lg font-bold mb-1" style={{ color: "#2d2a34" }}>
              {isZh ? "选择卡牌体系" : "Choose Card System"}
            </h3>
            <p className="text-xs mb-5" style={{ color: "#9794a2" }}>
              {isZh ? "选择一种卡牌体系开启今日的指引" : "Select a card system for today's guidance"}
            </p>

            <div className="space-y-3">
              {/* Tarot option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect("tarot")}
                className="flex w-full items-center gap-3 rounded-[18px] border p-3 text-left transition-all"
                style={{
                  backgroundColor: current === "tarot" ? "#f2eff8" : "#ffffff",
                  borderColor: current === "tarot" ? "#7e63c9" : "#dbd5e8",
                  boxShadow: current === "tarot" ? "0 0 0 1px rgba(126,99,201,0.2)" : "none",
                }}
              >
                {/* icon */}
                <img src="/图标/塔罗图标.png" alt="Tarot" className="h-[4.5rem] w-[4.5rem] shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: "#2d2a34" }}>
                    {isZh ? "塔罗" : "Tarot"}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "#9794a2" }}>
                    {isZh ? "78张 · 经典韦特体系" : "78 cards · Classic Waite System"}
                  </p>
                </div>
                {current === "tarot" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: "#7e63c9" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </motion.button>

              {/* Lenormand option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect("lenormand")}
                className="flex w-full items-center gap-3 rounded-[18px] border p-3 text-left transition-all"
                style={{
                  backgroundColor: current === "lenormand" ? "#f2eff8" : "#ffffff",
                  borderColor: current === "lenormand" ? "#7e63c9" : "#dbd5e8",
                  boxShadow: current === "lenormand" ? "0 0 0 1px rgba(126,99,201,0.2)" : "none",
                }}
              >
                {/* icon */}
                <img src="/图标/雷诺曼图标.png" alt="Lenormand" className="h-[4.5rem] w-[4.5rem] shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: "#2d2a34" }}>
                    {isZh ? "雷诺曼" : "Lenormand"}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "#9794a2" }}>
                    {isZh ? "36张 · 希望游戏" : "36 cards · Game of Hope"}
                  </p>
                </div>
                {current === "lenormand" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: "#7e63c9" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </motion.button>
            </div>

            {/* close button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="mt-4 w-full rounded-[18px] py-3.5 text-sm font-semibold"
              style={{ backgroundColor: "#eae5f3", color: "#5c5a64" }}
            >
              {isZh ? "取消" : "Cancel"}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
