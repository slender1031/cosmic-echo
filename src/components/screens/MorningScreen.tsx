"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getLunar } from "chinese-lunar-calendar";
import { useDemo } from "@/components/demo/demo-provider";
import { CardBack, CardFront } from "@/components/tarot/tarot-card-display";
import { DatePickerSheet } from "@/components/screens/date-picker-sheet";
import { CardSystemPicker } from "@/components/screens/card-system-picker";
import { useSettings, type CardSystem } from "@/lib/settings-context";
import { request } from "@/lib/api/request";
import {
  getCardById,
  getTarotCardImageUrl,
  getTodayAstrology,
  getAstrologySummary,
  TAROT_CARDS,
  type TarotCard,
} from "@/lib/tarot-data";
import {
  getLenormandCardById,
  getLenormandCardImageUrl,
  LENORMAND_CARDS,
  type LenormandCard,
} from "@/lib/lenormand-data";

type AnyCard = TarotCard | LenormandCard;

// ─── helpers ───────────────────────────────────────────────────────
function getDateInfo(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const lunar = getLunar(year, month, day);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return {
    solarYear: year, solarMonth: month, solarDay: day,
    weekday: weekdays[date.getDay()],
    lunarDate: lunar.lunarDate,
    lunarDateText: lunar.dateStr || "",
  };
}

function getMoonPhase(lunarDay: number) {
  if (lunarDay <= 2) return { name: "新月", emoji: "🌑" };
  if (lunarDay <= 6) return { name: "蛾眉月", emoji: "🌒" };
  if (lunarDay <= 9) return { name: "上弦月", emoji: "🌓" };
  if (lunarDay <= 13) return { name: "盈凸月", emoji: "🌔" };
  if (lunarDay <= 16) return { name: "满月", emoji: "🌕" };
  if (lunarDay <= 20) return { name: "亏凸月", emoji: "🌖" };
  if (lunarDay <= 24) return { name: "下弦月", emoji: "🌗" };
  return { name: "残月", emoji: "🌘" };
}

function getResultCardWidth(count: number) {
  if (count <= 1) return 100;
  return Math.max(12, (100 - (count - 1) * 3.2) / count);
}

function getResultContainerClass(count: number) {
  if (count <= 1) return "max-w-[160px]";
  if (count <= 3) return "max-w-[340px]";
  if (count <= 5) return "max-w-[390px]";
  return "max-w-[420px]";
}

function getCardSuitDotColor(cardId: string, system: "tarot" | "lenormand" = "tarot"): string {
  if (system === "lenormand") {
    const card = LENORMAND_CARDS.find(c => c.id === cardId);
    return card?.color ?? "#7e63c9";
  }
  if (cardId.endsWith("-wands")) return "#D67B4F";
  if (cardId.endsWith("-cups")) return "#8E7BBA";
  if (cardId.endsWith("-swords")) return "#6B8BA3";
  if (cardId.endsWith("-pentacles")) return "#D9A63F";
  return "#7e63c9";
}

// ─── types ──────────────────────────────────────────────────────────
interface CardInfo { cardId: string; cardName: string; cardOrientation: string; }
interface JournalEntry {
  id: string; cardId: string; cardName: string; cardOrientation: string;
  cards: CardInfo[]; astrologyTag: string; astrologyDescription: string;
  morningTheme: string | null; morningQuestion: string | null;
  morningQuestionDescription: string | null;
  journalText: string | null; eveningEcho: string | null;
  isComplete: boolean;
}
type ManualCardCategory = "all" | "major" | "wands" | "swords" | "cups" | "pentacles" | "hearts" | "diamonds" | "clubs" | "spades";
interface ManualSelectedCard { cardId: string; orientation: "upright" | "reversed"; }

const SPREAD_OPTIONS = [
  { count: 1, label: "1张", labelEn: "1 Card" },
  { count: 3, label: "3张", labelEn: "3 Cards" },
  { count: 5, label: "5张", labelEn: "5 Cards" },
];
const MANUAL_CARD_CATEGORIES: Array<{ id: ManualCardCategory; label: string }> = [
  { id: "all", label: "全部" },
  { id: "major", label: "大阿卡纳" },
  { id: "wands", label: "权杖组" },
  { id: "swords", label: "宝剑组" },
  { id: "cups", label: "圣杯组" },
  { id: "pentacles", label: "星币组" },
];
const MIN_CARD_COUNT = 1;
const MAX_CARD_COUNT = 7;

function clampCardCount(n: number) {
  return Math.min(MAX_CARD_COUNT, Math.max(MIN_CARD_COUNT, n));
}

