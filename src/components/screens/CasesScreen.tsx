"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, type PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { loadCases, deleteCase, getSpreadLabel, type CaseRecord } from "@/lib/cases-storage";

/* ── 分类配置 ── */
const CATEGORY_CONFIG: Record<string, { zh: string; en: string; accent: "purple" | "rose" | "green" }> = {
  career:   { zh: "事业", en: "Career",   accent: "purple" },
  love:     { zh: "感情", en: "Love",     accent: "rose" },
  decision:  { zh: "决策", en: "Decision", accent: "purple" },
  relation:  { zh: "人际", en: "Social",   accent: "rose" },
  growth:    { zh: "成长", en: "Growth",   accent: "green" },
  wealth:    { zh: "财富", en: "Wealth",   accent: "green" },
};

/* ── CaseItem（UI 展示用） ── */
interface CaseItem {
  id: number;
  date: string;
  tags: { label: string; type: "purple" | "rose" | "green" }[];
  question: string;
  cards: { name: string; upright: boolean }[];
  review: string;
  outcome: "yes" | "pending" | "no";
  accent: "purple" | "rose" | "green";
  spreadLabel: string;  // 牌阵展示名称，如 "塔罗 · 三张牌"
}

/* ── CaseRecord → CaseItem ── */
function toCaseItem(record: CaseRecord, isZh: boolean): CaseItem {
  const firstCat = record.categories[0];
  const catCfg = CATEGORY_CONFIG[firstCat];
  const accent: CaseItem["accent"] = catCfg?.accent ?? "purple";

  const outcomeMap: Record<string, CaseItem["outcome"]> = {
    matched: "yes",
    unmatched: "no",
    pending: "pending",
  };

  return {
    id: record.id,
    date: record.date,
    tags: record.categories.map((key) => {
      const cfg = CATEGORY_CONFIG[key];
      return {
        label: cfg ? (isZh ? cfg.zh : cfg.en) : key,
        type: cfg?.accent ?? "purple",
      };
    }),
    question: record.question,
    cards: record.cards.map((c) => ({
      name: isZh ? c.nameZh : c.name,
      upright: c.upright,
    })),
    review: record.review,
    outcome: outcomeMap[record.outcome] ?? "pending",
    accent,
    spreadLabel: getSpreadLabel(record.cardSystem, record.spreadId, isZh, record.cards.length),
  };
}

/* ── 辅助函数 ── */
function accentBg(accent: string) {
  return accent === "purple"
    ? "rgba(126,99,201,0.08)"
    : accent === "rose"
      ? "rgba(200,112,138,0.08)"
      : "rgba(92,184,138,0.08)";
}
function accentColor(accent: string) {
  return accent === "purple" ? "#7e63c9" : accent === "rose" ? "#c8708a" : "#5cb88a";
}
function outcomeClass(outcome: string) {
  return outcome === "yes"
    ? "bg-[rgba(92,184,138,0.08)] text-[#5cb88a]"
    : outcome === "pending"
      ? "bg-[rgba(126,99,201,0.08)] text-[#7e63c9]"
      : "bg-[rgba(220,80,80,0.08)] text-[#dc5050]";
}
function outcomeTextKey(outcome: string) {
  return `cases.outcome.${outcome}` as const;
}

const TAG_KEYS = [
  { key: "all",       labelKey: "cases.tags.all" },
  { key: "career",   labelKey: "cases.tags.career" },
  { key: "love",      labelKey: "cases.tags.relationship" },
  { key: "decision",  labelKey: "cases.tags.decision" },
  { key: "relation",  labelKey: "cases.tags.social" },
  { key: "growth",    labelKey: "cases.tags.growth" },
  { key: "wealth",    labelKey: "cases.tags.wealth" },
];

