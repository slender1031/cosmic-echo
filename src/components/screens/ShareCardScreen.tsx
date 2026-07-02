"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { getCardById } from "@/lib/tarot-data";
import { CardFront } from "@/components/tarot/tarot-card-display";
import { useDemo } from "@/components/demo/demo-provider";

interface JournalEntry {
  id: string;
  cardId: string;
  cardSystem?: string;
  cards?: Array<{
    cardId: string;
    cardName: string;
    cardOrientation: "upright" | "reversed";
  }>;
  morningTheme: string | null;
  eveningEcho: string | null;
  behaviorPatterns: string | null;
  date: string;
}

function DividerGlyph() {
  return (
    <div className="flex items-center justify-center gap-2 text-[#D9B86A]">
      <span className="h-px w-14" style={{ background: "rgba(217,184,106,0.75)" }} />
      <span className="text-[10px]">✦</span>
      <span className="text-[11px]">○</span>
      <span className="text-[10px]">✦</span>
      <span className="h-px w-14" style={{ background: "rgba(217,184,106,0.75)" }} />
    </div>
  );
}

function CornerStar({ className }: { className: string }) {
  return <span className={`absolute text-[11px] ${className}`} style={{ color: "rgba(217,184,106,0.8)" }}>✦</span>;
}

function getCardRows(count: number): number[] {
  if (count <= 4) return [count];
  if (count === 5) return [3, 2];
  if (count === 6) return [3, 3];
  if (count === 7) return [4, 3];
  return [count];
}

function getShareCardStyle(totalCount: number): React.CSSProperties {
  // 固定像素宽度，所有牌大小一致
  if (totalCount <= 2) return { width: 130 };
  if (totalCount === 3) return { width: 100 };
  if (totalCount === 4) return { width: 72 };
  if (totalCount === 5 || totalCount === 6) return { width: 72 };
  return { width: 64 }; // 7+ 张更小，保证边距
}

