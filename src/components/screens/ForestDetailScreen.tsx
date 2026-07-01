"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ForestEntry } from "./ForestScreen";
import type { TreeStats } from "./ForestScreen";
import { STAGES, getStageProgress } from "./ForestScreen";

interface ForestDetailScreenProps {
  entries: ForestEntry[];
  growthDays: number;
  stageIndex: number;
  treeStats: TreeStats;
  onBack: () => void;
}

type DetailTab = "overview" | "structure" | "growth" | "energy";

const TABS: { key: DetailTab; labelKey: string }[] = [
  { key: "overview", labelKey: "forest.detail.tabOverview" },
  { key: "structure", labelKey: "forest.detail.tabStructure" },
  { key: "growth", labelKey: "forest.detail.tabGrowth" },
  { key: "energy", labelKey: "forest.detail.tabEnergy" },
];

/* ─── Mini Stat Card ─── */
function MetricCard({
  icon,
  label,
  value,
  level,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  level: string;
  trend: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-2xl p-3.5 min-w-0" style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          {icon}
        </div>
        <span className="text-[11px] font-medium" style={{ color: "#9794a2" }}>{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none mb-0.5" style={{ color: "#2d2a34" }}>{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "#a09888" }}>{level}</span>
        <span
          className="text-[10px] font-semibold"
          style={{ color: trend >= 0 ? "#5C9A6D" : "#C47060" }}
        >
          {trend >= 0 ? `\u2191 ${Math.abs(trend)}` : `\u2193 ${Math.abs(trend)}`}
        </span>
      </div>
    </div>
  );
}

/* ═══ Need t function inside component for use in nested helpers ═══ */
/* We'll pass it through context instead — see below */

/* ─── Simple SVG Line Chart ─── */
function MiniLineChart({
  data,
  color,
}: {
  data: number[][];
  color: string;
}) {
  const width = 300;
  const height = 140;
  const padding = { top: 16, right: 12, bottom: 24, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find max value
  let maxVal = 100;
  let minVal = 0;

  // Scale functions
  const scaleX = (i: number) => padding.left + (i / Math.max(1, data.length - 1)) * chartW;
  const scaleY = (v: number) => padding.top + chartH - ((v - minVal) / (maxVal - minVal || 1)) * chartH;

  const pathD = data.map(([v], i) =>
    i === 0 ? `M ${scaleX(i)} ${scaleY(v)}` : `L ${scaleX(i)} ${scaleY(v)}`
  ).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => (
        <g key={val}>
          <line
            x1={padding.left} y1={scaleY(val)}
            x2={width - padding.right} y2={scaleY(val)}
            stroke="#eae5f3"
            strokeWidth="0.5"
          />
          <text x={padding.left - 6} y={scaleY(val) + 3} textAnchor="end" fontSize="9" fill="#a09888">{val}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {["3\u6708", "4\u6708", "5\u6708", "\u672c\u6708"].map((label, i) => (
        <text
          key={label}
          x={scaleX(i * (data.length > 1 ? (data.length - 1) / 3 : 0))}
          y={height - 4}
          textAnchor="middle"
          fontSize="9"
          fill="#a09888"
        >
          {label}
        </text>
      ))}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map(([v], i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="3.5" fill={color} />
      ))}
    </svg>
  );
}

export function ForestDetailScreen({
  entries,
  growthDays,
  stageIndex,
  treeStats,
  onBack,
}: ForestDetailScreenProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // Generate monthly analysis date range
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  // Stage progress
  const stageProgress = useMemo(() => getStageProgress(growthDays), [growthDays]);

  // Mock historical data for chart (6 months of data)
  const chartData = useMemo(() => {
    const baseStats = [
      [treeStats.stability - 18, treeStats.exploration - 15, treeStats.introspection - 12, treeStats.action - 8],
      [treeStats.stability - 12, treeStats.exploration - 10, treeStats.introspection - 8, treeStats.action - 5],
      [treeStats.stability - 6, treeStats.exploration - 5, treeStats.introspection - 3, treeStats.action - 2],
      [treeStats.stability, treeStats.exploration, treeStats.introspection, treeStats.action],
    ];
    return baseStats.map(row => row.map(v => Math.max(20, Math.min(95, v))));
  }, [treeStats]);

  // Icon components for each metric
  const stabilityIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B8F5A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  const explorationIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7AA88A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  const introspectionIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9B8B6A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const actionIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C4935E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-lg px-5 pb-20 pt-5 space-y-5">
        {/* ═══ Header with back button ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between sticky top-0 z-10 py-2 -mt-1"
          style={{ backgroundColor: "#f8f6fc" }}
        >
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:bg-black/5"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d2a34" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="font-heading text-lg font-bold" style={{ color: "#2d2a34" }}>
            {t("forest.title")}
          </h1>
          <button className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:bg-black/5" aria-label="Calendar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9794a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </motion.div>

        {/* ═══ Tab Navigation ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-1 bg-[#eae5f3] rounded-xl p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === tab.key ? "#FFFFFF" : "transparent",
                color: activeTab === tab.key ? "#4a5d3d" : "#9794a2",
                boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </motion.div>

        {/* ═══ Tab Content: Overview (default view matching design image) ═══ */}
        <AnimatePresence mode="wait">
          {(activeTab === "overview" || activeTab === "structure") && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Monthly Analysis + Structure Trend (merged) */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}>
                <h2 className="text-base font-bold" style={{ color: "#2d2a34" }}>
                  {t("forest.detail.monthlyAnalysis")}
                  <span className="text-sm font-normal ml-1.5" style={{ color: "#9794a2" }}>
                    ({monthStart.slice(5)} – {monthEnd.slice(5)})
                  </span>
                </h2>
                <p className="text-[11px] mt-1" style={{ color: "#a09888" }}>{t("forest.detail.analysisDesc")}</p>

                {/* Four Metric Cards Row */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <MetricCard
                    icon={stabilityIcon}
                    label={t("forest.stability")}
                    value={treeStats.stability}
                    level={t("forest.levelUp")}
                    trend={treeStats.stabilityTrend}
                    color="#6B8F5A"
                  />
                  <MetricCard
                    icon={explorationIcon}
                    label={t("forest.exploration")}
                    value={treeStats.exploration}
                    level={t("forest.levelHigh")}
                    trend={treeStats.explorationTrend}
                    color="#7AA88A"
                  />
                  <MetricCard
                    icon={introspectionIcon}
                    label={t("forest.introspection")}
                    value={treeStats.introspection}
                    level={t("forest.levelMid")}
                    trend={treeStats.introspectionTrend}
                    color="#9B8B6A"
                  />
                  <MetricCard
                    icon={actionIcon}
                    label={t("forest.action")}
                    value={treeStats.action}
                    level={t("forest.levelMed")}
                    trend={treeStats.actionTrend}
                    color="#C4935E"
                  />
                </div>

                {/* Structure Trend Chart */}
                <h3 className="mt-3 text-sm font-bold mb-1" style={{ color: "#2d2a34" }}>{t("forest.detail.structureTrend")}</h3>
                <div className="flex gap-3 flex-wrap mb-3">
                  {[
                    { label: t("forest.stability"), color: "#6B8F5A" },
                    { label: t("forest.exploration"), color: "#9B8BC0" },
                    { label: t("forest.introspection"), color: "#5B9BD5" },
                    { label: t("forest.action"), color: "#D4A04A" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px]" style={{ color: "#9794a2" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <MiniLineChart data={chartData} color="#6B8F5A" />
              </div>

              {/* Next Stage Preview */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold mb-1" style={{ color: "#2d2a34" }}>
                      {t("forest.detail.nextStagePreview")}
                    </h3>
                    <p className="text-[12px] font-semibold mb-1" style={{ color: "#5C7A4A" }}>
                      {stageIndex < 4
                        ? t(`forest.${STAGES[Math.min(stageIndex + 1, 4)]}`)
                        : t("forest.stage5")}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#9794a2" }}>
                      {t("forest.detail.previewDesc")}
                    </p>
                    {stageProgress.totalStageDays !== Infinity && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color: "#a09888" }}>
                            {t("forest.detail.currentProgress")} {Math.round((stageProgress.currentStageDays / stageProgress.totalStageDays) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#dbd5e8" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (stageProgress.currentStageDays / stageProgress.totalStageDays) * 100)}%` }}
                            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: "#7A9B68" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
                      <ellipse cx="30" cy="54" rx="16" ry="3" fill="#eae5f3" />
                      <rect x="27" y="44" width="6" height="10" rx="1.5" fill="#8B6B4A" />
                      <ellipse cx="30" cy="36" rx="12" ry="10" fill="#6B8F5A" opacity="0.5" />
                      <ellipse cx="28" cy="33" rx="8" ry="7" fill="#7CA968" opacity="0.65" />
                      {/* Small sprout leaves */}
                      <ellipse cx="23" cy="39" rx="4" ry="3" fill="#8BB877" transform="rotate(-20 23 39)" />
                      <ellipse cx="37" cy="40" rx="4" ry="3" fill="#8BB877" transform="rotate(15 37 40)" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Monthly Quote */}
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold" style={{ color: "#2d2a34" }}>{t("forest.detail.monthlyQuote")}</h3>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a09888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: "#5c5a64" }}>
                  {t("forest.detail.monthlyQuoteText")}
                </p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                     className="absolute bottom-3 right-4 opacity-15" style={{ color: "#2d2a34" }}>
                  <path d="M11 7.03C11 5.34 12.34 4 14.03 4h.28c.84 0 1.52.68 1.52 1.52v.28c0 .84-.68 1.52-1.52 1.52h-.28C13.07 7.32 12.5 7.89 12.5 8.64V11h3.5c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-6c-.83 0-1.5-.67-1.5-1.5v-6c0-.83.67-1.5 1.5-1.5H11V7.03zM4.97 4h.28c.84 0 1.52.68 1.52 1.52v.28c0 .84-.68 1.52-1.52 1.52h-.28C4.07 7.32 3.5 7.89 3.5 8.64V11H7c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H1c-.83 0-1.5-.67-1.5-1.5v-6C-.5 11.67.17 11 1 11h1V7.03C2 5.34 3.34 4 5.03 4z"/>
                </svg>
              </div>
            </motion.div>
          )}

          {/* Growth Tab Placeholder */}
          {activeTab === "growth" && (
            <motion.div
              key="growth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eae5f3" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a09888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#2d2a34" }}>成长轨迹</p>
              <p className="text-xs mt-1.5" style={{ color: "#a09888" }}>完整的成长路径即将呈现</p>
            </motion.div>
          )}

          {/* Energy Tab Placeholder */}
          {activeTab === "energy" && (
            <motion.div
              key="energy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eae5f3" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a09888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#2d2a34" }}>树的能量</p>
              <p className="text-xs mt-1.5" style={{ color: "#a09888" }}>能量场分析正在构建中</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
