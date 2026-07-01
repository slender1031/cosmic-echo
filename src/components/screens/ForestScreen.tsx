"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { request } from "@/lib/api/request";
import { useDemo } from "@/components/demo/demo-provider";

const STAGES = ["stage1", "stage2", "stage3", "stage4", "stage5"] as const;
export { STAGES };

export interface ForestEntry {
  id: string;
  date: string;
  isComplete: boolean;
  journalText?: string | null;
}

// Demo tree stats data structure
export interface TreeStats {
  stability: number;    // 稳定度
  exploration: number;  // 探索度
  introspection: number;// 内省度
  action: number;       // 行动力
  stabilityTrend: number;
  explorationTrend: number;
  introspectionTrend: number;
  actionTrend: number;
}

export function getStageIndex(days: number): number {
  // 5 stages based on cumulative check-in days:
  // 1: 萌芽期 (1-7 days)
  // 2: 探索期 (8-21 days)
  // 3: 结构形成期 (22-60 days)
  // 4: 稳定生长期 (61-100 days)
  // 5: 成熟期 (>100 days)
  if (days >= 101) return 4;  // 成熟期
  if (days >= 61) return 3;   // 稳定生长期
  if (days >= 22) return 2;   // 结构形成期
  if (days >= 8) return 1;    // 探索期
  if (days >= 1) return 0;    // 萌芽期
  return 0;
}

// Get days needed for current stage and next stage
export function getStageProgress(days: number): { currentStageDays: number; totalStageDays: number; stageLabel: string } {
  if (days >= 101) return { currentStageDays: days - 100, totalStageDays: Infinity, stageLabel: "成熟期" };
  if (days >= 61) return { currentStageDays: days - 60, totalStageDays: 40, stageLabel: "稳定生长期" };
  if (days >= 22) return { currentStageDays: days - 21, totalStageDays: 39, stageLabel: "结构形成期" };
  if (days >= 8) return { currentStageDays: days - 7, totalStageDays: 14, stageLabel: "探索期" };
  return { currentStageDays: days, totalStageDays: 7, stageLabel: "萌芽期" };
}

function generateTreeStats(days: number): TreeStats {
  // Generate somewhat realistic-looking stats based on growth days
  const base = Math.min(85, 50 + days * 1.5);
  return {
    stability: Math.round(Math.min(99, Math.max(40, base + (Math.random() * 10 - 5)))),
    exploration: Math.round(Math.min(99, Math.max(45, base + 8 + (Math.random() * 8 - 4)))),
    introspection: Math.round(Math.min(99, Math.max(38, base - 5 + (Math.random() * 10 - 5)))),
    action: Math.round(Math.min(99, Math.max(35, base - 8 + (Math.random() * 12 - 6)))),
    stabilityTrend: Math.floor(Math.random() * 12) - 2,
    explorationTrend: Math.floor(Math.random() * 14) - 1,
    introspectionTrend: Math.floor(Math.random() * 10) - 1,
    actionTrend: Math.floor(Math.random() * 10) - 5,
  };
}

function getSelectedDate() {
  if (typeof window === "undefined") {
    return new Date().toISOString().split("T")[0];
  }
  return window.localStorage.getItem("cosmic-echo.selected-date") ?? new Date().toISOString().split("T")[0];
}

function getGrowthDaysThroughDate(entries: ForestEntry[], targetDate: string) {
  return entries.filter((entry) => entry.isComplete && entry.date <= targetDate).length;
}

function formatDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}\u6708${d}\u65e5`;
}

/* ─── Animated Tree SVG — mystical golden tree effect ─── */
function TreeIllustration() {
  // Golden magical particles scattered throughout the tree area
  const particles = useMemo(() => {
    const pts: { cx: number; cy: number; r: number; delay: number; dur: number; opacity: number; float: boolean }[] = [];
    const seeds: (number | boolean)[][] = [
      // Canopy particles — warm gold/amber
      [100,60,1.4,0.3,3.0,0.9,false], [180,55,1.1,1.2,3.4,0.75,false], [140,42,1.6,0.6,2.8,1,false],
      [120,70,1.0,2.0,3.2,0.7,false], [165,65,1.3,1.5,2.9,0.88,false], [85,80,0.8,0.9,3.6,0.6,false],
      [155,48,1.2,2.3,3.1,0.8,false], [110,85,0.7,1.8,3.5,0.55,false], [175,80,1.0,0.4,2.7,0.82,false],
      [130,55,1.5,2.8,2.6,0.95,false], [145,72,0.9,1.1,3.3,0.68,false], [105,62,1.1,0.2,3.6,0.75,false],
      [160,60,1.35,2.5,2.5,0.9,false], [125,48,0.7,1.6,3.8,0.62,false], [170,88,0.9,0.7,3.0,0.74,false],
      [95,68,1.25,2.1,2.7,0.85,false], [150,82,0.65,1.3,3.4,0.5,false], [135,38,1.4,0.5,2.9,0.92,false],
      [115,78,0.85,2.7,3.2,0.65,false], [185,70,1.05,1.0,2.8,0.78,false],
      // Trunk/branch area
      [136,120,1.1,0.8,2.4,0.88,false], [144,125,0.9,1.9,3.0,0.72,false], [130,140,0.7,2.4,3.4,0.58,false],
      [150,115,1.0,0.1,2.7,0.82,false], [140,155,0.8,1.5,3.2,0.65,false],
      // Lower area / roots
      [118,170,0.7,2.0,3.5,0.55,false], [162,168,0.75,0.6,3.1,0.6,false],
      // Floating rising particles (animated upward)
      [100,115,0.6,1.0,4.0,0.45,true], [180,110,0.65,2.5,3.8,0.5,true], [140,100,0.8,0.5,3.5,0.6,true],
      [125,108,0.5,3.0,4.2,0.4,true], [160,105,0.55,1.8,3.6,0.48,true], [95,130,0.4,2.2,4.5,0.35,true],
      [185,125,0.5,0.8,4.0,0.42,true], [140,90,0.7,1.5,3.8,0.55,true],
      // Ambient far particles
      [70,110,0.45,1.2,4.0,0.3,false], [210,105,0.5,2.2,3.8,0.35,false], [60,140,0.35,0.4,4.5,0.25,false],
      [220,135,0.4,1.7,3.9,0.3,false], [80,150,0.3,2.6,4.2,0.22,false], [200,145,0.38,0.9,4.1,0.28,false],
    ];
    seeds.forEach(s => { pts.push({ cx: s[0] as number, cy: s[1] as number, r: s[2] as number, delay: s[3] as number, dur: s[4] as number, opacity: s[5] as number, float: s[6] as boolean }); });
    return pts;
  }, []);

  // Hanging crystal data: [cx, topY, bottomY, width, opacity, swingDur]
  const crystals = useMemo(() => {
    return [
      // Left side branches
      [92, 96, 128, 6, 0.9, 3.2],
      [82, 106, 134, 5, 0.75, 3.8],
      [105, 90, 124, 7, 0.85, 2.8],
      [72, 118, 142, 4.5, 0.65, 4.2],
      // Right side branches
      [188, 96, 128, 6, 0.9, 3.0],
      [198, 106, 134, 5, 0.75, 3.6],
      [175, 90, 124, 7, 0.85, 3.1],
      [208, 118, 142, 4.5, 0.65, 4.0],
      // Lower canopy overhang left
      [98, 108, 148, 5.5, 0.7, 3.4],
      [115, 102, 142, 6, 0.78, 2.9],
      // Lower canopy overhang right  
      [182, 108, 148, 5.5, 0.7, 3.3],
      [165, 102, 142, 6, 0.78, 3.0],
    ];
  }, []);

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Deep background glow — golden amber */}
        <radialGradient id="bgGlow" cx="50%" cy="44%" r="58%">
          <stop offset="0%" stopColor="rgba(220,160,40,0.22)" />
          <stop offset="35%" stopColor="rgba(180,110,25,0.12)" />
          <stop offset="65%" stopColor="rgba(120,60,15,0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Core golden glow behind canopy */}
        <radialGradient id="coreGlow" cx="50%" cy="45%" r="42%">
          <stop offset="0%" stopColor="rgba(255,200,70,0.45)" />
          <stop offset="30%" stopColor="rgba(255,160,40,0.28)" />
          <stop offset="60%" stopColor="rgba(220,110,20,0.10)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Center trunk glow — bright golden */}
        <radialGradient id="trunkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,220,100,0.7)" />
          <stop offset="25%" stopColor="rgba(255,180,50,0.45)" />
          <stop offset="55%" stopColor="rgba(255,140,30,0.18)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Crystal gradient — teal/cyan magical gems */}
        <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(130,255,235,0.95)" />
          <stop offset="20%" stopColor="rgba(80,240,220,0.85)" />
          <stop offset="50%" stopColor="rgba(40,200,190,0.65)" />
          <stop offset="80%" stopColor="rgba(20,140,140,0.35)" />
          <stop offset="100%" stopColor="rgba(10,80,85,0.15)" />
        </linearGradient>
        {/* Crystal edge highlight */}
        <linearGradient id="crystalEdge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(200,255,250,0.6)" />
          <stop offset="100%" stopColor="rgba(80,200,190,0.1)" />
        </linearGradient>
        {/* Trunk gradient — rich warm brown */}
        <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d2415" />
          <stop offset="20%" stopColor="#5c3a22" />
          <stop offset="50%" stopColor="#4a2e1c" />
          <stop offset="80%" stopColor="#5c3a22" />
          <stop offset="100%" stopColor="#382012" />
        </linearGradient>
        {/* Ground platform */}
        <radialGradient id="groundGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#3a5c35" />
          <stop offset="50%" stopColor="#2a4426" />
          <stop offset="100%" stopColor="#162818" />
        </radialGradient>
        {/* Canopy — rich emerald golden-tipped layers */}
        <radialGradient id="canopyDeep" cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor="#1d4a1d" />
          <stop offset="60%" stopColor="#153618" />
          <stop offset="100%" stopColor="#0e2610" />
        </radialGradient>
        <radialGradient id="canopyMid" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2d6b2a" />
          <stop offset="50%" stopColor="#1f5520" />
          <stop offset="100%" stopColor="#164018" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="canopyLight" cx="50%" cy="48%" r="50%">
          <stop offset="0%" stopColor="#488a3e" />
          <stop offset="45%" stopColor="#357030" />
          <stop offset="100%" stopColor="#225522" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="canopyBright" cx="50%" cy="44%" r="48%">
          <stop offset="0%" stopColor="#6ab855" />
          <stop offset="40%" stopColor="#4a9840" />
          <stop offset="100%" stopColor="#2d7030" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id="canopyGold" cx="50%" cy="40%" r="38%">
          <stop offset="0%" stopColor="#8ec850" />
          <stop offset="50%" stopColor="#6ab840" />
          <stop offset="100%" stopColor="#4a9035" stopOpacity="0.3" />
        </radialGradient>
        {/* Glow filters */}
        <filter id="sparkleGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="strongGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="crystalGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* === DEEP BACKGROUND GLOW === */}
      <circle cx="140" cy="120" r="135" fill="url(#bgGlow)" />
      {/* Subtle light ring */}
      <circle cx="140" cy="122" r="110" stroke="rgba(200,150,50,0.08)" strokeWidth="0.6" fill="none" />
      <circle cx="140" cy="122" r="90" stroke="rgba(200,150,50,0.05)" strokeWidth="0.4" fill="none" />

      {/* === GOLDEN CORE BEHIND CANOPY === */}
      <circle cx="140" cy="68" r="72" fill="url(#coreGlow)" />

      {/* === LIGHT RAYS FROM STAR === */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <line key={`ray-${i}`}
          x1={140} y1={36}
          x2={140 + Math.cos(angle * Math.PI / 180) * 100}
          y2={36 + Math.sin(angle * Math.PI / 180) * 90}
          stroke="rgba(255,215,100,0.06)"
          strokeWidth={i % 3 === 0 ? "1" : "0.5"}
          strokeLinecap="round" />
      ))}

      {/* === TOP STAR LIGHT SOURCE === */}
      <g style={{ transformOrigin: "140px 22px" }}>
        <animateTransform attributeName="transform" type="scale"
          values="0.88;1.10;0.88" dur="4s" repeatCount="indefinite" additive="sum" />
        {/* Outer glow ring */}
        <circle cx="140" cy="22" r="18" fill="none" stroke="rgba(255,220,120,0.15)" strokeWidth="2">
          <animate attributeName="r" values="16;22;16" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="22" r="12" fill="none" stroke="rgba(255,240,160,0.2)" strokeWidth="1.5">
          <animate attributeName="r" values="10;15;10" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.08;0.2" dur="4s" repeatCount="indefinite" />
        </circle>
        {/* Star shape */}
        <polygon points="140,3 143.5,13 153,13 146,19.5 148.5,29.5 140,23.5 131.5,29.5 134,19.5 127,13 136.5,13"
                 fill="rgba(255,248,200,0.95)" filter="url(#strongGlow)" />
        {/* Star rays — longer, more dramatic */}
        {[
          [140, -4, 140, -12],
          [128, 6, 120, 0],
          [152, 6, 160, 0],
          [130, 22, 124, 27],
          [150, 22, 156, 27],
        ].map((pt, i) => (
          <line key={`sr-${i}`} x1={pt[0]} y1={pt[1]} x2={pt[2]} y2={pt[3]}
                stroke="rgba(255,242,160,0.45)" strokeWidth={i === 0 ? "2" : "1.2"} strokeLinecap="round" />
        ))}
      </g>

      {/* Light pillar from star to canopy */}
      <line x1="140" y1="30" x2="140" y2="60"
        stroke="rgba(255,230,140,0.18)" strokeWidth="16" strokeLinecap="round">
        <animate attributeName="opacity" values="0.08;0.22;0.08" dur="4s" repeatCount="indefinite" />
      </line>

      {/* === GROUND PLATFORM === */}
      {/* Outer shadow ring */}
      <ellipse cx="140" cy="236" rx="108" ry="22" fill="#0a1a10" opacity="0.5" />
      {/* Main platform */}
      <ellipse cx="140" cy="233" rx="98" ry="18" fill="url(#groundGrad)" />
      {/* Platform rim highlight */}
      <ellipse cx="140" cy="233" rx="98" ry="18" stroke="rgba(140,190,120,0.15)" strokeWidth="1.2" fill="none" />
      {/* Inner highlight */}
      <ellipse cx="140" cy="231" rx="88" ry="14" stroke="rgba(160,210,140,0.08)" strokeWidth="0.8" fill="none" />

      {/* === GRASS TUFTS ON PLATFORM EDGE === */}
      {[
        [60,229],[78,233],[96,236],[114,238],[132,239],[148,239],[166,238],[184,236],[202,233],[220,229],
        [70,231],[88,235],[106,237],[124,239],[140,239],[156,239],[174,237],[192,234],[210,231],
        [52,227],[228,225],
      ].map((p, i) => (
        <ellipse key={`grass-${i}`} cx={p[0]} cy={p[1]}
          rx={2.2 + (i % 3) * 0.9} ry={2 + (i % 2) * 0.6}
          fill={i % 3 === 0 ? "#5a9a48" : i % 3 === 1 ? "#4a8a3a" : "#6aaa50"}
          opacity={0.5 + (i % 4) * 0.12}
          transform={"rotate(" + ((i * 41 + 20) % 360 - 180) + " " + p[0] + " " + p[1] + ")"} />
      ))}

      {/* === ROOT SYSTEM — visible surface roots glowing === */}
      <g opacity="0.6">
        {/* Left roots */}
        <path d="M122,230 Q110,236 100,238" stroke="#4a2e1c" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M126,232 Q116,239 108,240" stroke="#3d2415" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M118,228 Q105,232 95,230" stroke="#4a2e1c" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Right roots */}
        <path d="M158,230 Q168,236 180,238" stroke="#4a2e1c" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M154,232 Q164,239 172,240" stroke="#3d2415" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M162,228 Q175,232 185,230" stroke="#4a2e1c" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Root golden glow */}
        <ellipse cx="140" cy="236" rx="42" ry="6" fill="rgba(255,180,60,0.15)" filter="url(#softGlow)" />
      </g>

      {/* === MAIN TRUNK — wider, more majestic === */}
      <path d="M125,232
               Q118,210 120,188 Q122,162 126,140
               Q130,118 136,100
               L144,100
               Q150,118 154,140
               Q158,162 160,188
               Q162,210 155,232 Z"
            fill="url(#trunkGrad)" />

      {/* Trunk center golden glow */}
      <ellipse cx="140" cy="166" rx="20" ry="38" fill="url(#trunkGlow)" style={{ mixBlendMode: "screen" }} />

      {/* Trunk texture lines */}
      {[
        { x1: 127, y1: 210, x2: 153, y2: 208 },
        { x1: 125, y1: 190, x2: 155, y2: 188 },
        { x1: 126, y1: 170, x2: 154, y2: 166 },
        { x1: 129, y1: 150, x2: 151, y2: 145 },
        { x1: 132, y1: 130, x2: 148, y2: 124 },
        { x1: 135, y1: 112, x2: 145, y2: 108 },
      ].map((pt, i) => (
        <line key={`tx-${i}`} x1={pt.x1} y1={pt.y1} x2={pt.x2} y2={pt.y2}
              stroke="#2a1808" strokeWidth="0.7" opacity="0.25" strokeLinecap="round" />
      ))}

      {/* === BRANCHES — visible branching structure === */}
      {/* Left branches */}
      <path d="M128,142 Q110,134 92,118" stroke="#3a2215" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M126,155 Q106,150 82,138" stroke="#342012" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M130,128 Q118,120 105,106" stroke="#3a2215" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M134,110 Q125,98 115,84" stroke="#342012" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Right branches */}
      <path d="M152,142 Q170,134 188,118" stroke="#3a2215" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M154,155 Q174,150 198,138" stroke="#342012" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M150,128 Q162,120 175,106" stroke="#3a2215" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M146,110 Q155,98 165,84" stroke="#342012" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Upper branches */}
      <path d="M136,106 Q130,90 122,76" stroke="#3a2215" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M144,106 Q150,90 158,76" stroke="#3a2215" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Branch golden highlights */}
      {[
        { x1: 128, y1: 142, x2: 92, y2: 118 },
        { x1: 152, y1: 142, x2: 188, y2: 118 },
        { x1: 136, y1: 106, x2: 122, y2: 76 },
        { x1: 144, y1: 106, x2: 158, y2: 76 },
      ].map((pt, i) => (
        <line key={`bh-${i}`} x1={pt.x1} y1={pt.y1} x2={pt.x2} y2={pt.y2}
              stroke="rgba(255,200,100,0.18)" strokeWidth="1.5" strokeLinecap="round" />
      ))}

      {/* === CANOPY — layered emerald with golden highlights === */}
      {/* Layer 1: Deepest shadow (back) */}
      <ellipse cx="140" cy="72" rx="98" ry="54" fill="url(#canopyDeep)" opacity="0.5" />
      <ellipse cx="100" cy="78" rx="45" ry="36" fill="url(#canopyDeep)" opacity="0.42" />
      <ellipse cx="180" cy="78" rx="47" ry="36" fill="url(#canopyDeep)" opacity="0.42" />

      {/* Layer 2 */}
      <ellipse cx="140" cy="68" rx="92" ry="50" fill="url(#canopyMid)" opacity="0.65" />
      <ellipse cx="95" cy="74" rx="42" ry="33" fill="url(#canopyMid)" opacity="0.55" />
      <ellipse cx="185" cy="74" rx="44" ry="33" fill="url(#canopyMid)" opacity="0.55" />

      {/* Layer 3: Main body */}
      <ellipse cx="140" cy="64" rx="86" ry="47" fill="url(#canopyMid)" opacity="0.8" />
      <ellipse cx="92" cy="70" rx="39" ry="31" fill="url(#canopyLight)" opacity="0.7" />
      <ellipse cx="188" cy="70" rx="41" ry="31" fill="url(#canopyLight)" opacity="0.7" />

      {/* Layer 4 */}
      <ellipse cx="140" cy="60" rx="80" ry="44" fill="url(#canopyLight)" opacity="0.85" />
      <ellipse cx="90" cy="66" rx="35" ry="28" fill="url(#canopyLight)" opacity="0.75" />
      <ellipse cx="190" cy="66" rx="37" ry="28" fill="url(#canopyLight)" opacity="0.75" />

      {/* Layer 5: Top dome */}
      <ellipse cx="140" cy="54" rx="72" ry="40" fill="url(#canopyBright)" opacity="0.88" />
      <ellipse cx="88" cy="60" rx="30" ry="25" fill="url(#canopyBright)" opacity="0.78" />
      <ellipse cx="192" cy="60" rx="32" ry="25" fill="url(#canopyBright)" opacity="0.78" />

      {/* Layer 6: Highlights */}
      <ellipse cx="140" cy="48" rx="64" ry="35" fill="url(#canopyBright)" opacity="0.9" />
      <ellipse cx="86" cy="56" rx="26" ry="21" fill="url(#canopyBright)" opacity="0.8" />
      <ellipse cx="194" cy="56" rx="28" ry="21" fill="url(#canopyBright)" opacity="0.8" />

      {/* Layer 7: Golden-tipped crown */}
      <ellipse cx="140" cy="42" rx="54" ry="29" fill="url(#canopyGold)" opacity="0.85" />
      <ellipse cx="108" cy="44" rx="28" ry="22" fill="#6ab848" opacity="0.6" />
      <ellipse cx="172" cy="44" rx="28" ry="22" fill="#6ab848" opacity="0.6" />

      {/* Layer 8: Top crown */}
      <ellipse cx="140" cy="36" rx="38" ry="22" fill="#7ac858" opacity="0.65" />
      <ellipse cx="125" cy="38" rx="20" ry="15" fill="#8ad468" opacity="0.5" />
      <ellipse cx="156" cy="38" rx="20" ry="15" fill="#8ad468" opacity="0.5" />
      <ellipse cx="140" cy="30" rx="24" ry="15" fill="#9ae078" opacity="0.45" />

      {/* Layer 9: Topmost puff */}
      <ellipse cx="140" cy="26" rx="18" ry="11" fill="#a0e880" opacity="0.35" />

      {/* Side lobes for organic shape */}
      <ellipse cx="68" cy="76" rx="24" ry="22" fill="url(#canopyMid)" opacity="0.5" />
      <ellipse cx="212" cy="76" rx="24" ry="22" fill="url(#canopyMid)" opacity="0.5" />
      <ellipse cx="76" cy="64" rx="20" ry="18" fill="url(#canopyLight)" opacity="0.45" />
      <ellipse cx="204" cy="64" rx="20" ry="18" fill="url(#canopyLight)" opacity="0.45" />

      {/* Lower canopy overhanging — where crystals hang */}
      <ellipse cx="100" cy="96" rx="32" ry="24" fill="url(#canopyMid)" opacity="0.55" />
      <ellipse cx="180" cy="96" rx="32" ry="24" fill="url(#canopyMid)" opacity="0.55" />
      <ellipse cx="82" cy="92" rx="22" ry="18" fill="url(#canopyLight)" opacity="0.42" />
      <ellipse cx="198" cy="92" rx="22" ry="18" fill="url(#canopyLight)" opacity="0.42" />

      {/* Inner canopy gold glow overlay */}
      <ellipse cx="140" cy="60" rx="60" ry="38" fill="url(#coreGlow)" opacity="0.5" style={{ mixBlendMode: "screen" }} />

      {/* === CRYSTAL STRING LINES (from branches to crystal top) === */}
      {crystals.map((c, i) => (
        <line key={`str-${i}`}
          x1={c[0]} y1={c[1] - 6}
          x2={c[0]} y2={c[1]}
          stroke="rgba(180,220,200,0.25)" strokeWidth="0.4" />
      ))}

      {/* === HANGING CRYSTALS — dramatic gemstones === */}
      {crystals.map((c, i) => {
        const cx = c[0], topY = c[1], bottomY = c[2], w = c[3], op = c[4], dur = c[5];
        const hw = w / 2;
        return (
          <g key={`crystal-${i}`} filter="url(#crystalGlow)">
            {/* Crystal body — elongated diamond with facets */}
            <path d={`M${cx},${topY} L${cx - hw},${topY + (bottomY - topY) * 0.35} L${cx - hw * 0.6},${bottomY - 2} L${cx},${bottomY} L${cx + hw * 0.6},${bottomY - 2} L${cx + hw},${topY + (bottomY - topY) * 0.35} Z`}
                  fill="url(#crystalGrad)" opacity={op} />
            {/* Facet lines */}
            <path d={`M${cx},${topY} L${cx},${bottomY - 2}`}
                  stroke="rgba(180,255,240,0.35)" strokeWidth="0.4" />
            <path d={`M${cx - hw * 0.3},${topY + (bottomY - topY) * 0.35} L${cx - hw * 0.3},${bottomY - 6}`}
                  stroke="rgba(140,230,220,0.2)" strokeWidth="0.3" />
            <path d={`M${cx + hw * 0.3},${topY + (bottomY - topY) * 0.35} L${cx + hw * 0.3},${bottomY - 6}`}
                  stroke="rgba(140,230,220,0.2)" strokeWidth="0.3" />
            {/* Crystal tip glow */}
            <circle cx={cx} cy={bottomY - 1} r={1.2} fill="rgba(150,255,245,0.55)" />
            {/* Swing animation */}
            <animateTransform attributeName="transform" type="translate"
              values="0,0; 0,2; 0,0" dur={`${dur}s`} repeatCount="indefinite" additive="replace" />
          </g>
        );
      })}

      {/* === FLOATING MAGICAL PARTICLES === */}
      {particles.map((p, i) => {
        if (p.float) {
          return (
            <circle key={`part-${i}`} cx={p.cx} cy={p.cy} r={p.r}
              fill="rgba(255,225,140,0.9)" filter="url(#sparkleGlow)" opacity="0">
              <animate attributeName="opacity"
                values={`0;${p.opacity};0`}
                dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy"
                values={`${p.cy + 30};${p.cy - 30}`}
                dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              <animate attributeName="r"
                values={`${p.r * 0.5};${p.r};${p.r * 0.5}`}
                dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            </circle>
          );
        }
        return (
          <circle key={`part-${i}`} cx={p.cx} cy={p.cy} r={p.r}
            fill="rgba(255,220,120,0.85)" filter="url(#sparkleGlow)" opacity={p.opacity}>
            <animate attributeName="opacity"
              values={`${p.opacity * 0.15};${p.opacity};${p.opacity * 0.15}`}
              dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
            <animate attributeName="r"
              values={`${p.r * 0.4};${p.r};${p.r * 0.4}`}
              dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          </circle>
        );
      })}

      {/* === KEY ACCENT SPARKLES === */}
      {/* Center trunk core */}
      <circle cx="140" cy="155" r="3" fill="#fffbe8" filter="url(#strongGlow)" opacity="0.9">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;3.5;2" dur="2.2s" repeatCount="indefinite" />
      </circle>
      {/* Canopy center */}
      <circle cx="140" cy="50" r="2.2" fill="#fffbe8" filter="url(#sparkleGlow)" opacity="0.85">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Left branch tip */}
      <circle cx="92" cy="118" r="1.6" fill="#fffce8" filter="url(#sparkleGlow)" opacity="0.7">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.4s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      {/* Right branch tip */}
      <circle cx="188" cy="118" r="1.6" fill="#fffce8" filter="url(#sparkleGlow)" opacity="0.7">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.4s" begin="1.4s" repeatCount="indefinite" />
      </circle>
      {/* Left lower */}
      <circle cx="82" cy="138" r="1.3" fill="#fff8d0" filter="url(#sparkleGlow)" opacity="0.65">
        <animate attributeName="opacity" values="0.15;0.7;0.15" dur="3.8s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      {/* Right lower */}
      <circle cx="198" cy="138" r="1.3" fill="#fff8d0" filter="url(#sparkleGlow)" opacity="0.65">
        <animate attributeName="opacity" values="0.15;0.7;0.15" dur="3.8s" begin="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Bottom crystal glow accent */}
      <circle cx="140" cy="112" r="1.5" fill="#b8ffe8" filter="url(#crystalGlow)" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" begin="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ─── Mini tree for timeline ─── */
function MiniTree({ stage = 0 }: { stage?: number }) {
  const size = 20 + stage * 6;
  const canopySize = 8 + stage * 3;
  const trunkH = 6 + stage * 3;

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <ellipse cx="22" cy="40" rx="14" ry="3" fill="#eae5f3" />
      <rect x="19" y={40 - trunkH} width="6" height={trunkH} rx="1" fill="#8B6B4A" />
      <ellipse cx="22" cy={40 - trunkH - canopySize / 2} rx={canopySize} ry={canopySize}
               fill="#6B8F5A" opacity={0.6 + stage * 0.08} />
      <ellipse cx="20" cy={40 - trunkH - canopySize / 2 - 2} rx={canopySize * 0.65} ry={canopySize * 0.65}
               fill="#7CA968" opacity={0.7 + stage * 0.06} />
      {stage >= 3 && (
        <>
          <ellipse cx={22 + canopySize * 0.5} cy={40 - trunkH - canopySize * 0.3} rx={canopySize * 0.4} ry={canopySize * 0.35}
                   fill="#8BB877" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

/* ─── Stat Item for tree card (with icon matching reference) ─── */
function StatItem({
  label,
  value,
  level,
  trend,
  position,
  iconType,
}: {
  label: string;
  value: number;
  level: string;
  trend: number;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  iconType: "shield" | "compass" | "user" | "lightning";
}) {
  const posStyles = {
    "top-left": { top: 8, left: 14 },
    "top-right": { top: 8, right: 14 },
    "bottom-left": { bottom: 8, left: 14 },
    "bottom-right": { bottom: 8, right: 14 },
  };

  const alignRight = position === "top-right" || position === "bottom-right";

  const roundedValue = Math.round(value);

  // Icon SVG based on type
  const iconMap = {
    shield: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    compass: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    user: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    lightning: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };

  return (
    <div className={`absolute ${alignRight ? "text-right" : "text-left"}`}
         style={posStyles[position]}>
      {/* Icon */}
      <div className={alignRight ? "flex justify-end mb-1" : "mb-1"}>
        {iconMap[iconType]}
      </div>
      {/* Label */}
      <span className="block text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
        {label}
      </span>
      {/* Value */}
      <div className="text-[28px] font-bold text-white leading-none tracking-tight mt-0.5">{roundedValue}</div>
      {/* Level + Trend */}
      <div className={`flex items-center gap-1 mt-0.5 ${alignRight ? "justify-end" : ""}`}>
        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{level}</span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: trend >= 0 ? "#8ee8b0" : "#f0a0a0" }}
        >
          {trend >= 0 ? `\u2191` : `\u2193`}
        </span>
      </div>
    </div>
  );
}

/* ─── Metric Card for detail section ─── */
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
      <div className="text-2xl font-bold leading-none mb-0.5" style={{ color: "#2d2a34" }}>{Math.round(value)}</div>
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

  let maxVal = 100;
  let minVal = 0;

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


export function ForestScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { demoUser } = useDemo();
  const user = demoUser;
  const [entries, setEntries] = useState<ForestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForest = useCallback(async () => {
    try {
      const res = await request("/api/journal?list=1");
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (user) {
        void loadForest();
      } else {
        setLoading(false);
      }
    }, 0);

    const handleFocus = () => {
      if (user) {
        void loadForest();
      }
    };

    // Listen for tab change to refresh when user switches to forest tab
    const handleTabChange = (e: Event) => {
      if ((e as CustomEvent).detail?.tab === "forest" && user) {
        void loadForest();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("cosmic-echo:tab-change" as any, handleTabChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("cosmic-echo:tab-change" as any, handleTabChange);
    };
  }, [user, loadForest]);

  const selectedDate = useMemo(() => getSelectedDate(), []);
  const growthDays = useMemo(() => getGrowthDaysThroughDate(entries, selectedDate), [entries, selectedDate]);
  // Total growth days should always count ALL complete entries (cumulative, not filtered by date)
  const totalGrowthDays = useMemo(() => entries.filter((entry) => entry.isComplete).length, [entries]);
  const stageIndex = useMemo(() => getStageIndex(totalGrowthDays), [totalGrowthDays]);
  const stageProgress = useMemo(() => getStageProgress(totalGrowthDays), [totalGrowthDays]);
  const isZh = i18n.language === "zh-CN";

  // Generate tree stats based on actual scores from localStorage
  const [scoresVersion, setScoresVersion] = useState(0);
  
  const treeStats = useMemo(() => {
    // If no complete entries, force all scores to 0
    const completeEntries = entries.filter((entry) => entry.isComplete);
    if (completeEntries.length === 0) {
      console.log("[ForestScreen] No complete entries, forcing scores to 0");
      return {
        stability: 0,
        exploration: 0,
        introspection: 0,
        action: 0,
        stabilityTrend: 0,
        explorationTrend: 0,
        introspectionTrend: 0,
        actionTrend: 0,
      };
    }

    // Try to read scores from localStorage first
    let scores = { stability: 0, exploration: 0, introspection: 0, action: 0 };
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(window.localStorage.getItem("cosmic-echo:forest-scores") ?? "{}");
        console.log("[ForestScreen] Reading scores from localStorage:", stored);
        
        // Check if this is old data (all scores are 50), if so reset to 0
        if (stored.stability === 50 && stored.exploration === 50 && stored.introspection === 50 && stored.action === 50) {
          // Old data, reset to 0
          console.log("[ForestScreen] Detected old data (all 50), resetting to 0");
          window.localStorage.setItem("cosmic-echo:forest-scores", JSON.stringify({
            stability: 0,
            exploration: 0,
            introspection: 0,
            action: 0,
            history: [],
            lastUpdated: new Date().toISOString(),
          }));
        } else if (stored.stability !== undefined) {
          scores = {
            stability: stored.stability,
            exploration: stored.exploration,
            introspection: stored.introspection,
            action: stored.action,
          };
          console.log("[ForestScreen] Loaded scores:", scores);
        } else {
          console.log("[ForestScreen] No scores found in localStorage, using defaults:", scores);
        }
      } catch (error) {
        console.error("[ForestScreen] Error reading scores from localStorage:", error);
        // Use default scores (0)
      }
    }
    
    return {
      stability: scores.stability,
      exploration: scores.exploration,
      introspection: scores.introspection,
      action: scores.action,
      stabilityTrend: 0,
      explorationTrend: 0,
      introspectionTrend: 0,
      actionTrend: 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoresVersion, entries]);  // Re-run when entries change
  
  // Listen for score updates from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cosmic-echo:forest-scores") {
        console.log("[ForestScreen] localStorage changed, refreshing scores");
        setScoresVersion(prev => prev + 1);
      }
    };
    
    const handleTabChange = (e: CustomEvent) => {
      if (e.detail?.tab === "forest") {
        console.log("[ForestScreen] Tab changed to forest, refreshing scores");
        setScoresVersion(prev => prev + 1);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cosmic-echo:tab-change", handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cosmic-echo:tab-change", handleTabChange as EventListener);
    };
  }, []);

  // Format update date
  const updateDateStr = useMemo(() => formatDate(new Date()), []);

  // Growth timeline months
  const timelineMonths = useMemo(() => {
    const now = new Date();
    const months: Array<{ label: string; key: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = isZh ? `${d.getMonth() + 1}\u6708` : d.toLocaleString("en-US", { month: "short" });
      months.push({ label, key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` });
    }
    return months;
  }, [isZh]);

  // ─── Detail section data ───
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  // Mock historical data for chart (4 months of data)
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A9B68", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-lg px-6 pb-20 pt-7 space-y-5">
        {/* ═══ Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div className="flex items-start gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.back()}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full -ml-2"
              style={{ color: "#2d2a34" }}
              aria-label="返回"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>
            <div>
            <h1 className="font-heading text-[26px] font-bold leading-tight" style={{ color: "#2d2a34" }}>
              {t("forest.title")}
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#9794a2" }}>
              COSMIC FOREST
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: "#eae5f3",
              color: "#7A9B68",
              border: "1px solid #dbd5e8",
            }}
          >
            <span>{t("forest.treeInfo")}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
      </motion.div>

        {/* ═══ Status Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "#fefdfe", borderColor: "#eae5f3" }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A9B68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L12 22M12 2C12 2 8 6 8 10C8 14 12 14 12 14C12 14 16 14 16 10C16 6 12 2 12 2Z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: "#8A9B78" }}>{t("forest.currentStatus")}</span>
            </div>
            {stageProgress.totalStageDays !== Infinity && (
              <span className="text-[11px]" style={{ color: "#9794a2" }}>
                {t("forest.detail.currentProgress")} {stageProgress.currentStageDays}/{stageProgress.totalStageDays} {t("forest.days")}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold leading-tight" style={{ color: "#2d2a34" }}>
                {t(`forest.${STAGES[stageIndex]}`)}
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: "#EDF2EA", color: "#6B7D59" }}
              >
                {totalGrowthDays}{t("forest.days")}
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed mt-2" style={{ color: "#9794a2" }}>
            {t("forest.statusDesc")}
          </p>
        </motion.div>

        {/* ═══ Tree Visualization Card ═══ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0f2820 0%, #15322a 20%, #1a3d32 45%, #164035 70%, #122e24 100%)",
          }}
        >
          {/* ═══ Card Header ═══ */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white/90">{t("forest.treeOverview")}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("forest.updatedAt", { date: updateDateStr })}
            </span>
          </div>

          {/* ═══ Main Content Area (tree + stats) ═══ */}
          <div className="relative" style={{ height: 260 }}>
            {/* Stats positioned around the tree */}
            <StatItem
              label={t("forest.stability")}
              value={treeStats.stability}
              level={t("forest.levelUp")}
              trend={treeStats.stabilityTrend}
              position="top-left"
              iconType="shield"
            />
            <StatItem
              label={t("forest.exploration")}
              value={treeStats.exploration}
              level={t("forest.levelHigh")}
              trend={treeStats.explorationTrend}
              position="top-right"
              iconType="compass"
            />
            <StatItem
              label={t("forest.introspection")}
              value={treeStats.introspection}
              level={t("forest.levelMid")}
              trend={treeStats.introspectionTrend}
              position="bottom-left"
              iconType="user"
            />
            <StatItem
              label={t("forest.action")}
              value={treeStats.action}
              level={t("forest.levelMed")}
              trend={treeStats.actionTrend}
              position="bottom-right"
              iconType="lightning"
            />

            {/* Tree illustration centered */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <TreeIllustration />
            </div>
          </div>

          {/* ═══ Quote at very bottom of card ═══ */}
          <div className="relative z-10 px-5 pb-4 pt-1">
            <p className="text-[12px] leading-relaxed text-center" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("forest.treeQuote")}
            </p>
          </div>
        </motion.div>

        {/* ═══ Monthly Key Changes ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
        >
          <h3 className="text-sm font-bold mb-3" style={{ color: "#2d2a34" }}>{t("forest.monthlyChanges")}</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Card 1 */}
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9B68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L12 22M12 2C12 2 8 6 8 10C8 14 12 14 12 14C12 14 16 14 16 10C16 6 12 2 12 2Z" />
                </svg>
                <span className="text-[11px] font-semibold" style={{ color: "#4a5d3d" }}>{t("forest.rootDeepen")}</span>
              </div>
              <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "#9794a2" }}>{t("forest.rootDesc")}</p>
              <span
                className="text-[11px] font-bold"
                style={{ color: treeStats.stabilityTrend >= 0 ? "#5C9A6D" : "#C47060" }}
              >
                {treeStats.stabilityTrend >= 0 ? "\u2191 " : "\u2193 "}{Math.abs(treeStats.stabilityTrend)}%
              </span>
            </div>

            {/* Card 2 */}
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9B68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span className="text-[11px] font-semibold" style={{ color: "#4a5d3d" }}>{t("forest.branchStretch")}</span>
              </div>
              <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "#9794a2" }}>{t("forest.branchDesc")}</p>
              <span
                className="text-[11px] font-bold"
                style={{ color: treeStats.explorationTrend >= 0 ? "#5C9A6D" : "#C47060" }}
              >
                {treeStats.explorationTrend >= 0 ? "\u2191 " : "\u2193 "}{Math.abs(treeStats.explorationTrend)}%
              </span>
            </div>

            {/* Card 3 */}
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9B68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span className="text-[11px] font-semibold" style={{ color: "#4a5d3d" }}>{t("forest.energySediment")}</span>
              </div>
              <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "#9794a2" }}>{t("forest.energyDesc")}</p>
              <span
                className="text-[11px] font-bold"
                style={{ color: treeStats.actionTrend >= 0 ? "#5C9A6D" : "#C47060" }}
              >
                {treeStats.actionTrend >= 0 ? "\u2191 " : "\u2193 "}{Math.abs(treeStats.actionTrend)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* ═══ Detail Section (merged inline) ═══           */}
        {/* ═══════════════════════════════════════════════ */}

        {/* ═══ Monthly Analysis + Structure Trend (merged) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
        >
          <h2 className="text-base font-bold" style={{ color: "#2d2a34" }}>
            {t("forest.detail.monthlyAnalysis")}
            <span className="text-sm font-normal ml-1.5" style={{ color: "#9794a2" }}>
              ({monthStart.slice(5)} {"\u2013"} {monthEnd.slice(5)})
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
        </motion.div>


        {/* ═══ Next Stage Preview ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#f8f6fc", border: "1px solid #dbd5e8" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1" style={{ color: "#2d2a34" }}>
                {t("forest.detail.nextStagePreview")}
              </h3>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "#5C7A4A" }}>
                {t("forest.detail.previewStage", { stage: Math.min(stageIndex + 2, 5) })}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#9794a2" }}>
                {t("forest.detail.previewDesc")}
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color: "#a09888" }}>{t("forest.detail.currentProgress")} 68%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#dbd5e8" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "68%" }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: "#7A9B68" }}
                  />
                </div>
              </div>
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
        </motion.div>

      </div>
    </div>
  );
}
