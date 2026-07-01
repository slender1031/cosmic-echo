"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTarotCardImageUrl, type TarotCard } from "@/lib/tarot-data";
import { getLenormandCardById, getLenormandCardImageUrl, type LenormandCard } from "@/lib/lenormand-data";

type AnyCard = TarotCard | LenormandCard;

// -------- inline SVG illustration by imageSymbol -------
type SvgContent = React.ReactElement;

function symbolSvg(symbol: string, isRev: boolean): SvgContent {
  const g = "#C2A040";
  const lg = "#F5E6C0";
  const cx = 120;
  const cy = 150;
  const rot = isRev ? `rotate(180,${cx},${cy})` : undefined;

  const major: Record<string, SvgContent> = {
    "circle-with-star": (
      <g key="star">
        <circle cx={cx} cy={cy} r={54} fill="none" stroke={g} strokeWidth={1.5} opacity={0.5}/>
        <circle cx={cx} cy={cy} r={28} fill="rgba(245,230,192,0.08)" stroke={g} strokeWidth={2}/>
        <polygon points="120,112 130,148 162,148 134,170 144,206 120,184 96,206 106,170 78,148 110,148" fill={g} opacity={0.7}/>
        <circle cx={cx} cy={cy} r={6} fill={lg}/>
      </g>
    ),
    "wand-with-spiral": (
      <g key="wand">
        <line x1={90} y1={cy+60} x2={150} y2={cy-60} stroke={g} strokeWidth={3.5} strokeLinecap="round"/>
        <circle cx={90} cy={cy+60} r={7} fill={g} opacity={0.45}/>
        <circle cx={150} cy={cy-60} r={7} fill={g} opacity={0.45}/>
      </g>
    ),
    "crescent-moon": (
      <g key="moon">
        <path d={`M${cx} ${cy-48} A48 48 0 1 1 ${cx} ${cy+48} A34 48 0 1 0 ${cx} ${cy-48} Z`} fill="none" stroke={g} strokeWidth={2.2}/>
        <circle cx={cx+6} cy={cy} r={26} fill="rgba(212,197,226,0.10)"/>
      </g>
    ),
    "flower-bloom": (
      <g key="flower">
        {[0,60,120,180,240,300].map((a) => {
          const rad = a * Math.PI/180, px = cx + Math.cos(rad)*30, py = cy + Math.sin(rad)*30;
          return <ellipse key={a} cx={px} cy={py} rx={16} ry={9} transform={`rotate(${a},${px},${py})`} fill="rgba(232,196,160,0.30)" stroke={g} strokeWidth={0.7}/>;
        })}
        <circle cx={cx} cy={cy} r={13} fill="rgba(245,230,192,0.22)" stroke={g} strokeWidth={1.3}/>
      </g>
    ),
    "geometric-mountain": (
      <g key="mtn">
        <polygon points={`${cx},${cy-52} ${cx-62},${cy+38} ${cx+62},${cy+38}`} fill="none" stroke={g} strokeWidth={2}/>
        <polygon points={`${cx},${cy-20} ${cx-34},${cy+38} ${cx+34},${cy+38}`} fill="rgba(245,230,192,0.08)"/>
      </g>
    ),
    "pillar-arch": (
      <g key="arch">
        <rect x={cx-44} y={cy-48} width={18} height={82} rx={4} fill="none" stroke={g} strokeWidth={2}/>
        <rect x={cx+26} y={cy-48} width={18} height={82} rx={4} fill="none" stroke={g} strokeWidth={2}/>
        <path d={`M${cx-44} ${cy-48} Q${cx} ${cy-92} ${cx+44} ${cy-48}`} fill="none" stroke={g} strokeWidth={2.2}/>
      </g>
    ),
    "two-circles-union": (
      <g key="union">
        <circle cx={cx-30} cy={cy} r={32} fill="none" stroke={g} strokeWidth={2} opacity={0.65}/>
        <circle cx={cx+30} cy={cy} r={32} fill="none" stroke={g} strokeWidth={2} opacity={0.65}/>
      </g>
    ),
    "arrow-forward": (
      <g key="arrow">
        <line x1={cx-64} y1={cy} x2={cx+48} y2={cy} stroke={g} strokeWidth={3} strokeLinecap="round"/>
        <polygon points={`${cx+48},${cy} ${cx+26},${cy-20} ${cx+26},${cy+20}`} fill={g} opacity={0.75}/>
      </g>
    ),
    "infinity-loop": (
      <g key="inf">
        <path d={`M${cx-48} ${cy} C${cx-48} ${cy-48} ${cx} ${cy-48} ${cx} ${cy} C${cx} ${cy+48} ${cx+48} ${cy+48} ${cx+48} ${cy}`} fill="none" stroke={g} strokeWidth={2.5}/>
        <path d={`M${cx-48} ${cy} C${cx-48} ${cy+48} ${cx} ${cy+48} ${cx} ${cy} C${cx} ${cy-48} ${cx+48} ${cy-48} ${cx+48} ${cy}`} fill="none" stroke={g} strokeWidth={1.2} opacity={0.3}/>
      </g>
    ),
    "lantern-light": (
      <g key="lantern">
        <rect x={cx-14} y={cy-22} width={28} height={40} rx={6} fill="none" stroke={g} strokeWidth={2}/>
        <circle cx={cx} cy={cy-6} r={9} fill="rgba(245,230,192,0.28)" stroke={g} strokeWidth={1.2}/>
        <line x1={cx} y1={cy+18} x2={cx} y2={cy+58} stroke={g} strokeWidth={2.2} strokeLinecap="round"/>
        <circle cx={cx} cy={cy-6} r={4} fill={lg} opacity={0.82}/>
      </g>
    ),
    "spiral-circle": (
      <g key="spiral">
        {[0,1,2,3].map(i => {
          const r = 46 - i*10;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={g} strokeWidth={1.8-i*0.3} opacity={0.65-i*0.1}/>;
        })}
        <circle cx={cx} cy={cy} r={5} fill={g} opacity={0.78}/>
      </g>
    ),
    "balance-scale": (
      <g key="scale">
        <line x1={cx} y1={cy-52} x2={cx} y2={cy+52} stroke={g} strokeWidth={2.2} strokeLinecap="round"/>
        <line x1={cx-58} y1={cy} x2={cx+58} y2={cy} stroke={g} strokeWidth={2.2} strokeLinecap="round"/>
        <polygon points={`${cx-48},${cy+18} ${cx},${cy} ${cx+48},${cy+18}`} fill="rgba(245,230,192,0.13)" stroke={g} strokeWidth={1.3}/>
        <polygon points={`${cx-48},${cy-18} ${cx},${cy} ${cx+48},${cy-18}`} fill="rgba(245,230,192,0.13)" stroke={g} strokeWidth={1.3}/>
      </g>
    ),
    "inverted-figure": (
      <g key="hanged">
        <circle cx={cx} cy={cy-28} r={13} fill="none" stroke={g} strokeWidth={1.3} opacity={0.55}/>
        <line x1={cx} y1={cy-15} x2={cx} y2={cy+18} stroke={g} strokeWidth={1.8}/>
        <line x1={cx-22} y1={cy-20} x2={cx+10} y2={cy-5} stroke={g} strokeWidth={1.8} strokeLinecap="round"/>
        <line x1={cx+22} y1={cy-20} x2={cx-10} y2={cy-5} stroke={g} strokeWidth={1.8} strokeLinecap="round"/>
        <line x1={cx} y1={cy+18} x2={cx-18} y2={cy+55} stroke={g} strokeWidth={1.8} strokeLinecap="round"/>
        <line x1={cx} y1={cy+18} x2={cx+18} y2={cy+55} stroke={g} strokeWidth={1.8} strokeLinecap="round"/>
      </g>
    ),
    "phoenix-symbol": (
      <g key="phoenix">
        <path d={`M${cx} ${cy-52} C${cx-42} ${cy-28} ${cx-58} ${cy+8} ${cx-22} ${cy+42} C${cx-6} ${cy+18} ${cx+6} ${cy+18} ${cx+22} ${cy+42} C${cx+58} ${cy+8} ${cx+42} ${cy-28} ${cx} ${cy-52} Z`} fill="rgba(245,230,192,0.10)" stroke={g} strokeWidth={2}/>
      </g>
    ),
    "two-vessels-flow": (
      <g key="vessels">
        <path d={`M${cx-42} ${cy-18} L${cx-42} ${cy+28} L${cx-22} ${cy+28} L${cx-22} ${cy-18} Z`} fill="none" stroke={g} strokeWidth={2}/>
        <path d={`M${cx+22} ${cy-18} L${cx+22} ${cy+28} L${cx+42} ${cy+28} L${cx+42} ${cy-18} Z`} fill="none" stroke={g} strokeWidth={2}/>
        <path d={`M${cx-22} ${cy+6} Q${cx} ${cy-12} ${cx+22} ${cy+6}`} fill="none" stroke={g} strokeWidth={1.4} opacity={0.55}/>
      </g>
    ),
    "chain-loop": (
      <g key="chain">
        {[-34,-12,12,34].map((off,i) => {
          const oy = cy + off;
          const rot2 = i%2===0 ? 0 : 90;
          return <ellipse key={i} cx={cx} cy={oy} rx={20} ry={11} fill="none" stroke={g} strokeWidth={2} transform={`rotate(${rot2},${cx},${oy})`}/>;
        })}
      </g>
    ),
    "lightning-bolt": (
      <g key="bolt">
        <polygon points={`${cx-4},${cy-52} ${cx+22},${cy-4} ${cx+4},${cy-4} ${cx+25},${cy+52} ${cx-4},${cy+10} ${cx-18},${cy+10}`} fill={g} opacity={0.68} stroke={g} strokeWidth={0.8}/>
      </g>
    ),
    "eight-point-star": (
      <g key="estar">
        <polygon points="120,118 132,148 166,142 140,166 176,190 142,184 120,206 98,184 64,190 100,166 74,142 108,148" fill={g} opacity={0.55}/>
        <circle cx={cx} cy={cy} r={7} fill="rgba(200,216,232,0.28)" stroke={g} strokeWidth={1.3}/>
      </g>
    ),
    "crescent-path": (
      <g key="cpath">
        <path d={`M${cx} ${cy-52} A52 52 0 1 1 ${cx} ${cy+52} A36 52 0 1 0 ${cx} ${cy-52} Z`} fill="none" stroke={g} strokeWidth={2.2}/>
      </g>
    ),
    "radiant-circle": (
      <g key="sun">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
          const rad = a*Math.PI/180, x2 = cx+Math.cos(rad)*56, y2 = cy+Math.sin(rad)*56;
          return <line key={a} x1={cx+Math.cos(rad)*12} y1={cy+Math.sin(rad)*12} x2={x2} y2={y2} stroke={g} strokeWidth={1.3} opacity={0.45}/>;
        })}
        <circle cx={cx} cy={cy} r={20} fill="rgba(245,230,192,0.13)" stroke={g} strokeWidth={1.8}/>
        <circle cx={cx} cy={cy} r={6} fill={lg} opacity={0.8}/>
      </g>
    ),
    "rising-figure": (
      <g key="judgement">
        <path d={`M${cx-28} ${cy+52} L${cx-10} ${cy-8} L${cx+10} ${cy-8} L${cx+28} ${cy+52} Z`} fill="rgba(245,230,192,0.08)" stroke={g} strokeWidth={1.8}/>
        <circle cx={cx} cy={cy-22} r={11} fill="none" stroke={g} strokeWidth={1.3} opacity={0.55}/>
      </g>
    ),
    "wreath-circle": (
      <g key="world">
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = a*Math.PI/180, px = cx+Math.cos(rad)*38, py = cy+Math.sin(rad)*38;
          return <circle key={a} cx={px} cy={py} r={9} fill="none" stroke={g} strokeWidth={1.3} opacity={0.45}/>;
        })}
        <circle cx={cx} cy={cy} r={40} fill="none" stroke={g} strokeWidth={1.2} opacity={0.25}/>
      </g>
    ),
  };

  // ---- Minor Arcana: suit-based ----
  const suitKey = symbol.split("-")[0];
  const suitSvg: Record<string, SvgContent> = {
    cups: (
      <g key="cup">
        <path d={`M${cx} ${cy-32} A28 30 0 0 1 ${cx} ${cy+22} A28 30 0 0 1 ${cx} ${cy-32} Z`} fill="none" stroke={g} strokeWidth={2.2}/>
        <line x1={cx} y1={cy+22} x2={cx} y2={cy+48} stroke={g} strokeWidth={2}/>
        <path d={`M${cx-16} ${cy+48} Q${cx} ${cy+36} ${cx+16} ${cy+48}`} fill="none" stroke={g} strokeWidth={1.8}/>
      </g>
    ),
    pentacles: (
      <g key="coin">
        <circle cx={cx} cy={cy} r={36} fill="none" stroke={g} strokeWidth={2.2}/>
        <circle cx={cx} cy={cy} r={26} fill="none" stroke={g} strokeWidth={1} opacity={0.35}/>
        <circle cx={cx} cy={cy} r={5} fill={g} opacity={0.6}/>
      </g>
    ),
    swords: (
      <g key="sword">
        {[0,60,120,180,240,300].map(a => {
          const rad = a*Math.PI/180, x2 = cx+Math.cos(rad)*46, y2 = cy+Math.sin(rad)*46;
          return <line key={a} x1={cx} y1={cy} x2={x2} y2={y2} stroke={g} strokeWidth={1} opacity={0.35}/>;
        })}
        <polygon points={`${cx},${cy-48} ${cx-16},${cy+28} ${cx+16},${cy+28}`} fill="none" stroke={g} strokeWidth={2.2}/>
      </g>
    ),
    wands: (
      <g key="wand">
        {[0,72,144,216,288].map((a,i) => {
          const rad = a*Math.PI/180, len = 44-i*5, x2 = cx+Math.cos(rad)*len, y2 = cy+Math.sin(rad)*len;
          return <line key={a} x1={cx} y1={cy} x2={x2} y2={y2} stroke={g} strokeWidth={2.2-i*0.3} strokeLinecap="round" opacity={0.55}/>;
        })}
        <line x1={cx-60} y1={cy} x2={cx+60} y2={cy} stroke={g} strokeWidth={2.5} strokeLinecap="round"/>
      </g>
    ),
  };

  const fromMajor = major[symbol];
  if (fromMajor) return <g transform={rot}>{fromMajor}</g>;

  const fromSuit = suitSvg[suitKey];
  if (fromSuit) return <g transform={rot}>{fromSuit}</g>;

  // generic fallback: show first char of Chinese name
  const ch = symbol.charAt(0);
  return (
    <g transform={rot}>
      <circle cx={cx} cy={cy} r={44} fill="none" stroke={g} strokeWidth={1.2} opacity={0.35}/>
      <text x={cx} y={cy+12} textAnchor="middle" fontFamily="Georgia,serif" fontSize={38} fill={g} opacity={0.42}>{ch}</text>
    </g>
  );
}

