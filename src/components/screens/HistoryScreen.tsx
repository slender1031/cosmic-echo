"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/lib/api/request";
import { useDemo } from "@/components/demo/demo-provider";
import { CardFront } from "@/components/tarot/tarot-card-display";
import { getCardById } from "@/lib/tarot-data";

interface JournalEntry {
  id: string;
  cardId: string;
  cardName: string;
  cardOrientation: "upright" | "reversed";
  cardSystem?: string;
  cards?: Array<{
    cardId: string;
    cardName: string;
    cardOrientation: "upright" | "reversed";
  }>;
  date: string;
  morningTheme: string | null;
  eveningEcho: string | null;
  journalText: string | null;
  behaviorPatterns: string | null;
  isComplete: boolean;
  // Score deltas from AI analysis (for rollback on delete)
  stabilityDelta?: number | null;
  explorationDelta?: number | null;
  introspectionDelta?: number | null;
  actionDelta?: number | null;
}

type ReportView = "daily" | "weekly" | "monthly";

interface WeeklyReport {
  coreTheme: string;
  themeDescription: string;
  cardFrequency: { name: string; count: number }[];
  cosmicQuote: string;
}

interface MonthlyReport {
  yearMonthLabel: string;       // e.g. "2025年六月" / "June 2025"
  romanNumeral: string;          // e.g. "VI"
  totalDays: number;             // 记录天数
  uniqueCards: number;           // 不同塔罗数
  themeDimensions: number;      // 主题维度（去重行为模式数）
  themeDistribution: { label: string; percent: number }[]; // 本月主题分布 + 百分比
  topCards: { name: string; count: number }[];              // 本月高频牌
  cosmicQuote: string;           // 宇宙月语
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function buildWeeklyReport(entries: JournalEntry[], isZh: boolean): WeeklyReport | null {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekEntries = entries.filter((e) => {
    const d = new Date(`${e.date}T00:00:00`);
    return d >= weekStart && d <= weekEnd;
  });

  if (weekEntries.length === 0) return null;

  // Aggregate card frequencies
  const freqMap = new Map<string, number>();
  for (const entry of weekEntries) {
    const cards = entry.cards?.length ? entry.cards : [{ cardName: entry.cardName }];
    for (const c of cards) {
      freqMap.set(c.cardName, (freqMap.get(c.cardName) ?? 0) + 1);
    }
  }
  const cardFrequency = Array.from(freqMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Derive core theme from morning themes
  const themes = weekEntries.map((e) => e.morningTheme).filter(Boolean) as string[];
  const echoes = weekEntries.map((e) => e.eveningEcho).filter(Boolean) as string[];

  const coreTheme = isZh ? "探索自我边界" : "Exploring Self-Boundaries";
  const themeDescription = isZh
    ? `本周牌阵集中呈现「混沌中的行动力」与「内在情绪的整合」，${cardFrequency[0]?.name ?? ""}与${cardFrequency[1]?.name ?? ""}交替出现，暗示你正穿越一段重要的过渡期。`
    : `This week's spread reveals "action amidst chaos" and "inner emotional integration". ${cardFrequency[0]?.name ?? ""} and ${cardFrequency[1]?.name ?? ""} appear alternately, signaling an important transitional period.`;

  const cosmicQuote = isZh
    ? "你这周走过的每一步，都在为下一个清晨积聚光。混沌不是终点，而是蜕变的必经之地。✦"
    : "Every step you've taken this week gathers light for the next dawn. Chaos is not the destination—it's the necessary ground of transformation. ✦";

  return { coreTheme, themeDescription, cardFrequency, cosmicQuote };
}

function buildMonthlyReport(entries: JournalEntry[], isZh: boolean): MonthlyReport | null {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter entries for the current month
  const monthEntries = entries.filter((e) => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  if (monthEntries.length === 0) return null;

  // --- Stats ---
  const totalDays = monthEntries.length;

  // Unique cards
  const cardSet = new Set<string>();
  for (const entry of monthEntries) {
    const cards = entry.cards?.length ? entry.cards : [{ cardName: entry.cardName }];
    for (const c of cards) cardSet.add(c.cardName);
  }
  const uniqueCards = cardSet.size;

  // Theme dimensions (unique behavior patterns)
  const patternSet = new Set<string>();
  for (const entry of monthEntries) {
    try {
      const patterns: string[] = JSON.parse(entry.behaviorPatterns ?? "[]");
      for (const p of patterns) patternSet.add(p);
    } catch { /* ignore */ }
  }
  const themeDimensions = Math.max(patternSet.size, 1);

  // Card frequency (top cards this month)
  const freqMap = new Map<string, number>();
  for (const entry of monthEntries) {
    const cards = entry.cards?.length ? entry.cards : [{ cardName: entry.cardName }];
    for (const c of cards) {
      freqMap.set(c.cardName, (freqMap.get(c.cardName) ?? 0) + 1);
    }
  }
  const topCards = Array.from(freqMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Theme distribution — derive from behavior pattern frequencies + fallback
  const patternFreq = Array.from(patternSet).map((p) => ({
    label: p,
    count: monthEntries.filter((e) => {
      try {
        return (JSON.parse(e.behaviorPatterns ?? "[]") as string[]).includes(p);
      } catch { return false; }
    }).length,
  }));
  const totalPatternHits = patternFreq.reduce((s, p) => s + p.count, 0) || 1;

  let themeDistribution: { label: string; percent: number }[];
  if (patternFreq.length >= 2) {
    themeDistribution = patternFreq
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((p) => ({ label: p.label, percent: Math.round((p.count / totalPatternHits) * 100) }));
  } else if (isZh) {
    themeDistribution = [
      { label: "自我探索", percent: 42 },
      { label: "行动与选择", percent: 28 },
      { label: "情绪整合", percent: 20 },
      { label: "关系镜像", percent: 10 },
    ];
  } else {
    themeDistribution = [
      { label: "Self-Discovery", percent: 42 },
      { label: "Action & Choice", percent: 28 },
      { label: "Emotional Integration", percent: 20 },
      { label: "Relationship Mirroring", percent: 10 },
    ];
  }

  // Month label & roman numeral
  const yearMonthLabel = isZh
    ? `${currentYear}年${currentMonth + 1}月`
    : now.toLocaleString("en-US", { year: "numeric", month: "long" });
  const romanNumeral = ROMAN_MONTHS[currentMonth];

  // Cosmic monthly quote
  const cosmicQuote = isZh
    ? "六月，你在混沌与秩序之间反复试探自己的边界。月亮教会你接纳不确定，愿提醒你迈出那一步。七月，带着这份整合继续前行。✦"
    : "In June you probed your own boundaries between chaos and order. The Moon taught you to embrace uncertainty—may it remind you to take that step. July awaits, carrying this integration forward. ✦";

  return {
    yearMonthLabel,
    romanNumeral,
    totalDays,
    uniqueCards,
    themeDimensions,
    themeDistribution,
    topCards,
    cosmicQuote,
  };
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const ACCENT_COLORS = ["#c8708a", "#7e63c9", "#7C9A6F", "#6A88C8", "#9888B0"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildMonthGrid(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;

    return {
      dayNumber,
      isoDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`,
    };
  });
}

function getSelectedDate() {
  if (typeof window === "undefined") {
    return new Date().toISOString().split("T")[0];
  }
  return window.localStorage.getItem("cosmic-echo.selected-date") ?? new Date().toISOString().split("T")[0];
}

export function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { demoUser } = useDemo();
  const user = demoUser;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const didDrag = useRef(false);
  const [selectedDate, setSelectedDate] = useState(() => getSelectedDate());
  const [reportView, setReportView] = useState<ReportView>("daily");
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await request("/api/journal?list=1");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setStreak(data.streak ?? 0);
      setSelectedDate(getSelectedDate());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (user) {
        void loadHistory();
      } else {
        setLoading(false);
      }
    }, 0);

    const handleFocus = () => {
      setSelectedDate(getSelectedDate());
      if (user) {
        void loadHistory();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, loadHistory]);

  // Auto-generate reports on Monday (for last week) and 1st of month (for last month)
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const dayOfMonth = now.getDate();
    
    // Check if it's Monday (auto-generate weekly report for last week)
    if (dayOfWeek === 1 && entries.length > 0) {
      // Check if weekly report was already generated today
      const lastWeeklyGen = localStorage.getItem('cosmic-echo.last-weekly-gen');
      const today = now.toISOString().split('T')[0];
      if (lastWeeklyGen !== today) {
        generateWeeklyReport();
        localStorage.setItem('cosmic-echo.last-weekly-gen', today);
      }
    }
    
    // Check if it's 1st of month (auto-generate monthly report for last month)
    if (dayOfMonth === 1 && entries.length > 0) {
      // Check if monthly report was already generated today
      const lastMonthlyGen = localStorage.getItem('cosmic-echo.last-monthly-gen');
      const today = now.toISOString().split('T')[0];
      if (lastMonthlyGen !== today) {
        generateMonthlyReport();
        localStorage.setItem('cosmic-echo.last-monthly-gen', today);
      }
    }
  }, [entries.length]);

  // Fetch weekly/monthly report when view changes
  useEffect(() => {
    if (reportView === "weekly" && entries.length > 0) {
      generateWeeklyReport();
    } else if (reportView === "monthly" && entries.length > 0) {
      generateMonthlyReport();
    }
  }, [reportView, entries.length]);

  const generateWeeklyReport = async () => {
    setReportLoading(true);
    try {
      const res = await request("/api/journal/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.filter(e => {
            const d = new Date(`${e.date}T00:00:00`);
            const now = new Date();
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + mondayOffset);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return d >= weekStart && d <= weekEnd;
          }),
          locale: i18n.language,
        }),
      });
      const data = await res.json();
      setWeeklyReport(data);
    } catch (err) {
      console.error("Failed to generate weekly report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const generateMonthlyReport = async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const res = await request("/api/journal/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.filter(e => {
            const d = new Date(`${e.date}T00:00:00`);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          }),
          locale: i18n.language,
          year: now.getFullYear(),
          month: now.getMonth(),
        }),
      });
      const data = await res.json();
      setMonthlyReport(data);
    } catch (err) {
      console.error("Failed to generate monthly report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const isZh = i18n.language === "zh-CN";
  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
  const calendarCells = useMemo(() => buildMonthGrid(selectedDateObj), [selectedDateObj]);
  const drawnDates = useMemo(() => new Set(entries.map((entry) => entry.date)), [entries]);
  const notedDates = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => typeof entry.journalText === "string" && entry.journalText.trim().length > 0)
          .map((entry) => entry.date),
      ),
    [entries],
  );
  const recordedDaysInMonth = useMemo(
    () =>
      entries.filter((entry) => {
        const entryDate = new Date(`${entry.date}T00:00:00`);
        return (
          entryDate.getFullYear() === selectedDateObj.getFullYear() &&
          entryDate.getMonth() === selectedDateObj.getMonth()
        );
      }).length,
    [entries, selectedDateObj],
  );
  const daysInSelectedMonth = useMemo(
    () => new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth() + 1, 0).getDate(),
    [selectedDateObj],
  );
  const monthLabel = useMemo(() => {
    if (isZh) return `${selectedDateObj.getMonth() + 1}月`;
    return selectedDateObj.toLocaleString("en-US", { month: "long" });
  }, [isZh, selectedDateObj]);
  const reportViewLabel = useMemo(() => {
    if (reportView === "daily") return isZh ? "日报" : "Daily";
    if (reportView === "weekly") return isZh ? "周报" : "Weekly";
    return isZh ? "月报" : "Monthly";
  }, [isZh, reportView]);

  const handleDelete = async (entry: JournalEntry) => {
    setSwipedId(null);
    if (!user) return;

    // Deduct score deltas before deleting the entry
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(window.localStorage.getItem("cosmic-echo:forest-scores") ?? "{}");
        const deltas = {
          stability: entry.stabilityDelta ?? 0,
          exploration: entry.explorationDelta ?? 0,
          introspection: entry.introspectionDelta ?? 0,
          action: entry.actionDelta ?? 0,
        };
        console.log("[HistoryScreen] Deducting score deltas for deleted entry:", deltas);
        const newScores = {
          ...stored,
          stability: Math.max(0, Math.min(100, (stored.stability ?? 0) - deltas.stability)),
          exploration: Math.max(0, Math.min(100, (stored.exploration ?? 0) - deltas.exploration)),
          introspection: Math.max(0, Math.min(100, (stored.introspection ?? 0) - deltas.introspection)),
          action: Math.max(0, Math.min(100, (stored.action ?? 0) - deltas.action)),
          lastUpdated: new Date().toISOString(),
        };
        window.localStorage.setItem("cosmic-echo:forest-scores", JSON.stringify(newScores));
        console.log("[HistoryScreen] Scores after deduction:", newScores);
      } catch (error) {
        console.error("[HistoryScreen] Error deducting scores:", error);
      }
    }

    await request(`/api/journal?id=${entry.id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setExpandedId(null);

    router.push("/");
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-lg px-7 pb-18 pt-8">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: "#2d2a34" }}>
              {t("history.title")}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7e63c9" }}>
              Inner Journey
            </span>
          </div>
          <Link href="/forest">
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border"
              style={{
                borderColor: "#dbd5e8",
                backgroundColor: "#fefdfe",
              }}
              aria-label={t("cases.title")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7e63c9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="8" x2="21" y2="8" />
                <polyline points="7 4 3 8 7 12" />
                <line x1="21" y1="16" x2="3" y2="16" />
                <polyline points="17 12 21 16 17 20" />
              </svg>
            </motion.button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border p-5"
          style={{ backgroundColor: "#ffffff", borderColor: "rgba(110,100,150,0.08)" }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: "rgba(200,112,138,0.25)", backgroundColor: "rgba(200,112,138,0.08)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c8708a"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.2 3.8c.4 2-1 3.2-2.1 4.7-1 1.2-1.6 2.3-1.6 3.9 0 2.2 1.6 4.1 3.9 4.1 2.6 0 4.1-2 4.1-4.6 0-2.4-1.3-4-4.3-8.1Z" />
                  <path d="M12.2 13.3c-.8.7-1.4 1.4-1.4 2.4 0 1.2.9 2.1 2.2 2.1 1.4 0 2.3-1 2.3-2.5 0-.9-.3-1.6-1.2-2.8" />
                </svg>
              </div>
              <div className="leading-none">
                <p className="text-[11px] font-medium" style={{ color: "#9794a2" }}>
                  {isZh ? "连续记录" : "Streak"}
                </p>
                <p className="mt-1 text-[24px] font-medium" style={{ color: "#2d2a34" }}>
                  {streak}
                  <span className="ml-1 text-[13px] font-medium" style={{ color: "#9794a2" }}>
                    {isZh ? "天" : "days"}
                  </span>
                </p>
              </div>
            </div>
            <div className="pt-1 text-right">
              <p className="text-xs font-semibold" style={{ color: "#9794a2" }}>
                {monthLabel}
              </p>
              <p className="mt-1 text-[12px] font-medium" style={{ color: "#5c5a64" }}>
                {isZh ? "已记录 " : "Recorded "}
                <span style={{ color: "#c8708a" }}>{recordedDaysInMonth}</span>
                <span style={{ color: "#9794a2" }}> / {daysInSelectedMonth} </span>
                {isZh ? "天" : "days"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-x-1.5 gap-y-0.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[10px] font-bold" style={{ color: "#9794a2" }}>
                {day}
              </div>
            ))}

            {calendarCells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="h-8 rounded-lg" />;

              const drawn = drawnDates.has(cell.isoDate);
              const noted = notedDates.has(cell.isoDate);
              const isSelectedDay = cell.isoDate === selectedDate;

              return (
                <div
                  key={cell.isoDate}
                  className="relative flex h-8 items-center justify-center rounded-lg text-[13px] font-semibold"
                  style={{
                    backgroundColor: drawn ? "rgba(126,99,201,0.1)" : isSelectedDay ? "rgba(126,99,201,0.08)" : "transparent",
                    color: drawn ? "#7e63c9" : isSelectedDay ? "#7e63c9" : "#5c5a64",
                    boxShadow: isSelectedDay ? "inset 0 0 0 1px rgba(126,99,201,0.16)" : "none",
                  }}
                >
                  <span>{cell.dayNumber}</span>
                  {noted && (
                    <span className="absolute right-0.5 top-0.5 text-[9px] text-[#c8708a]">*</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-5">
          <div
            className="grid grid-cols-3 gap-2 rounded-full p-1"
            style={{ background: "#efeaf6" }}
          >
            {[
              { id: "daily" as const, label: isZh ? "日报" : "Daily" },
              { id: "weekly" as const, label: isZh ? "周报" : "Weekly" },
              { id: "monthly" as const, label: isZh ? "月报" : "Monthly" },
            ].map((option) => {
              const active = reportView === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setReportView(option.id)}
                  className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-all"
                  style={{
                    backgroundColor: active ? "#ffffff" : "transparent",
                    color: active ? "#7e63c9" : "#9794a2",
                    boxShadow: active ? "0 4px 14px rgba(126,99,201,0.18)" : "none",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {reportView === "daily" && (
              <div className="space-y-3">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="skeleton h-28 rounded-[20px] border p-5"
                      style={{ borderColor: "#dbd5e8" }}
                    />
                  ))}

                {!loading && entries.length === 0 && (
                  <div className="border-t px-2 py-6 text-center" style={{ borderColor: "#dbd5e8" }}>
                    <p className="text-xs font-bold" style={{ color: "#9794a2" }}>
                      {t("history.empty")}
                    </p>
                  </div>
                )}

                {!loading &&
                  entries.map((entry, i) => {
                    const patterns: string[] = (() => {
                      try {
                        return JSON.parse(entry.behaviorPatterns ?? "[]");
                      } catch {
                        return [];
                      }
                    })();
                    const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length];
                    const isExpanded = expandedId === entry.id;
                    const historyCards = entry.cards?.length
                      ? entry.cards
                      : [{ cardId: entry.cardId, cardName: entry.cardName, cardOrientation: entry.cardOrientation }];

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative overflow-hidden rounded-[20px]"
                      >
                        {/* 红色删除按钮（左滑后露出） */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(entry)}
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
                            if (swipedId && swipedId !== entry.id) setSwipedId(null);
                          }}
                          onDragEnd={(_e, info: PanInfo) => {
                            didDrag.current = true;
                            if (info.offset.x < -40) {
                              setSwipedId(entry.id);
                            } else {
                              setSwipedId(null);
                            }
                          }}
                          animate={{ x: swipedId === entry.id ? -70 : 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          onTap={() => {
                            if (didDrag.current) {
                              didDrag.current = false;
                              return;
                            }
                            if (swipedId === entry.id) {
                              setSwipedId(null);
                            } else {
                              setExpandedId(isExpanded ? null : entry.id);
                            }
                          }}
                          className="relative z-10 rounded-[20px] border cursor-pointer"
                          style={{
                            backgroundColor: isExpanded ? "#ffffff" : "#fefdfe",
                            borderColor: isExpanded ? accentColor : "#dbd5e8",
                          }}
                        >
                          <div
                            className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-[18px]"
                            style={{ background: `linear-gradient(180deg, rgba(200,112,138,0.5) 0%, ${accentColor} 100%)` }}
                          />
                          <div className="relative p-2.5 pl-4">
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1 pr-1">
                                <span className="text-[9px] font-bold tracking-wider" style={{ color: "#9794a2" }}>
                                  {formatDate(entry.date)}
                                </span>
                                <h4 className="mt-1 font-heading text-sm font-bold" style={{ color: "#2d2a34" }}>
                                  {entry.morningTheme ?? entry.cardName}
                                </h4>
                                <div className="mt-2 grid grid-cols-3 gap-1">
                                  {historyCards.map((historyCard, cardIndex) => {
                                    const isLenormand = entry.cardSystem === "lenormand";
                                    const isRev = !isLenormand && historyCard.cardOrientation === "reversed";
                                    return (
                                    <span
                                      key={`${historyCard.cardId}-${cardIndex}`}
                                      className="flex min-h-[24px] items-center justify-center rounded-[10px] border px-1.5 py-0.5 text-center text-[8px] font-bold leading-tight"
                                      style={{
                                        backgroundColor:
                                          isRev ? "rgba(200,112,138,0.08)" : "#f2eff8",
                                        borderColor:
                                          isRev ? "rgba(200,112,138,0.2)" : "rgba(110,100,150,0.08)",
                                        color:
                                          isRev ? "#c8708a" : "#7e63c9",
                                      }}
                                    >
                                      {historyCard.cardName}{!isLenormand ? ` · ${t(`morning.orientation.${historyCard.cardOrientation}`)}` : ""}
                                    </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <span
                                className="rounded-[6px] px-2 py-0.5 text-[9px] font-bold"
                                style={
                                  entry.isComplete
                                    ? { backgroundColor: "#E8F2E2", color: "#5C6B50" }
                                    : { backgroundColor: "rgba(126,99,201,0.08)", color: "#7e63c9" }
                                }
                              >
                                {entry.isComplete ? t("history.complete") : t("history.partial")}
                              </span>
                            </div>
                            {entry.eveningEcho && !isExpanded && (
                              <p className="line-clamp-2 text-[11px] leading-relaxed" style={{ color: "#5c5a64" }}>
                                &ldquo;{entry.eveningEcho}&rdquo;
                              </p>
                            )}
                            {patterns.length > 0 && !isExpanded && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {patterns.slice(0, 2).map((p, pi) => (
                                  <span
                                    key={pi}
                                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                                    style={{ backgroundColor: "#f8f6fc", color: "#9794a2" }}
                                  >
                                    #{p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-2 border-t px-4 pb-3 pt-0" style={{ borderColor: "#dbd5e8" }}>
                                  {historyCards.length > 0 && (
                                    <div className="pt-2">
                                      <div className="flex flex-nowrap items-start justify-center gap-2">
                                        {historyCards.map((historyCard, cardIndex) => {
                                          const card = getCardById(historyCard.cardId);
                                          if (!card) return null;
                                          return (
                                            <div key={`${historyCard.cardId}-${cardIndex}`} className="w-0 flex-1 max-w-[110px]">
                                              <CardFront card={card} orientation={historyCard.cardOrientation} cardSystem={entry.cardSystem as "tarot" | "lenormand" | undefined} />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {entry.morningTheme && (
                                    <div className="pt-1">
                                      <p
                                        className="mb-1 text-[9px] font-bold uppercase tracking-widest"
                                        style={{ color: "#9794a2" }}
                                      >
                                        Morning theme
                                      </p>
                                      <p className="font-heading text-sm font-semibold leading-snug" style={{ color: "#2d2a34" }}>
                                        {entry.morningTheme}
                                      </p>
                                    </div>
                                  )}
                                  {entry.journalText && (
                                    <div>
                                      <p
                                        className="mb-1 text-[9px] font-bold uppercase tracking-widest"
                                        style={{ color: "#9794a2" }}
                                      >
                                        Journal
                                      </p>
                                      <p className="text-xs leading-relaxed" style={{ color: "#5c5a64" }}>
                                        {entry.journalText}
                                      </p>
                                    </div>
                                  )}
                                  {entry.eveningEcho && (
                                    <div className="border-l-2 py-1 pl-3" style={{ borderLeftColor: accentColor }}>
                                      <p
                                        className="mb-1 text-[9px] font-bold uppercase tracking-widest"
                                        style={{ color: "#9794a2" }}
                                      >
                                        Echo
                                      </p>
                                      <p className="font-heading text-sm font-bold leading-relaxed" style={{ color: "#2d2a34" }}>
                                        &ldquo;{entry.eveningEcho}&rdquo;
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    );
                  })}
              </div>
            )}

            {reportView === "weekly" && (() => {
              if (reportLoading) {
                return (
                  <div className="rounded-[18px] border px-4 py-8 text-center" style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "#9794a2" }}>{reportViewLabel}</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "#5c5a64" }}>
                      {isZh ? "正在生成周报..." : "Generating weekly report..."}
                    </p>
                  </div>
                );
              }
              if (!weeklyReport || weeklyReport.cardFrequency.length === 0) {
                return (
                  <div className="rounded-[18px] border px-4 py-4 text-center" style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "#9794a2" }}>{reportViewLabel}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: "#5c5a64" }}>
                      {isZh ? "本周暂无记录，完成每日抽牌后将自动生成周报。" : "No entries this week yet. Complete daily draws to generate a weekly report."}
                    </p>
                  </div>
                );
              }
              const maxCount = Math.max(...weeklyReport.cardFrequency.map((c) => c.count), 1);
              const barColors = ["#7B9FDC", "#9B8AD4", "#7C9A6F", "#D4A55A", "#C9AA6E"];
              return (
                <div className="space-y-3">
                  {/* Core Theme */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>✨</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "本周核心主题" : "Core Theme"}
                      </p>
                    </div>
                    <h3 className="font-heading text-lg font-bold" style={{ color: "#2d2a34" }}>
                      {weeklyReport.coreTheme}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#5c5a64" }}>
                      {weeklyReport.themeDescription}
                    </p>
                  </motion.div>

                  {/* Card Frequency */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-3 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>🃏</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "本周牌频" : "Card Frequency"}
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {weeklyReport.cardFrequency.map((card, idx) => {
                        const pct = card.count / maxCount;
                        return (
                          <div key={card.name} className="flex items-center gap-3">
                            <span className="w-12 text-right text-xs font-semibold" style={{ color: "#5c5a64" }}>
                              {card.name}
                            </span>
                            <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "#eae5f3" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct * 100}%` }}
                                transition={{ delay: 0.15 + idx * 0.08, duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: barColors[idx % barColors.length] }}
                              />
                            </div>
                            <span className="w-4 text-xs font-bold tabular-nums" style={{ color: "#9794a2" }}>
                              {card.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Cosmic Quote */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>☉</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "宇宙周语" : "Cosmic Weekly"}
                      </p>
                    </div>
                    <p className="font-heading text-xs leading-relaxed italic" style={{ color: "#5c5a64" }}>
                      "{weeklyReport.cosmicQuote}"
                    </p>
                  </motion.div>
                </div>
              );
            })()}

            {reportView === "monthly" && (() => {
              if (reportLoading) {
                return (
                  <div className="rounded-[18px] border px-4 py-8 text-center" style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "#9794a2" }}>{reportViewLabel}</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "#5c5a64" }}>
                      {isZh ? "正在生成月报..." : "Generating monthly report..."}
                    </p>
                  </div>
                );
              }
              if (!monthlyReport || monthlyReport.totalDays === 0) {
                return (
                  <div className="rounded-[18px] border px-4 py-4 text-center" style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "#9794a2" }}>{reportViewLabel}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: "#5c5a64" }}>
                      {isZh ? "本月暂无记录，完成每日抽牌后将自动生成月报。" : "No entries this month yet. Complete daily draws to generate a monthly report."}
                    </p>
                  </div>
                );
              }

              const themeDistColors = ["#9B7FD4", "#c8708a", "#6A98C8", "#7C9A6F"];
              const rankBadgeColors = ["#9B8AD4", "#6AAED4", "#7C9A6F", "#D4A55A", "#C99260"];
              const topMaxCount = Math.max(...monthlyReport.topCards.map((c) => c.count), 1);

              return (
                <div className="space-y-3">
                  {/* Header: MONTHLY REVIEW */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 }}
                    className="rounded-[18px] border p-4"
                    style={{
                      borderColor: "#dbd5e8",
                      backgroundColor: "linear-gradient(180deg, #f8f6fc 0%, #fefdfe 100%)",
                      background: "linear-gradient(180deg, #f8f6fc 0%, #fefdfe 100%)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#9794a2" }}>
                          {isZh ? "月度回顾" : "MONTHLY REVIEW"}
                        </p>
                        <h2 className="mt-1 font-heading text-xl font-bold" style={{ color: "#2d2a34" }}>
                          {monthlyReport.yearMonthLabel}
                        </h2>
                      </div>
                      <span
                        className="text-[28px] font-serif font-bold leading-none"
                        style={{ color: "rgba(126,99,201,0.15)" }}
                      >
                        {monthlyReport.romanNumeral}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        {
                          value: monthlyReport.totalDays,
                          label: isZh ? "记录天数" : "Days",
                        },
                        {
                          value: monthlyReport.uniqueCards,
                          label: isZh ? "不同塔罗" : "Unique Cards",
                        },
                        {
                          value: monthlyReport.themeDimensions,
                          label: isZh ? "主题维度" : "Themes",
                        },
                      ].map((stat, idx) => (
                        <div
                          key={stat.label}
                          className="rounded-[14px] px-3 py-2.5 text-center"
                          style={{ backgroundColor: "rgba(255,255,255,0.65)", boxShadow: "inset 0 0 0 1px rgba(110,100,150,0.08)" }}
                        >
                          <p className="text-lg font-bold tabular-nums" style={{ color: "#7e63c9" }}>{stat.value}</p>
                          <p className="mt-0.5 text-[10px] font-medium" style={{ color: "#9794a2" }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Theme Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-3 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>✦</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "本月主题分布" : "Theme Distribution"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {monthlyReport.themeDistribution.map((item, idx) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: themeDistColors[idx % themeDistColors.length] }}
                              />
                              <span className="text-xs font-semibold" style={{ color: "#5c5a64" }}>{item.label}</span>
                            </div>
                            <span className="text-xs font-bold tabular-nums" style={{ color: "#9794a2" }}>{item.percent}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "#eae5f3" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ delay: 0.15 + idx * 0.08, duration: 0.6, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: themeDistColors[idx % themeDistColors.length] }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Top Cards This Month (Ranked) */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-3 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>🃏</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "本月高频牌" : "Top Cards"}
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {monthlyReport.topCards.slice(0, 5).map((card, idx) => {
                        const pct = card.count / topMaxCount;
                        return (
                          <div key={card.name} className="flex items-center gap-2.5">
                            {/* Rank badge */}
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ color: "#fff", backgroundColor: rankBadgeColors[idx % rankBadgeColors.length] }}
                            >
                              {idx + 1}
                            </span>
                            <span className="w-12 text-xs font-semibold" style={{ color: "#5c5a64" }}>{card.name}</span>
                            <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "#eae5f3" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct * 100}%` }}
                                transition={{ delay: 0.2 + idx * 0.07, duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: rankBadgeColors[idx % rankBadgeColors.length], opacity: 0.55 }}
                              />
                            </div>
                            <span className="w-4 text-[11px] font-bold tabular-nums" style={{ color: "#9794a2" }}>{card.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Cosmic Monthly Quote */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.17 }}
                    className="rounded-[18px] border p-4"
                    style={{ borderColor: "#dbd5e8", backgroundColor: "#fefdfe" }}
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <span style={{ color: "#c8708a", fontSize: "14px" }}>★</span>
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#9794a2" }}>
                        {isZh ? "宇宙月语" : "Cosmic Monthly"}
                      </p>
                    </div>
                    <p className="font-heading text-xs leading-relaxed italic" style={{ color: "#5c5a64" }}>
                      "{monthlyReport.cosmicQuote}"
                    </p>
                  </motion.div>
                </div>
              );
            })()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
