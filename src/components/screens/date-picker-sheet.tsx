"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type DatePickerSheetProps = {
  open: boolean;
  value: string;
  maxDate: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
};

function buildMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1).reverse();
}

function buildDayOptions(year: number, month: number) {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, index) => index + 1);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function DatePickerSheet({ open, value, maxDate, onClose, onConfirm }: DatePickerSheetProps) {
  const max = useMemo(() => parseDate(maxDate), [maxDate]);
  const initial = useMemo(() => parseDate(value > maxDate ? maxDate : value), [value, maxDate]);

  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [day, setDay] = useState(initial.getDate());

  const monthScrollerRef = useRef<HTMLDivElement>(null);
  const dayScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const next = parseDate(value > maxDate ? maxDate : value);
    const m = next.getMonth() + 1;
    const d = next.getDate();
    setMonth(m);
    setDay(d);
    // Scroll into view after a tick
    requestAnimationFrame(() => {
      if (monthScrollerRef.current) {
        const idx = buildMonthOptions().filter((it) => it <= max.getMonth() + 1).indexOf(m);
        monthScrollerRef.current.scrollTo({ top: idx * 44, behavior: "auto" });
      }
      if (dayScrollerRef.current) {
        const allD = buildDayOptions(max.getFullYear(), m);
        const visD = (m === max.getMonth() + 1 ? allD.filter((dt) => dt <= max.getDate()) : allD).reverse();
        const idx = visD.indexOf(d);
        if (idx >= 0) dayScrollerRef.current.scrollTo({ top: idx * 44, behavior: "auto" });
      }
    });
  }, [open, value, maxDate, max]);

  const year = max.getFullYear();
  const months = buildMonthOptions().filter((item) => item <= max.getMonth() + 1);
  const allDays = buildDayOptions(year, month);
  const visibleDays =
    (month === max.getMonth() + 1 ? allDays.filter((item) => item <= max.getDate()) : allDays).reverse();
  const safeDay = visibleDays.includes(day) ? day : visibleDays[visibleDays.length - 1];
  const selectedDate = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

  // Format display text
  const displayDate = `${year}年${month}月${safeDay}日`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40"
            style={{ backgroundColor: "rgba(30,15,5,0.55)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Centered Dialog Card */}
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-[340px] overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(30,15,5,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Top icon area ── */}
              <div className="flex flex-col items-center pt-8 pb-4">
                {/* Calendar icon */}
                <div
                  className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_4px_16px_rgba(126,99,201,0.18)]"
                  style={{ background: "linear-gradient(135deg, #7B3F8C 0%, #5C2D6E 100%)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <circle cx="12" cy="16" r="1.5" fill="white" stroke="none" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="font-heading text-[18px] font-bold text-[#2d2a34]">
                  选择日期
                </h3>

                {/* Subtitle */}
                <p className="mt-1 text-[13px] text-[#9794a2]">
                  最新日期只能到今天
                </p>
              </div>

              {/* ── Dual-column month / day scroll pickers ── */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Month column */}
                  <div className="flex flex-col rounded-[16px] border border-[#dbd5e8] bg-[#f8f6fc] overflow-hidden">
                    <div className="shrink-0 border-b border-[#dbd5e8] bg-[#F5F0F7] py-2 text-center">
                      <span className="text-[13px] font-bold text-[#6F2C7C]">月</span>
                    </div>
                    <div
                      ref={monthScrollerRef}
                      className="h-[200px] overflow-y-auto no-scrollbar px-2"
                      style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
                    >
                      {months.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setMonth(item);
                            setDay((current) => Math.min(current, new Date(year, item, 0).getDate()));
                          }}
                          className="flex h-[44px] w-full snap-center items-center justify-center rounded-[10px] text-[15px] font-semibold transition-colors"
                          style={{
                            color: month === item ? "#FFFFFF" : "#5c5a64",
                            backgroundColor: month === item ? "#6F2C7C" : "transparent",
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day column */}
                  <div className="flex flex-col rounded-[16px] border border-[#dbd5e8] bg-[#f8f6fc] overflow-hidden">
                    <div className="shrink-0 border-b border-[#dbd5e8] bg-[#F5F0F7] py-2 text-center">
                      <span className="text-[13px] font-bold text-[#6F2C7C]">日</span>
                    </div>
                    <div
                      ref={dayScrollerRef}
                      className="h-[200px] overflow-y-auto no-scrollbar px-2"
                      style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
                    >
                      {visibleDays.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDay(item)}
                          className="flex h-[44px] w-full snap-center items-center justify-center rounded-[10px] text-[15px] font-semibold transition-colors"
                          style={{
                            color: safeDay === item ? "#FFFFFF" : "#5c5a64",
                            backgroundColor: safeDay === item ? "#6F2C7C" : "transparent",
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Selected date preview ── */}
              <div className="px-6 pb-1">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-[#F5F0F7] py-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F2C7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="text-[15px] font-bold text-[#6F2C7C]">{displayDate}</span>
                </div>
              </div>

              {/* ── Bottom buttons ── */}
              <div className="flex items-center gap-3 border-t border-[#dbd5e8] bg-[#f8f6fc] px-6 py-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-[#dbd5e8] bg-white py-3 text-[14px] font-semibold text-[#5c5a64] shadow-sm"
                >
                  取消
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onConfirm(selectedDate)}
                  className="flex flex-1 items-center justify-center rounded-2xl py-3 text-[14px] font-bold text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #c8708a 0%, #7e63c9 50%, #6F2C7C 100%)" }}
                >
                  确定
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