const FALLBACK_COLORS: Record<string, { from: string; to: string }> = {
  fool: { from: "#FAD8B0", to: "#E8A852" },
  magician: { from: "#F9D4C0", to: "#D4906A" },
  "high-priestess": { from: "#DDD0F0", to: "#A890C8" },
  empress: { from: "#F0E4C8", to: "#C8A870" },
  emperor: { from: "#F0D8C0", to: "#B88050" },
  hierophant: { from: "#EAD8C0", to: "#B8A080" },
  lovers: { from: "#FDDDD0", to: "#E09080" },
  chariot: { from: "#C8D8F0", to: "#88A8C8" },
  strength: { from: "#FAE8C0", to: "#D8A848" },
  hermit: { from: "#C8D8C0", to: "#88A880" },
  wheel: { from: "#E8D8C0", to: "#B8A080" },
  justice: { from: "#C0D8E8", to: "#80A8C0" },
  "hanged-man": { from: "#B8C8D8", to: "#7898B0" },
  death: { from: "#C8B8C8", to: "#9888A8" },
  temperance: { from: "#D8F0D8", to: "#98C098" },
  devil: { from: "#D8C8B8", to: "#A89880" },
  tower: { from: "#D8B8A0", to: "#A88860" },
  star: { from: "#FAD8B0", to: "#E87E72" },
  moon: { from: "#D4C4D8", to: "#9888B0" },
  sun: { from: "#FFF0A0", to: "#F5A820" },
  judgement: { from: "#C0C8D8", to: "#8098B0" },
  world: { from: "#C8D8C0", to: "#88A880" },
};