export function CasesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === "zh-CN";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [swipedId, setSwipedId] = useState<number | null>(null);

  // 从 localStorage 加载案例
  const [allItems, setAllItems] = useState<CaseItem[]>([]);
  useEffect(() => {
    const records = loadCases();
    setAllItems(records.map((r) => toCaseItem(r, isZh)));
  }, [isZh]);

  // 导航返回时刷新（Next.js App Router 不一定 remount）
  useEffect(() => {
    const reload = () => {
      const records = loadCases();
      setAllItems(records.map((r) => toCaseItem(r, isZh)));
    };
    const onFocus = reload;
    window.addEventListener("focus", onFocus);
    window.addEventListener("cosmic-echo-cases-updated", reload);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cosmic-echo-cases-updated", reload);
    };
  }, [isZh]);

  /* 拖拽横向滚动 */
  const tagScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const el = tagScrollRef.current;
    if (!el) return;
    dragState.current.isDragging = true;
    dragState.current.startX = e.pageX - el.offsetLeft;
    dragState.current.scrollLeft = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    const el = tagScrollRef.current;
    if (!el || !dragState.current.isDragging) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX) * 1.5;
  }, []);
  const handleDragEnd = useCallback(() => {
    const el = tagScrollRef.current;
    if (!el) return;
    dragState.current.isDragging = false;
    el.style.cursor = "grab";
    el.style.removeProperty("user-select");
  }, []);

  /* 删除处理 */
  const handleDelete = useCallback((id: number) => {
    deleteCase(id);
    const records = loadCases();
    setAllItems(records.map((r) => toCaseItem(r, isZh)));
    setSwipedId(null);
  }, [isZh]);

  /* 过滤 + 倒序 */
  const filteredCases = useMemo(() => {
    let result = [...allItems];
    // 日期倒序：最新在前（日期格式 YYYY/MM/DD）
    result.sort((a, b) => b.date.localeCompare(a.date));
    if (activeTag !== "all") {
      result = result.filter((c) =>
        c.tags.some((t) => {
          const cfg = CATEGORY_CONFIG[activeTag];
          return cfg && t.label === (isZh ? cfg.zh : cfg.en);
        })
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.question.toLowerCase().includes(q) ||
          c.review.toLowerCase().includes(q) ||
          c.cards.some((card) => card.name.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [allItems, searchQuery, activeTag, isZh, t]);

  /* 统计 */
  const stats = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth(); // 0-indexed
    const monthlyNew = allItems.filter((c) => {
      const d = new Date(c.date);
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    }).length;
    const verified = allItems.filter((c) => c.outcome !== "pending").length;
    return { total: allItems.length, monthlyNew, verified };
  }, [allItems]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full pointer-events-none -z-10 opacity-10"
        style={{ background: "radial-gradient(#f8f6fc)", filter: "blur(80px)" }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-40 flex w-full items-start px-7 pt-8 pb-3"
        style={{ backgroundColor: "#f8f6fc", backdropFilter: "blur(12px)" }}
      >
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold" style={{ color: "#2d2a34" }}>
            {t("cases.title")}
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7e63c9" }}>
            {t("cases.subtitle")}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-lg px-7 pb-18 flex flex-col gap-4">
        {/* Stats */}
        <div className="flex gap-2.5">
          {[
            { value: stats.total, key: "total", color: "#2d2a34" },
            { value: stats.monthlyNew, key: "monthlyNew", color: "#7e63c9" },
            { value: stats.verified, key: "verified", color: "#c8708a" },
          ].map((stat) => (
            <motion.div
              key={stat.key}
              whileHover={{ y: -2 }}
              className="flex-1 rounded-[14px] border p-3.5 flex flex-col items-center gap-1 shadow-sm"
              style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.08)" }}
            >
              <span className="font-display text-[22px] font-semibold leading-none" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="font-cn text-[11px] tracking-wide" style={{ color: "#9794a2" }}>
                {t(`cases.stats.${stat.key === "total" ? "total" : stat.key === "monthlyNew" ? "monthlyNew" : "verified"}`)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-2.5 items-center">
          <div
            className="flex-1 flex items-center gap-2 border rounded-xl px-3.5 py-2.5 shadow-sm transition-colors focus-within:border-[#7e63c9] focus-within:shadow-[0_0_0_3px_rgba(126,99,201,0.08)]"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.08)" }}
          >
            <div style={{ color: "#9794a2" }} className="flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("cases.searchPlaceholder")}
              className="flex-1 border-none outline-none bg-transparent text-sm"
              style={{ color: "#2d2a34" }}
            />
          </div>
          <button
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors cursor-pointer"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.08)", color: "#5c5a64" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7e63c9"; e.currentTarget.style.color = "#7e63c9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(110,100,150,0.08)"; e.currentTarget.style.color = "#5c5a64"; }}
            aria-label={t("cases.filter")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>

        {/* Tag filters */}
        <div className="relative">
          <div
            ref={tagScrollRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            className="flex gap-2 overflow-x-auto pb-1 cursor-grab [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" as const }}
          >
            {TAG_KEYS.map((tag) => (
              <button
                key={tag.key}
                onClick={() => setActiveTag(tag.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] tracking-wide border transition-all cursor-pointer ${
                  activeTag === tag.key
                    ? "border-[#7e63c9] text-white shadow-[0_2px_10px_rgba(126,99,201,0.2)]"
                    : "border text-[#5c5a64] hover:bg-[rgba(126,99,201,0.08)] hover:text-[#7e63c9]"
                }`}
                style={
                  activeTag === tag.key
                    ? { backgroundColor: "#7e63c9", borderColor: "#7e63c9" }
                    : { backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.08)" }
                }
              >
                {t(tag.labelKey)}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-6" style={{ background: "linear-gradient(to right, transparent, #f8f6fc)" }} />
        </div>

        {/* Case cards */}
        {filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3.5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#f2eff8" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9794a2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <p className="font-cn text-sm font-semibold" style={{ color: "#5c5a64" }}>{t("cases.comingSoon")}</p>
            <p className="text-xs" style={{ color: "#9794a2" }}>{t("cases.comingSoonDesc")}</p>
          </div>
        ) : (
          filteredCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative overflow-hidden rounded-[20px]"
            >
              {/* 红色删除按钮（左滑后露出） */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDelete(caseItem.id)}
                className="absolute top-0 right-0 bottom-0 z-0 flex w-[70px] items-center justify-center text-white text-[13px] font-semibold rounded-r-[20px] cursor-pointer"
                style={{ backgroundColor: "#dc5050" }}
                aria-label={t("cases.delete") || "删除"}
              >
                {t("cases.delete") || "删除"}
              </motion.button>

              {/* 卡片内容：可左滑 */}
              <motion.div
                drag="x"
                dragConstraints={{ left: -70, right: 0 }}
                dragElastic={{ left: 0.2, right: 0 }}
                onDragStart={() => {
                  if (swipedId && swipedId !== caseItem.id) setSwipedId(null);
                }}
                onDragEnd={(e, info: PanInfo) => {
                  if (info.offset.x < -40) {
                    setSwipedId(caseItem.id);
                  } else {
                    setSwipedId(null);
                  }
                }}
                animate={{ x: swipedId === caseItem.id ? -70 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                /* 点击卡片本体：若已左滑则收回，否则不跳转（编辑由右下角箭头进入） */
                onTap={() => {
                  if (swipedId === caseItem.id) {
                    setSwipedId(null);
                  }
                }}
                className="relative z-10 flex flex-col gap-3 rounded-[20px] border p-5 shadow-sm cursor-pointer transition-shadow duration-250"
                style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.08)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(100,90,140,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card, 0 2px 14px rgba(100,90,140,0.06))"; }}
              >
              {/* Left accent bar */}
              <div className="absolute top-0 left-0 w-[3px] h-full rounded-r-sm" style={{ backgroundColor: accentColor(caseItem.accent) }} />

              {/* Top: date + tags */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] tracking-wide" style={{ color: "#9794a2" }}>{caseItem.date}</span>
                <div className="flex gap-1.5">
                  {caseItem.tags.map((tag, i) => (
                    <span key={i} className="rounded-md px-2 py-0.5 text-[10px] tracking-wide" style={{ backgroundColor: accentBg(tag.type), color: accentColor(tag.type) }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Question */}
              <h2 className="text-[15px] font-semibold leading-[1.5] line-clamp-2" style={{ color: "#2d2a34" }}>
                {caseItem.question}
              </h2>

              {/* 牌阵名称 */}
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] tracking-wide border bg-[#f2eff8] text-[#5c5a64] border-[rgba(110,100,150,0.08)]">
                  {caseItem.spreadLabel}
                </span>
              </div>

              {/* Review */}
              <p className="text-[13px] leading-[1.6] line-clamp-2" style={{ color: "#5c5a64" }}>
                {caseItem.review}
              </p>

              {/* Footer: outcome + edit arrow */}
              <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: "rgba(110,100,150,0.08)" }}>
                <span className={`rounded-lg px-2.5 py-1 text-[11px] tracking-wide ${outcomeClass(caseItem.outcome)}`}>
                  {caseItem.outcome === "yes" ? "✓ " : ""}
                  {t(outcomeTextKey(caseItem.outcome))}
                </span>
                <button
                  onClick={() => router.push(`/cases/edit/${caseItem.id}`)}
                  className="flex h-8 w-8 items-center justify-center rounded-full cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95"
                  style={{ backgroundColor: "rgba(126,99,201,0.1)", color: "#7e63c9" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(126,99,201,0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(126,99,201,0.1)"; }}
                  aria-label={t("cases.editCase") || "编辑案例"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              </motion.div>
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => router.push("/cases/new")}
        className="fixed bottom-[96px] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg md:right-[calc(50%-186px)]"
        style={{ background: "linear-gradient(135deg, #9b7dd4, #7a5db4)", boxShadow: "0 6px 24px rgba(126,99,201,0.3)" }}
        aria-label={t("cases.addCase")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>
    </div>
  );
}