// ─── component ─────────────────────────────────────────────────────
export function MorningScreen() {
  const { t, i18n } = useTranslation();
  const { demoUser } = useDemo();
  const { cardSystem, setCardSystem } = useSettings();
  const user = demoUser;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [cards, setCards] = useState<Array<{ card: AnyCard; info: CardInfo }>>([]);
  const [phase, setPhase] = useState<"loading" | "pre-draw" | "drawing" | "drawn" | "generating" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomCountPicker, setShowCustomCountPicker] = useState(false);
  const [showCardSystemPicker, setShowCardSystemPicker] = useState(false);
  const [customCountDraft, setCustomCountDraft] = useState(1);
  const [cardCount, setCardCount] = useState(1);
  const [selectedCards, setSelectedCards] = useState<ManualSelectedCard[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualCardCategory, setManualCardCategory] = useState<ManualCardCategory>("all");

  const isZh = i18n.language === "zh-CN";
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const dateInfo = getDateInfo(selectedDateObj);
  const moonPhase = getMoonPhase(dateInfo.lunarDate);
  const astrology = getTodayAstrology(selectedDateObj);
  const solarDateString = `${dateInfo.solarYear}年${dateInfo.solarMonth}月${dateInfo.solarDay}日`;
  const astrologyTag = entry?.astrologyTag ?? astrology.name;
  const astrologySummary = getAstrologySummary(moonPhase.name, astrologyTag);

  // ── category filter for manual pick ──
  const MAJOR_ARCANA_IDS = new Set([
    "fool","magician","high-priestess","empress","emperator","hierophant",
    "lovers","chariot","strength","hermit","wheel","justice",
    "hanged-man","death","temperance","devil","tower","star","moon","sun","judgement","world",
  ]);
  function getManualCardCategory(card: TarotCard): ManualCardCategory {
    if (MAJOR_ARCANA_IDS.has(card.id)) return "major";
    if (card.id.endsWith("-wands")) return "wands";
    if (card.id.endsWith("-swords")) return "swords";
    if (card.id.endsWith("-cups")) return "cups";
    if (card.id.endsWith("-pentacles")) return "pentacles";
    return "all";
  }
  const manualCardsPool = cardSystem === "lenormand" ? LENORMAND_CARDS : TAROT_CARDS;
  const filteredManualCards = useMemo(
    () => cardSystem === "lenormand"
      ? LENORMAND_CARDS.filter((card) => manualCardCategory === "all" || card.suit === manualCardCategory)
      : TAROT_CARDS.filter((card) => manualCardCategory === "all" || getManualCardCategory(card) === manualCardCategory),
    [manualCardCategory, cardSystem],
  );

  // Lenormand categories
  const manualCardCategories = cardSystem === "lenormand"
    ? [
        { id: "all" as const, label: "全部" },
        { id: "hearts" as const, label: "红心组" },
        { id: "diamonds" as const, label: "方块组" },
        { id: "clubs" as const, label: "梅花组" },
        { id: "spades" as const, label: "黑桃组" },
      ]
    : MANUAL_CARD_CATEGORIES;

  // ── handlers ────────────────────────────────────────────────────
  const setNextCardCount = (next: number) => {
    setCardCount(clampCardCount(next));
    setSelectedCards([]);
  };

  const applyEntry = useCallback((next: JournalEntry | null) => {
    setEntry(next);
    if (!next) { setCards([]); setPhase("pre-draw"); return; }
    const cardInfos: CardInfo[] = next.cards?.length
      ? next.cards
      : [{ cardId: next.cardId, cardName: next.cardName, cardOrientation: next.cardOrientation }];
    const resolved = cardInfos.map((info) => {
      let c = getCardById(info.cardId);
      if (!c) {
        const lc = getLenormandCardById(info.cardId);
        if (lc) {
          c = {
            id: lc.id,
            name: lc.name,
            nameZh: lc.nameZh,
            element: lc.suit,
            keywords: lc.keywords,
            uprightTheme: lc.uprightTheme,
            reversedTheme: lc.reversedTheme,
            color: lc.color,
            imageSymbol: "lenormand",
          } as TarotCard;
        }
      }
      return c ? { card: c, info } : null;
    }).filter((x): x is { card: TarotCard; info: CardInfo } => Boolean(x));
    setCards(resolved);
    setCardCount(resolved.length || 1);
    setPhase(next.morningTheme ? "ready" : "drawn");
  }, []);

  const loadEntryForDate = useCallback(
    async (date: string) => {
      try {
        const res = await request(`/api/journal?date=${date}`);
        const data = await res.json();
        applyEntry(data.entry ?? null);
      } catch {
        setEntry(null); setCards([]); setPhase("pre-draw");
      }
    },
    [applyEntry],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cosmic-echo.selected-date", selectedDate);
    }
    // Safety: auto-transition from loading to pre-draw after timeout
    const safetyTimer = window.setTimeout(() => {
      setPhase((prev) => (prev === "loading" ? "pre-draw" : prev));
    }, 3000);
    const loadTimer = window.setTimeout(() => {
      if (user) { void loadEntryForDate(selectedDate); }
      else { setPhase("pre-draw"); }
    }, 0);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(safetyTimer);
    };
  }, [loadEntryForDate, selectedDate, user]);

  const handleSelectDate = (date: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem("cosmic-echo.selected-date", date);
    setSelectedDate(date);
    setShowDatePicker(false);
    setEntry(null); setCards([]); setPhase("loading");
    void loadEntryForDate(date);
  };

  const handleDrawCards = async (cardIds?: string[], manualCards?: ManualSelectedCard[]) => {
    if (!user) return;
    setShowPicker(false); setError(null); setPhase("drawing");
    try {
      const body = manualCards?.length
        ? { cards: manualCards, reset: true, date: selectedDate, cardSystem }
        : cardIds
          ? { cardIds, reset: true, date: selectedDate, cardSystem }
          : { count: cardCount, reset: true, date: selectedDate, cardSystem };
      const res = await request("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      applyEntry(data.entry ?? null);
    } catch {
      setError("抽牌失败，请重试。");
      setPhase("pre-draw");
    }
  };

  const handleGenerateTheme = async () => {
    if (!entry || cards.length === 0) return;
    setError(null); setPhase("generating");
    try {
      const res = await request("/api/journal/morning-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: cards.map((item) => ({
            cardId: item.info.cardId,
            cardOrientation: item.info.cardOrientation,
          })),
          astrologyTag: entry.astrologyTag,
          astrologyDescription: entry.astrologyDescription,
          moonPhase: moonPhase.name,
          locale: i18n.language,
          cardSystem,
        }),
      });
      const ai = await res.json();
      // Cache morning theme to localStorage as fallback for EveningScreen
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("cosmic-echo.cached-morning", JSON.stringify({
            morningTheme: ai.morningTheme,
            morningQuestion: ai.morningQuestion,
            morningQuestionDescription: ai.morningQuestionDescription,
            date: selectedDate,
          }));
        } catch { /* localStorage may be full */ }
      }
      const patchRes = await request("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          morningTheme: ai.morningTheme,
          morningQuestion: ai.morningQuestion,
          morningQuestionDescription: ai.morningQuestionDescription,
        }),
      });
      const patchData = await patchRes.json();
      applyEntry(patchData.entry ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成失败，请重试。");
      setPhase("drawn");
    }
  };

  const handleManualPick = (cardId: string) => {
    if (selectedCards.some((c) => c.cardId === cardId)) {
      setSelectedCards((prev) => prev.filter((c) => c.cardId !== cardId));
      return;
    }
    if (selectedCards.length < cardCount) {
      setSelectedCards((prev) => [...prev, { cardId, orientation: "upright" }]);
    }
  };

  const handleManualReverseToggle = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.map((c) =>
        c.cardId === cardId
          ? { ...c, orientation: c.orientation === "upright" ? "reversed" : "upright" }
          : c,
      ),
    );
  };

  const confirmManualPick = () => {
    if (selectedCards.length === cardCount) {
      void handleDrawCards(undefined, selectedCards);
      setSelectedCards([]);
    }
  };

  // ─── SVG icons (inline) ────────────────────────────────────────
  const QuestionIllustration = () => (
    <svg width="78" height="88" viewBox="0 0 78 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="windowSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8DDF5" /><stop offset="100%" stopColor="#b8a0d0" />
        </linearGradient>
      </defs>
      <path d="M39 6 C58 6 68 22 68 42 L68 84 L10 84 L10 42 C10 22 20 6 39 6Z" fill="url(#windowSky)" opacity="0.35" />
      <path d="M39 6 C58 6 68 22 68 42 L68 84 L10 84 L10 42 C10 22 20 6 39 6Z" stroke="#9b7dd4" strokeWidth="1.4" fill="none" opacity="0.55" />
      <line x1="8" y1="84" x2="70" y2="84" stroke="#9b7dd4" strokeWidth="1.4" opacity="0.45" />
      <path d="M50 26 A8 8 0 1 1 50 44 A5.5 8 0 1 0 50 26Z" fill="#F5E6C0" opacity="0.85" />
      <circle cx="24" cy="32" r="1" fill="white" opacity="0.9" />
      <circle cx="58" cy="38" r="0.8" fill="white" opacity="0.7" />
      <circle cx="30" cy="22" r="0.7" fill="white" opacity="0.6" />
      <circle cx="52" cy="18" r="0.7" fill="white" opacity="0.6" />
      <circle cx="39" cy="56" r="4.5" fill="#7e63c9" />
      <path d="M39 60 L39 74 M34 64 L39 60 L44 64 M33 74 C33 71 39 70 39 70 C39 70 45 71 45 74" stroke="#7e63c9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M64 82 C65 77 62 74 65 71 M67 82 C67 77 70 74 68 71" stroke="#9b7dd4" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" fill="none" />
    </svg>
  );

  // ─── render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f6fc]">
      <main className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-7 pt-8 pb-20">
        {/* ── header ── */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: "#2d2a34" }}>
              {t("app.name")}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7e63c9" }}>
              {cardSystem === "lenormand" ? "Lenormand Journal" : "Cosmic Echo Journal"}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCardSystemPicker(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border mt-0.5"
            style={{ borderColor: "#dbd5e8", backgroundColor: "#ffffff" }}
            aria-label="Card system settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7e63c9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </motion.button>
        </div>

        {/* ── date card ── */}
        <button type="button" onClick={() => setShowDatePicker(true)} className="w-full rounded-[26px] border border-[#dbd5e8] bg-white/75 px-4 py-2.5 text-left shadow-[0_12px_30px_rgba(80,42,18,0.06)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-2xl leading-none">
              {moonPhase.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#2d2a34]">
                <span className="text-[13px] font-bold">{solarDateString}</span>
                <span className="text-[#9794a2]">{dateInfo.weekday}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f8f6fc] px-2 py-0.5 text-[11px] font-semibold text-[#5c5a64]">
                  {dateInfo.lunarDateText}
                </span>
                <span className="rounded-full bg-[#f2eff8] px-2 py-0.5 text-[11px] font-bold text-[#c8708a]">
                  {moonPhase.name}
                </span>
                <span className="rounded-full bg-[#f5ecff] px-2 py-0.5 text-[11px] font-bold text-[#7a5db4]">
                  {astrologyTag}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] leading-4 text-[#5c5a64]">{astrologySummary}</p>
            </div>
          </div>
        </button>

        {/* ── main interaction area ── */}
        <div className="mt-1">
          <AnimatePresence mode="sync">
            {/* ── pre-draw / loading: show card back + spread options ── */}
            {(phase === "pre-draw" || phase === "loading") && (
              <motion.div key="pre-draw" animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center">
                {/* card back with glow */}
                <div className="relative flex w-full items-center justify-center py-3">
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[320px] w-[320px] -translate-y-1/2 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(126,99,201,0.10) 0%, rgba(126,99,201,0.06) 38%, rgba(126,99,201,0.05) 58%, transparent 75%)", filter: "blur(18px)" }} />
                  <div className={`relative z-10 ${phase === "loading" ? "pointer-events-none opacity-80" : "cursor-pointer"}`}>
                    <CardBack hint onClick={phase === "pre-draw" ? () => void handleDrawCards() : undefined} />
                  </div>
                </div>

                {/* spread count selector */}
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {SPREAD_OPTIONS.map((opt) => {
                    const active = cardCount === opt.count;
                    return (
                      <motion.button key={opt.count} whileTap={phase === "loading" ? undefined : { scale: 0.97 }} onClick={phase === "loading" ? undefined : () => setNextCardCount(opt.count)}
                        className="flex aspect-square flex-col items-center justify-center rounded-[16px] border bg-white/80 px-2 py-3.5 shadow-[0_8px_18px_rgba(80,42,18,0.04)]"
                        style={{ borderColor: active ? "#c8708a" : "#dbd5e8", boxShadow: active ? "0 0 0 1px rgba(126,99,201,0.25), 0 8px 18px rgba(126,99,201,0.08)" : undefined }}>
                        <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-[8px]"
                          style={{ background: active ? "linear-gradient(180deg, #9b7dd4, #9b7dd4)" : "linear-gradient(180deg, #d8d4e8, #c4bee0)", color: "#fff" }}>
                          {/* mini card icon */}
                          <svg width="18" height="18" viewBox="0 0 24 22" fill="none">
                            <g transform="rotate(-16 5.5 11)"><rect x="1" y="4" width="9" height="14" rx="2.5" fill="currentColor" fillOpacity="0.18" /><rect x="1" y="4" width="9" height="14" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" strokeOpacity="0.9" /></g>
                            <g transform="rotate(16 18.5 11)"><rect x="14" y="4" width="9" height="14" rx="2.5" fill="currentColor" fillOpacity="0.18" /><rect x="14" y="4" width="9" height="14" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none" strokeOpacity="0.9" /></g>
                            <rect x="7.5" y="3" width="9" height="16" rx="3" fill="currentColor" fillOpacity="0.35" />
                            <rect x="7.5" y="3" width="9" height="16" rx="3" stroke="currentColor" strokeWidth="1.3" fill="none" />
                            {active && <path d="M12 7 L13.2 9.6 L16 10 L13.9 12.3 L14.4 15 L12 13.6 L9.6 15 L10.1 12.3 L8 10 L10.8 9.6 Z" fill="currentColor" />}
                          </svg>
                        </div>
                        <span className="text-[14px] font-semibold text-[#2d2a34]">{isZh ? opt.label : opt.labelEn}</span>
                      </motion.button>
                    );
                  })}

                  {/* custom count button */}
                  {(() => {
                    const isCustomActive = !SPREAD_OPTIONS.some((o) => o.count === cardCount);
                    return (
                      <motion.button whileTap={phase === "loading" ? undefined : { scale: 0.97 }} onClick={phase === "loading" ? undefined : () => { setCustomCountDraft(cardCount); setShowCustomCountPicker(true); }}
                        className="flex aspect-square flex-col items-center justify-center rounded-[16px] border bg-white/80 px-2 py-3.5 shadow-[0_8px_18px_rgba(80,42,18,0.04)]"
                        style={{ borderColor: isCustomActive ? "#c8708a" : "#dbd5e8", boxShadow: isCustomActive ? "0 0 0 1px rgba(126,99,201,0.25), 0 8px 18px rgba(126,99,201,0.08)" : undefined }}>
                        <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-[8px]"
                          style={{ background: isCustomActive ? "linear-gradient(180deg, #9b7dd4, #9b7dd4)" : "transparent", border: isCustomActive ? "none" : "1px dashed #d0c8e0", color: isCustomActive ? "#fff" : "#9794a2" }}>
                          {isCustomActive ? (
                            <span className="text-[14px] font-extrabold leading-none">{cardCount}</span>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 22" fill="none" stroke="currentColor">
                              <g transform="rotate(-16 5.5 11)"><rect x="1" y="4" width="9" height="14" rx="2.5" fill="currentColor" fillOpacity="0.18" /><rect x="1" y="4" width="9" height="14" rx="2.5" strokeWidth="1" fill="none" strokeOpacity="0.7" /></g>
                              <g transform="rotate(16 18.5 11)"><rect x="14" y="4" width="9" height="14" rx="2.5" fill="currentColor" fillOpacity="0.18" /><rect x="14" y="4" width="9" height="14" rx="2.5" strokeWidth="1" fill="none" strokeOpacity="0.7" /></g>
                              <rect x="7.5" y="3" width="9" height="16" rx="3" fill="currentColor" fillOpacity="0.3" />
                              <rect x="7.5" y="3" width="9" height="16" rx="3" strokeWidth="1.2" fill="none" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: isCustomActive ? "#9b7dd4" : "#2d2a34" }}>
                          {isCustomActive ? (isZh ? `${cardCount}张` : `${cardCount} Card${cardCount > 1 ? "s" : ""}`) : (isZh ? "自定义" : "Custom")}
                        </span>
                      </motion.button>
                    );
                  })()}
                </div>

                {/* draw button */}
                <motion.button whileTap={phase === "loading" ? undefined : { scale: 0.98 }} onClick={phase === "loading" ? undefined : () => void handleDrawCards()}
                  className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(126,99,201,0.25)]"
                  style={{ background: "linear-gradient(90deg, #9b7dd4 0%, #7a5db4 100%)", opacity: phase === "loading" ? 0.6 : 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m7 7 10 10" /><path d="M8 12h4V8" /><path d="M12 16h4v-4" />
                  </svg>
                  <span>{isZh ? "开始抽牌" : "Start Drawing"}</span>
                </motion.button>

                {/* or / manual pick */}
                <div className="mt-0.5 text-center text-[12px] text-[#9794a2]">{isZh ? "或" : "or"}</div>
                <motion.button whileTap={phase === "loading" ? undefined : { scale: 0.98 }} onClick={phase === "loading" ? undefined : () => { if (!user) return; setSelectedCards([]); setManualCardCategory("all"); setShowPicker(true); }}
                  className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-[#b8a0d0] bg-white/65 text-[15px] font-semibold text-[#7e63c9]"
                  style={{ opacity: phase === "loading" ? 0.6 : 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 6H5a2 2 0 0 0-2 2v4" /><path d="m3 9 3 3 3-3" />
                    <path d="M15 18h4a2 2 0 0 0 2-2v-4" /><path d="m21 15-3-3-3 3" />
                  </svg>
                  <span>{isZh ? "手动选牌" : "Pick Manually"}</span>
                </motion.button>
              </motion.div>
            )}

            {/* ── drawing spinner ── */}
            {phase === "drawing" && (
              <motion.div key="drawing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[300px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-12 w-12 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "#7e63c9", borderTopColor: "transparent" }} />
                  <p className="text-sm font-semibold text-[#9794a2]">{t("morning.drawingCard")}</p>
                </div>
              </motion.div>
            )}

            {/* ── drawn / generating / ready ── */}
            {(phase === "drawn" || phase === "generating" || phase === "ready") && cards.length > 0 && (
              <motion.div key="cards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col items-center space-y-4">
                {/* cards display */}
                <div className="relative w-full max-w-sm">
                  <div className="absolute inset-0 mx-auto h-[320px] w-[320px] -translate-y-4 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(126,99,201,0.10) 0%, rgba(126,99,201,0.05) 42%, transparent 74%)", filter: "blur(22px)" }} />
                  <div className={`mx-auto flex w-full items-center justify-center ${getResultContainerClass(cards.length)}`}>
                    <div className="flex items-center justify-center gap-[10px]">
                      {cards.map((item, index) => (
                        <motion.div key={`${item.info.cardId}-${index}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.12 }} className="flex shrink-0 flex-col items-center" style={{ width: `${getResultCardWidth(cards.length)}%` }}>
                          <div className="overflow-hidden rounded-[22px]" style={{ boxShadow: "0 18px 42px rgba(46,26,71,0.18)" }}>
                            <CardFront card={item.card} orientation={item.info.cardOrientation as "upright" | "reversed"} cardSystem={cardSystem} />
                          </div>
                          <div className="mt-3 flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCardSuitDotColor(item.card.id, cardSystem) }} />
                            <span className="text-[11px] text-[#5c5a64]">{item.card.nameZh}{cardSystem !== "lenormand" ? ` · ${t(`morning.orientation.${item.info.cardOrientation}`)}` : ""}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* generate / generated area */}
                {(phase === "drawn" || phase === "generating") && (
                  <div className="relative z-20 w-full space-y-3">
                    <motion.button whileTap={phase === "drawn" ? { scale: 0.97 } : undefined} onClick={phase === "drawn" ? handleGenerateTheme : undefined}
                      disabled={phase !== "drawn"} className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold tracking-widest text-white shadow-lg"
                      style={{ background: "linear-gradient(90deg, #9b7dd4 0%, #7a5db4 100%)", opacity: phase === "generating" ? 0.82 : 1, pointerEvents: phase === "drawn" ? "auto" : "none" }}>
                      <span>{phase === "generating" ? (isZh ? "正在生成今日指引..." : "Generating guidance...") : (isZh ? "生成今日指引" : "Generate Guidance")}</span>
                    </motion.button>
                  </div>
                )}

                {/* ready: show lesson + question */}
                {phase === "ready" && entry?.morningTheme && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
                    <div className="flex gap-3.5">
                      {/* left icon column */}
                      <div className="flex flex-col items-center gap-3 pt-1">
                        <div className="text-[#7e63c9]">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        </div>
                        <div className="h-14 w-px bg-[#7e63c9]/15" />
                        <div className="text-[#7e63c9]">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        </div>
                      </div>
                      {/* right content */}
                      <div className="flex-1">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7e63c9]">{t("morning.lesson")}</p>
                          <h3 className="font-heading mt-1 text-[18px] font-bold leading-snug text-[#2d2a34]">{entry.morningTheme}</h3>
                        </div>
                        <div className="mt-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7e63c9]">{t("morning.question")}</p>
                          <p className="font-heading mt-1 text-[15px] font-bold leading-snug text-[#2d2a34]">{entry.morningQuestion}</p>
                          {entry.morningQuestionDescription && (
                            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#5c5a64] font-['Microsoft_YaHei']">{entry.morningQuestionDescription}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* go to evening note */}
                    <Link href="/evening" className="block w-full">
                      <motion.div whileTap={{ scale: 0.97 }} className="flex h-[52px] w-full items-center justify-center rounded-full text-[15px] font-bold text-white shadow-[0_14px_28px_rgba(126,99,201,0.25)]"
                        style={{ background: "linear-gradient(90deg, #9b7dd4 0%, #7a5db4 100%)" }}>
                        {t("morning.toEvening")}
                      </motion.div>
                    </Link>

                    {/* share card promo */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-[22px] border p-4" style={{ background: "linear-gradient(to right, #f2eff8, #e0d5e8)", borderColor: "#c0a0d0" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-[#7e63c9]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 8.5c.7.7 1.1 1.1 2.6 0 2.6-2 4.5-4.5 4.5H9.5l-2.5 2.5v-2.5c-1.4 0-2.5-1.1-2.5-2.5v-4c0-1.4 1.1-2.5 2.5-2.5h5c1 0 1.9.4 2.6 1.1z" />
                            <path d="M18 11c1.7 0 3-1.3 3-3s-1.3-3-3-3" /><path d="M18 5.5V5" /><path d="M18 14v-.5" /><path d="M19.5 11H20" /><path d="M16.5 11H17" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold text-[#2d2a34]">{t("evening.shareCard")}</h4>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#5c5a64]">{t("shareCard.subtitle")}</p>
                        </div>
                        <Link href="/share-card">
                          <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0 cursor-pointer rounded-full border bg-white px-4 py-1.5 text-[13px] font-bold text-[#7e63c9]" style={{ borderColor: "rgba(126,99,201,0.25)" }}>
                            {t("shareCard.share")}
                          </motion.div>
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {error && <p className="text-center text-xs text-red-600">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* ── date picker sheet ── */}
      <DatePickerSheet open={showDatePicker} value={selectedDate}
        maxDate={new Date().toISOString().split("T")[0]}
        onClose={() => setShowDatePicker(false)} onConfirm={handleSelectDate} />

      {/* ── manual pick sheet ── */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40" style={{ backgroundColor: "rgba(30,15,5,0.45)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowPicker(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute bottom-0 left-0 right-0 z-50 overflow-hidden rounded-t-[28px]"
              style={{ backgroundColor: "#f8f6fc", maxHeight: "80vh" }}>
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-[#dbd5e8]" /></div>
              <div className="flex items-center justify-between border-b border-[#dbd5e8] px-6 pb-4">
                <div>
                  <h3 className="font-heading text-base font-bold text-[#2d2a34]">{t("morning.pickManual")}</h3>
                  <p className="mt-0.5 text-[11px] text-[#9794a2]">
                    {cardSystem === "lenormand"
                      ? (isZh ? `选择 ${cardCount} 张牌（${selectedCards.length}/${cardCount}）` : `Pick ${cardCount} card(s) (${selectedCards.length}/${cardCount})`)
                      : (isZh ? `选择 ${cardCount} 张牌（${selectedCards.length}/${cardCount}），双击卡牌切换为逆位` : `Pick ${cardCount} card(s) (${selectedCards.length}/${cardCount}). Double-click a card to reverse it.`)}
                  </p>
                </div>
                <button type="button" onClick={() => setShowPicker(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eae5f3]">×</button>
              </div>
              {/* category tabs + count stepper */}
              <div className="flex items-center gap-3 px-6 pt-4">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                  {manualCardCategories.map((cat) => {
                    const active = manualCardCategory === cat.id;
                    return (
                      <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => setManualCardCategory(cat.id)}
                        className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
                        style={{ backgroundColor: active ? "#eae5f3" : "rgba(255,255,255,0.7)", borderColor: active ? "#7e63c9" : "#dbd5e8", color: active ? "#7e63c9" : "#9794a2" }}>
                        {cat.label}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-[#d0c8e0] px-2 py-1">
                  <button type="button" onClick={() => setNextCardCount(cardCount - 1)} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d0c8e0] text-[10px] font-bold text-[#5c5a64]">−</button>
                  <span className="min-w-5 text-center text-[11px] font-bold text-[#2d2a34]">{cardCount}</span>
                  <button type="button" onClick={() => setNextCardCount(cardCount + 1)} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d0c8e0] text-[10px] font-bold text-[#5c5a64]">+</button>
                </div>
              </div>
              {/* card grid */}
              <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(80vh - 196px)" }}>
                <div className="grid grid-cols-3 gap-3">
                  {filteredManualCards.map((card) => {
                    const imgUrl = cardSystem === "lenormand"
                      ? getLenormandCardImageUrl(card.id)
                      : getTarotCardImageUrl(card.id);
                    const selectedCard = selectedCards.find((item) => item.cardId === card.id);
                    const isSelected = Boolean(selectedCard);
                    return (
                      <motion.button key={card.id} whileTap={{ scale: 0.94 }}
                        onClick={() => handleManualPick(card.id)}
                        onDoubleClick={() => cardSystem !== "lenormand" && selectedCard && handleManualReverseToggle(card.id)}
                        className="relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all"
                        style={{ backgroundColor: isSelected ? "#eae5f3" : "rgba(255,255,255,0.7)", borderColor: isSelected ? "#7e63c9" : "#dbd5e8", boxShadow: isSelected ? "0 2px 8px rgba(126,99,201,0.15)" : "none" }}>
                        {isSelected && (
                          <div className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#7e63c9] text-[10px] font-bold text-white">
                            {selectedCards.findIndex((item) => item.cardId === card.id) + 1}
                          </div>
                        )}
                        {selectedCard?.orientation === "reversed" && cardSystem !== "lenormand" && (
                          <div className="absolute left-1 top-1 z-20 rounded-full bg-[#5a4270] px-1.5 py-0.5 text-[9px] font-bold text-white">逆位</div>
                        )}
                        <div className="w-full overflow-hidden rounded-xl" style={{ aspectRatio: "2/3" }}>
                          <CardFront card={card as any} orientation={selectedCard?.orientation ?? "upright"} cardSystem={cardSystem} />
                        </div>
                        <p className="text-center text-[10px] font-bold leading-tight text-[#2d2a34]">{card.nameZh}</p>
                        <p className="text-center text-[8px] leading-tight text-[#2d2a34]/50">{card.name}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {/* confirm bar */}
              {selectedCards.length > 0 && (
                <motion.div initial={{ y: 60 }} animate={{ y: 0 }}
                  className="border-t border-[#dbd5e8] bg-[#f8f6fc] px-6 pt-3 pb-4"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={confirmManualPick}
                    disabled={selectedCards.length !== cardCount}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold tracking-widest text-white shadow-lg disabled:opacity-40"
                    style={{ background: "linear-gradient(90deg, #c8708a 0%, #7a5db4 100%)" }}>
                    {isZh ? `确认选择 (${selectedCards.length}/${cardCount})` : `Confirm (${selectedCards.length}/${cardCount})`}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── custom count picker ── */}
      <AnimatePresence>
        {showCustomCountPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40" style={{ backgroundColor: "rgba(30,15,5,0.55)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowCustomCountPicker(false)} />
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="relative w-full max-w-[340px] overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(30,15,5,0.25)]"
                onClick={(e) => e.stopPropagation()}>
                {/* top area */}
                <div className="flex flex-col items-center pt-8 pb-2">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_4px_16px_rgba(126,99,201,0.18)]" style={{ background: "linear-gradient(135deg, #7a5db4 0%, #7a5db4 100%)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3 L4 7v10l8 4 8-4V7z" /><path d="m8.5 10.5 3.5-2 3.5 2v4l-3.5 2-3.5-2z" />
                    </svg>
                  </div>
                  <h3 className="font-heading text-[18px] font-bold text-[#2d2a34]">{isZh ? "自定义抽取张数" : "Custom Card Count"}</h3>
                </div>
                {/* number selector */}
                <div className="px-8 pb-4">
                  <div className="flex items-center justify-center gap-1.5">
                    {Array.from({ length: MAX_CARD_COUNT }, (_, i) => i + 1).map((num) => {
                      const isActive = num === customCountDraft;
                      return (
                        <motion.button key={num} whileTap={{ scale: 0.92 }} onClick={() => setCustomCountDraft(num)}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold transition-colors"
                          style={{ backgroundColor: isActive ? "#7a5db4" : "#F5F0F7", color: isActive ? "#FFFFFF" : "#9794a2" }}>
                          {num}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                {/* stepper */}
                <div className="flex items-center justify-center gap-6 pb-6">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setCustomCountDraft((p) => clampCardCount(p - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d0c8e0] text-[14px] font-bold text-[#5c5a64]">−</button>
                    <span className="min-w-[32px] text-center text-[18px] font-bold text-[#2d2a34]">{customCountDraft}</span>
                    <button type="button" onClick={() => setCustomCountDraft((p) => clampCardCount(p + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d0c8e0] text-[14px] font-bold text-[#5c5a64]">+</button>
                  </div>
                </div>
                {/* confirm button */}
                <div className="px-6 pb-6">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setNextCardCount(customCountDraft); setShowCustomCountPicker(false); }}
                    className="flex w-full items-center justify-center rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-lg"
                    style={{ background: "linear-gradient(90deg, #c8708a 0%, #7a5db4 100%)" }}>
                    {isZh ? "确认" : "Confirm"}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

        {/* card system picker */}
        <CardSystemPicker
          open={showCardSystemPicker}
          current={cardSystem}
          onClose={() => setShowCardSystemPicker(false)}
          onSelect={(system: CardSystem) => {
            setCardSystem(system);
            setShowCardSystemPicker(false);
          }}
        />
      </main>
    </div>
  );
}