export function CardBack({ onClick, hint = true }: { onClick?: () => void; hint?: boolean }) {
  return (
    <div
      className="relative select-none overflow-visible"
      style={{
        width: "180px",
        height: "260px",
        perspective: "1000px",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {/* Mystical rotating ring — extends 14px beyond card on all sides */}
      <div
        className="mystical-ring absolute rounded-[18px]"
        style={{ inset: "-14px" }}
      >
        {/* Pink accent dot at top center of the ring */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "-3px",
            width: "5px",
            height: "5px",
            backgroundColor: "#c8708a",
            borderRadius: "50%",
            opacity: 0.6,
          }}
        />
      </div>

      {/* Tarot Card body */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[14px]"
        style={{
          background: "linear-gradient(165deg, #6a5ca0 0%, #5a4d8e 30%, #4a3f7c 60%, #544690 100%)",
          border: "1px solid rgba(180, 160, 220, 0.25)",
          boxShadow: "0 12px 40px rgba(90, 77, 142, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Corner ornaments */}
        <div
          className="absolute left-2 top-2"
          style={{
            width: "24px", height: "24px",
            borderTop: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderLeft: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderTopLeftRadius: "4px",
            opacity: 0.3,
          }}
        />
        <div
          className="absolute right-2 top-2"
          style={{
            width: "24px", height: "24px",
            borderTop: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderRight: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderTopRightRadius: "4px",
            opacity: 0.3,
          }}
        />
        <div
          className="absolute bottom-2 left-2"
          style={{
            width: "24px", height: "24px",
            borderBottom: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderLeft: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderBottomLeftRadius: "4px",
            opacity: 0.3,
          }}
        />
        <div
          className="absolute bottom-2 right-2"
          style={{
            width: "24px", height: "24px",
            borderBottom: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderRight: "1.5px solid rgba(220, 160, 180, 0.5)",
            borderBottomRightRadius: "4px",
            opacity: 0.3,
          }}
        />

        {/* Star Compass */}
        <div className="relative mb-4" style={{ width: "80px", height: "80px" }}>
          <svg
            className="compass-star-svg absolute inset-0"
            viewBox="0 0 80 80"
          >
            <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(220,160,180,0.1)" strokeWidth="0.5" />
            <circle cx="40" cy="40" r="20" fill="none" stroke="rgba(220,160,180,0.07)" strokeWidth="0.5" />
            <circle cx="40" cy="40" r="37" fill="none" stroke="rgba(220,160,180,0.05)" strokeWidth="0.3" strokeDasharray="3 6" />
          </svg>
          {/* 8 compass rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 origin-top"
              style={{
                width: "1px",
                height: "32px",
                transform: `translate(-50%, -100%) rotate(${deg}deg)`,
                background: "linear-gradient(to top, transparent, rgba(220, 160, 180, 0.35))",
              }}
            />
          ))}
          {/* Compass center dot */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "rgba(220, 160, 180, 0.7)",
              boxShadow: "0 0 12px rgba(220, 160, 180, 0.35)",
            }}
          />
        </div>

        {/* Text labels */}
        {hint && (
          <>
            <span
              className="font-['Cormorant_Garamond','Georgia',serif] text-sm font-normal uppercase"
              style={{
                color: "rgba(220, 160, 180, 0.6)",
                letterSpacing: "0.25em",
              }}
            >
              Cosmic Echo
            </span>
            <span
              className="font-['Noto_Serif_SC',serif] mt-1 text-xs font-normal"
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                letterSpacing: "0.2em",
              }}
            >
              宇宙回响
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function LenormandFallbackSvg({ card, reversed }: { card: LenormandCard; reversed: boolean }) {
  const y1 = reversed ? 195 : 120;
  const y2 = reversed ? 140 : 160;
  return (
    <g>
      <rect x="8" y="30" width="224" height="240" fill="none" stroke="rgba(245,230,192,0.08)" strokeWidth="1" rx="10" />
      <text x="120" y={y1} textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fill="rgba(245,230,192,0.45)">{card.number}</text>
      <text x="120" y={y2} textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" fill="rgba(245,230,192,0.35)">{card.name}</text>
    </g>
  );
}

// Auto-detect card system from card ID format: tarot IDs contain hyphens (e.g. "major-0", "wands-1"), lenormand IDs are single words (e.g. "rider", "clover")
function detectCardSystem(cardId: string): "tarot" | "lenormand" {
  return cardId.includes("-") ? "tarot" : "lenormand";
}

export function CardFront({ card, orientation, cardSystem }: { card: AnyCard; orientation: "upright" | "reversed"; cardSystem?: "tarot" | "lenormand" }) {
  const effectiveCardSystem = cardSystem ?? detectCardSystem(card.id);
  const [imgError, setImgError] = useState(false);
  const imgUrl = effectiveCardSystem === "lenormand"
    ? getLenormandCardImageUrl(card.id)
    : getTarotCardImageUrl(card.id);
  const showImage = imgUrl && !imgError;
  const fallback = effectiveCardSystem === "lenormand"
    ? { from: (card as LenormandCard).color, to: "#6a5a94" }
    : FALLBACK_COLORS[card.id] ?? { from: (card as TarotCard).color || "#7e63c9", to: "#8A7E72" };

  return (
    <div
      className="relative w-full overflow-hidden rounded-[28px]"
      style={{
        aspectRatio: "2/3.4",
        transform: orientation === "reversed" && effectiveCardSystem !== "lenormand" ? "rotate(180deg)" : undefined,
        background: `linear-gradient(to bottom, ${fallback.from}, ${fallback.to})`,
      }}
    >
      {showImage ? (
        <img
          src={imgUrl}
          alt={card.nameZh}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback: inline SVG illustration — works for ALL 78 cards */
        <div className="flex h-full w-full items-center justify-center p-4">
          <svg viewBox="0 0 240 300" className="h-3/5 w-4/5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fallback.from} />
                <stop offset="100%" stopColor={fallback.to} />
              </linearGradient>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F5E6C0" />
                <stop offset="100%" stopColor="#C2A040" />
              </linearGradient>
            </defs>
            <rect width="240" height="300" fill="url(#bg)" rx="14" />
            <rect width="240" height="300" fill="none" stroke="url(#g)" strokeWidth="2" rx="14" />
            <rect x="6" y="6" width="228" height="288" fill="none" stroke="rgba(245,230,192,0.18)" strokeWidth="1" rx="10" />
            {effectiveCardSystem === "tarot"
              ? symbolSvg((card as TarotCard).imageSymbol, orientation === "reversed")
              : LenormandFallbackSvg({ card: card as LenormandCard, reversed: false })}
          </svg>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3"
        style={{
          background: "linear-gradient(to top, rgba(20,10,0,0.88) 0%, rgba(20,10,0,0.45) 65%, transparent 100%)",
        }}
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="font-heading text-base font-bold leading-tight text-white drop-shadow-sm">{card.nameZh}</p>
            <p className="mt-0.5 text-[10px] tracking-wider text-white/55">{card.name}</p>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/10" />
    </div>
  );
}

interface TarotCardDisplayProps {
  card: AnyCard;
  orientation: "upright" | "reversed";
  revealed?: boolean;
  showBack?: boolean;
  autoFlip?: boolean;
  onFlip?: () => void;
  cardSystem?: "tarot" | "lenormand";
}

export function TarotCardDisplay({
  card,
  orientation,
  revealed = true,
  showBack = false,
  autoFlip = false,
  onFlip,
  cardSystem = "tarot",
}: TarotCardDisplayProps) {
  const [phase, setPhase] = useState<"back" | "flipping-out" | "flipping-in" | "front">(
    showBack ? "back" : "front",
  );

  const flip = () => {
    if (phase !== "back") return;
    setPhase("flipping-out");
    onFlip?.();
    window.setTimeout(() => setPhase("flipping-in"), 300);
    window.setTimeout(() => setPhase("front"), 600);
  };

  useEffect(() => {
    if (autoFlip && phase === "back") {
      const timer = window.setTimeout(flip, 600);
      return () => window.clearTimeout(timer);
    }
  }, [autoFlip, phase]);

  if (phase === "back") {
    return (
      <motion.div animate={{ rotateY: 0 }} style={{ perspective: "1200px" }}>
        <CardBack onClick={autoFlip ? undefined : flip} hint />
      </motion.div>
    );
  }

  if (phase === "flipping-out") {
    return (
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 90 }}
        transition={{ duration: 0.3, ease: "easeIn" }}
        style={{ perspective: "1200px" }}
      >
        <CardBack hint={false} />
      </motion.div>
    );
  }

  if (phase === "flipping-in") {
    return (
      <motion.div
        initial={{ rotateY: -90 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ perspective: "1200px" }}
      >
        <CardFront card={card} orientation={orientation} cardSystem={cardSystem} />
      </motion.div>
    );
  }

  return revealed && !showBack ? (
    <motion.div
      initial={{ rotateY: -90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ perspective: "1200px" }}
    >
      <CardFront card={card} orientation={orientation} cardSystem={cardSystem} />
    </motion.div>
  ) : (
    <CardFront card={card} orientation={orientation} cardSystem={cardSystem} />
  );
}