export function ShareCardScreen() {
  const { t } = useTranslation();
  const { demoMode, demoUser } = useDemo();
  const router = useRouter();
  const user = demoUser;
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const loadEntry = useCallback(async () => {
    try {
      const res = await request(`/api/journal?date=${selectedDate}`);
      const data = await res.json();
      setEntry(data.entry ?? null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("cosmic-echo.selected-date");
      if (saved) {
        setSelectedDate(saved);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (user) {
        void loadEntry();
      } else {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadEntry]);

  const applyExportTheme = () => {
    const root = document.documentElement;
    const overrides: Array<[string, string]> = [
      ["--background", "#fffdf7"],
      ["--foreground", "#4b3828"],
      ["--card", "#fffdf7"],
      ["--card-foreground", "#4b3828"],
      ["--popover", "#fffdf7"],
      ["--popover-foreground", "#4b3828"],
      ["--primary", "#b98a39"],
      ["--primary-foreground", "#fffdf7"],
      ["--secondary", "#f7ecd3"],
      ["--secondary-foreground", "#4b3828"],
      ["--muted", "#f7ecd3"],
      ["--muted-foreground", "#8c7356"],
      ["--accent", "#f7ecd3"],
      ["--accent-foreground", "#4b3828"],
      ["--destructive", "#d84f4f"],
      ["--border", "#e8cf98"],
      ["--input", "#e8cf98"],
      ["--ring", "#d2b16c"],
      ["--chart-1", "#edd8a1"],
      ["--chart-2", "#d2b16c"],
      ["--chart-3", "#bc9550"],
      ["--chart-4", "#9b7744"],
      ["--chart-5", "#6f5332"],
      ["--sidebar", "#fffdf7"],
      ["--sidebar-foreground", "#4b3828"],
      ["--sidebar-primary", "#b98a39"],
      ["--sidebar-primary-foreground", "#fffdf7"],
      ["--sidebar-accent", "#f7ecd3"],
      ["--sidebar-accent-foreground", "#4b3828"],
      ["--sidebar-border", "#e8cf98"],
      ["--sidebar-ring", "#d2b16c"],
    ];

    const previous = overrides.map(([name]) => [name, root.style.getPropertyValue(name)] as const);
    overrides.forEach(([name, value]) => root.style.setProperty(name, value));

    return () => {
      previous.forEach(([name, value]) => {
        if (value) {
          root.style.setProperty(name, value);
        } else {
          root.style.removeProperty(name);
        }
      });
    };
  };

  const handleDownload = async () => {
    if (!posterRef.current || downloading) return;
    setDownloading(true);
    const restoreTheme = applyExportTheme();
    try {
      // 使用 html-to-image（避免 html2canvas 的 oklab 解析错误）
      const { toCanvas } = await import("html-to-image");
      const el = posterRef.current;

      // 保存原始样式
      const origStyle = {
        height: el.style.height,
        minHeight: el.style.minHeight,
        width: el.style.width,
      };
      // 截图时强制自适应内容大小
      el.style.height = "auto";
      el.style.minHeight = "auto";

      // 先生成原始 canvas
      const rawCanvas = await toCanvas(el, {
        pixelRatio: 2,
        backgroundColor: "#f6ead1",
        cacheBust: true,
      });

      // 恢复原始样式
      el.style.height = origStyle.height;
      el.style.minHeight = origStyle.minHeight;
      el.style.width = origStyle.width;

      // 创建最终 canvas：带圆角裁剪 (18px * 2 = 36px at pixelRatio=2)
      const w = rawCanvas.width;
      const h = rawCanvas.height;
      const r = 36;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = w;
      finalCanvas.height = h;
      const ctx = finalCanvas.getContext("2d");

      // 圆角矩形裁剪路径
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();

      // 绘制原始图像到裁剪后的画布
      ctx.drawImage(rawCanvas, 0, 0);

      // 导出为 blob 下载
      const blob = await new Promise<Blob | null>((resolve) => {
        finalCanvas.toBlob((file) => resolve(file), "image/png");
      });
      if (!blob) throw new Error("Failed to create image blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `cosmic-echo-${entry?.date ?? "today"}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      restoreTheme();
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!entry) return;
    if (demoMode && typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: t("shareCard.title"),
        text: `${entry.morningTheme}\n${entry.eveningEcho}`,
      });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${entry.morningTheme}\n${entry.eveningEcho}`);
    }
  };

  const patterns: string[] = useMemo(() => {
    try {
      return JSON.parse(entry?.behaviorPatterns ?? "[]");
    } catch {
      return [];
    }
  }, [entry?.behaviorPatterns]);

  const shareCards = useMemo(() => {
    if (!entry) return [];
    return entry.cards?.length
      ? entry.cards
      : [{ cardId: entry.cardId, cardName: "", cardOrientation: "upright" as const }];
  }, [entry]);

  const headerDetail = useMemo(() => {
    if (patterns.length > 0) return patterns.join(" · ");
    return shareCards.map((card) => getCardById(card.cardId)?.nameZh).filter(Boolean).join(" · ");
  }, [patterns, shareCards]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#7e63c9", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!entry || (!entry.cardId && !entry.cards?.length)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm font-semibold" style={{ color: "#5c5a64" }}>
          Please draw today&apos;s cards first.
        </p>
        <Link href="/">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #c8708a, #7e63c9)" }}
          >
            {t("morning.drawCard")}
          </motion.div>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-5 pt-8 pb-3"
        style={{
          backgroundColor: "#f8f6fc",
          backdropFilter: "blur(12px)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
          style={{ color: "#2d2a34" }}
          aria-label={t("shareCard.back")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>

        <h1 className="font-heading text-xl font-bold" style={{ color: "#2d2a34" }}>
          {t("shareCard.title")}
        </h1>
      </header>

      <div className="mx-auto flex max-w-lg flex-col gap-5 px-7 pb-12 pt-4">
        <motion.div
          ref={posterRef}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative w-full overflow-hidden rounded-[30px] border px-6 py-5"
          style={{
            background: "linear-gradient(180deg, #fbf4e3 0%, #f4e3bb 100%)",
            borderColor: "#d5b97d",
            boxShadow: "0 18px 40px rgba(102, 74, 30, 0.16), inset 0 0 0 1px rgba(255,255,255,0.35)",
          }}
        >
          <CornerStar className="left-3 top-3" />
          <CornerStar className="right-3 top-3" />
          <CornerStar className="left-3 bottom-3" />
          <CornerStar className="right-3 bottom-3" />

          <div className="relative z-10 flex h-full flex-col items-center text-center">
            <div className="space-y-1">
              <p className="text-[11px] tracking-[0.28em] text-[#b88c43]">COSMIC ECHO JOURNAL</p>
              <p className="font-heading text-xl font-semibold text-[#6a4a28]">{t("app.name")}</p>
            </div>

            <div className="mt-4 w-full">
              <DividerGlyph />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[#7d623f]">
              <span>{entry.date}</span>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              {getCardRows(shareCards.length).map((rowCount, rowIndex) => {
                const rows = getCardRows(shareCards.length);
                const startIndex = rows.slice(0, rowIndex).reduce((a, b) => a + b, 0);
                const rowCards = shareCards.slice(startIndex, startIndex + rowCount);
                return (
                  <div key={rowIndex} className="flex items-center justify-center gap-3">
                    {rowCards.map((shareCard, idx) => {
                      const globalIndex = startIndex + idx;
                      const cardData = getCardById(shareCard.cardId);
                      return (
                        <div
                          key={`${shareCard.cardId}-${globalIndex}`}
                          className="relative overflow-hidden rounded-[18px] border bg-[#f6ead1]"
                          style={{
                            ...getShareCardStyle(shareCards.length),
                            aspectRatio: "2/3.14",
                            borderColor: "#cda45b",
                            boxShadow: "0 12px 24px rgba(84, 57, 20, 0.20)",
                            transform: "none",
                          }}
                        >
                          {cardData ? (
                            <CardFront card={cardData} orientation={shareCard.cardOrientation as "upright" | "reversed"} cardSystem={entry.cardSystem as "tarot" | "lenormand" | undefined} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-4 text-center font-heading text-lg text-[#6a4a28]">
                              Tarot
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-5 w-full">
              <DividerGlyph />
            </div>

            <div className="mt-5 text-center">
              <p className="text-[11px] text-[#9f7a3d]">{t("morning.lesson")}</p>
              <p className="mt-1 text-[13px] text-[#6a4a28]">{entry.morningTheme}</p>
              {entry.eveningEcho && <p className="mt-2 text-[12px] italic text-[#8a6a3a]">{entry.eveningEcho}</p>}
            </div>

            <div className="mt-4 text-[#d9b86a]">
              <div className="flex items-center justify-center gap-4 text-[12px]">
                <span>☽</span>
                <span>✦</span>
                <span>◈</span>
                <span>✧</span>
                <span>⊕</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex w-full gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 rounded-[16px] border py-3.5 text-xs font-bold transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              color: downloading ? "#9794a2" : "#2d2a34",
              borderColor: "#dbd5e8",
            }}
          >
            {downloading ? "Preparing..." : t("shareCard.download")}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
            className="flex-1 rounded-[16px] py-3.5 text-xs font-bold text-white"
            style={{ backgroundColor: "#7e63c9", boxShadow: "0 4px 16px rgba(139,109,196,0.3)" }}
          >
            {t("shareCard.share")}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
