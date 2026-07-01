"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { TAROT_CARDS } from "@/lib/tarot-data";
import { getTarotCardImageUrl } from "@/lib/tarot-data";
import { LENORMAND_CARDS } from "@/lib/lenormand-data";
import { getLenormandCardImageUrl } from "@/lib/lenormand-data";
import { CardFront } from "@/components/tarot/tarot-card-display";
import { addCase, updateCase, getCaseById, notifyCasesUpdated, SPREADS_TAROT, SPREADS_LENORMAND, type SpreadDef } from "@/lib/cases-storage";

/* ── 牌阵定义（已从 cases-storage.ts 导入） ── */
// SPREADS_TAROT, SPREADS_LENORMAND 已从 @/lib/cases-storage 导入

interface Position {
  label: string;
  card: { id: string; name: string; nameZh: string; upright: boolean } | null;
}

type ResultStatus = "pending" | "matched" | "unmatched";

const CATEGORIES = [
  { key: "career", zh: "事业", en: "Career" },
  { key: "love", zh: "感情", en: "Love" },
  { key: "decision", zh: "决策", en: "Decision" },
  { key: "relation", zh: "人际", en: "Social" },
  { key: "growth", zh: "成长", en: "Growth" },
  { key: "wealth", zh: "财富", en: "Wealth" },
];

const PRESET_QUESTIONS_ZH = [
  "近期工作运势如何？",
  "感情关系走向如何？",
];
const PRESET_QUESTIONS_EN = [
  "How will my career go?",
  "What's my relationship direction?",
];

/* ── 主组件 ── */
export function CasesNewScreen({ caseId }: { caseId?: number }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === "zh-CN";
  const isEdit = caseId != null;

  /* 基础状态 */
  const [cardSystem, setCardSystem] = useState<"tarot" | "lenormand">("tarot");
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [review, setReview] = useState("");
  const [resultStatus, setResultStatus] = useState<ResultStatus>("pending");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  /* 牌阵状态 */
  const [selectedSpread, setSelectedSpread] = useState<SpreadDef | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  /* 弹窗状态 */
  const [showSpreadModal, setShowSpreadModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardModalSearch, setCardModalSearch] = useState("");
  const [editingPosIdx, setEditingPosIdx] = useState(-1);
  /* 待确认选牌（多张：选牌 → 确认 → 按顺序填入牌阵位置） */
  const [pendingCards, setPendingCards] = useState<Array<{ cardId: string; upright: boolean }>>([]);

  /* 手风琴（各自独立开关） */
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  /* 分类下拉 */
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  /* 当前牌库 */
  const currentCards = useMemo(() => {
    return cardSystem === "tarot" ? TAROT_CARDS : LENORMAND_CARDS;
  }, [cardSystem]);

  /* 过滤后的牌（搜索） */
  const filteredCards = useMemo(() => {
    if (!cardModalSearch.trim()) return currentCards;
    const q = cardModalSearch.toLowerCase();
    return currentCards.filter(
      (c: { name: string; nameZh: string }) =>
        c.nameZh.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }, [cardModalSearch, currentCards]);

  /* 卡牌分类筛选 */
  const MAJOR_ARCANA_IDS = useMemo(() => new Set([
    "fool","magician","high-priestess","empress","emperator","hierophant",
    "lovers","chariot","strength","hermit","wheel","justice",
    "hanged-man","death","temperance","devil","tower","star","moon","sun","judgement","world",
  ]), []);
  type CardCategory = "all" | "major" | "wands" | "swords" | "cups" | "pentacles" | "hearts" | "diamonds" | "clubs" | "spades";
  const [cardModalCategory, setCardModalCategory] = useState<CardCategory>("all");

  const cardCategories = useMemo<Array<{ id: CardCategory; label: string }>>(() => {
    if (cardSystem === "lenormand") {
      return [
        { id: "all", label: isZh ? "全部" : "All" },
        { id: "hearts", label: isZh ? "红心组" : "Hearts" },
        { id: "diamonds", label: isZh ? "方块组" : "Diamonds" },
        { id: "clubs", label: isZh ? "梅花组" : "Clubs" },
        { id: "spades", label: isZh ? "黑桃组" : "Spades" },
      ];
    }
    return [
      { id: "all", label: isZh ? "全部" : "All" },
      { id: "major", label: isZh ? "大阿卡纳" : "Major" },
      { id: "wands", label: isZh ? "权杖组" : "Wands" },
      { id: "swords", label: isZh ? "宝剑组" : "Swords" },
      { id: "cups", label: isZh ? "圣杯组" : "Cups" },
      { id: "pentacles", label: isZh ? "星币组" : "Pentacles" },
    ];
  }, [cardSystem, isZh]);

  /* 按分类 + 搜索过滤后的牌 */
  const filteredModalCards = useMemo(() => {
    let cards = filteredCards;
    if (cardModalCategory !== "all") {
      cards = cards.filter((c: any) => {
        if (cardSystem === "lenormand") return c.suit === cardModalCategory;
        if (cardModalCategory === "major") return MAJOR_ARCANA_IDS.has(c.id);
        return c.id.endsWith(`-${cardModalCategory}`);
      });
    }
    return cards;
  }, [filteredCards, cardModalCategory, cardSystem, MAJOR_ARCANA_IDS]);

  /* 点击外部关闭分类下拉 */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* 编辑模式：加载案例数据 */
  useEffect(() => {
    if (!caseId) return;
    const record = getCaseById(caseId);
    if (!record) {
      router.push("/cases");
      return;
    }
    setCardSystem(record.cardSystem);
    setDateStr(record.date);
    setSelectedCats(record.categories);
    setQuestion(record.question);
    setNotes(record.notes);
    setReview(record.review);
    setResultStatus(record.outcome);
    setPhotoPreview(record.photoPreview);
    /* 找到 matching spread */
    const allSpreads = record.cardSystem === "tarot" ? SPREADS_TAROT : SPREADS_LENORMAND;
    const match = allSpreads.find((s) => s.n === record.cards.length);
    if (match) {
      setSelectedSpread(match);
      setPositions(
        record.cards.map((c, i) => {
          const cardDb = record.cardSystem === "tarot" ? TAROT_CARDS : LENORMAND_CARDS;
          const found = cardDb.find((dbCard) => dbCard.nameZh === c.nameZh || dbCard.name === c.name);
          return {
            label: match.labels[i] || `位置${i + 1}`,
            card: { id: found?.id ?? "", name: c.name, nameZh: c.nameZh, upright: c.upright },
          };
        })
      );
    }
  }, [caseId]);

  /* ── 操作函数 ── */
  const handleSelectSpread = (spread: SpreadDef) => {
    setSelectedSpread(spread);
    setPositions(spread.labels.map((label) => ({ label, card: null })));
    setShowSpreadModal(false);
  };

  const handleOpenCardModal = (_idx: number) => {
    setEditingPosIdx(_idx);
    setCardModalSearch("");
    setCardModalCategory("all");
    setPendingCards([]);
    setShowCardModal(true);
  };

  const maxSelectCount = positions.length;

  const handleSelectCard = (card: { id: string; name: string; nameZh: string }) => {
    setPendingCards((prev) => {
      const existingIdx = prev.findIndex((c) => c.cardId === card.id);
      if (existingIdx >= 0) {
        /* 已选中 → 取消选中 */
        return prev.filter((c) => c.cardId !== card.id);
      }
      /* 未选中且未满 */
      if (prev.length < maxSelectCount) {
        return [...prev, { cardId: card.id, upright: true }];
      }
      return prev;
    });
  };

  const handleCardReverseToggle = (cardId: string) => {
    if (cardSystem === "lenormand") return;
    setPendingCards((prev) =>
      prev.map((c) =>
        c.cardId === cardId
          ? { ...c, upright: !c.upright }
          : c,
      ),
    );
  };

  const handleConfirmCard = () => {
    if (pendingCards.length === 0) return;
    setPositions((prev) => {
      const next = [...prev];
      pendingCards.forEach((pc, idx) => {
        if (idx >= next.length) return;
        const card = filteredCards.find((c) => c.id === pc.cardId);
        if (card) {
          next[idx] = {
            ...next[idx],
            card: { id: card.id, name: card.name, nameZh: card.nameZh, upright: pc.upright },
          };
        }
      });
      return next;
    });
    setShowCardModal(false);
  };

  const handleRemoveCard = (idx: number) => {
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], card: null };
      return next;
    });
  };

  const handleClearSpread = () => {
    setPositions((prev) => prev.map((p) => ({ ...p, card: null })));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    const input = document.getElementById("case-photo-input") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleSave = () => {
    if (!canSave) return;
    const partial = {
      date: dateStr,
      cardSystem,
      spreadId: selectedSpread?.id ?? "",
      categories: selectedCats,
      question,
      cards: positions
        .filter((p) => p.card)
        .map((p) => ({
          name: p.card!.name,
          nameZh: p.card!.nameZh,
          upright: p.card!.upright,
        })),
      notes,
      review,
      outcome: resultStatus,
      photoPreview,
    };
    if (isEdit && caseId) {
      updateCase(caseId, partial);
    } else {
      addCase(partial);
    }
    notifyCasesUpdated();
    router.push("/cases");
  };

  const canSave = question.trim().length > 0 && positions.some((p) => p.card);

  /* ── 渲染 ── */
  const spreads = cardSystem === "tarot" ? SPREADS_TAROT : SPREADS_LENORMAND;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 装饰光晕 */}
      <div
        className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full pointer-events-none -z-10 opacity-10"
        style={{ background: "radial-gradient(#f8f6fc)", filter: "blur(80px)" }}
      />

      {/* ══ Header ══ */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-5 pt-8 pb-3"
        style={{ backgroundColor: "#f8f6fc", backdropFilter: "blur(12px)" }}
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
          {isEdit ? (t("cases.editTitle") || "编辑案例") : (t("cases.newTitle") || "记录案例")}
        </h1>

        {/* 塔罗/雷诺曼切换 */}
        <div className="ml-auto flex rounded-lg bg-[#f2eff8] p-[3px]" style={{ border: "1px solid rgba(110,100,150,0.08)" }}>
          {(["tarot", "lenormand"] as const).map((sys) => (
            <button
              key={sys}
              onClick={() => {
                setCardSystem(sys);
                setSelectedSpread(null);
                setPositions([]);
              }}
              className={`rounded-md px-3 py-1 text-[12px] font-semibold tracking-wide transition-all cursor-pointer ${
                cardSystem === sys ? "shadow-sm" : ""
              }`}
              style={
                cardSystem === sys
                  ? { backgroundColor: "#fff", color: "#7e63c9" }
                  : { backgroundColor: "transparent", color: "#9794a2" }
              }
            >
              {sys === "tarot" ? "塔罗" : "雷诺曼"}
            </button>
          ))}
        </div>
      </header>

      {/* ══ 内容区 ══ */}
      <div className="mx-auto max-w-lg px-5 pb-8 flex flex-col gap-4">

        {/* 0. 日期 + 分类 */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "date";
              input.value = dateStr;
              input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
              document.body.appendChild(input);
              input.addEventListener("change", (e: any) => {
                setDateStr(e.target.value);
                document.body.removeChild(input);
              });
              input.addEventListener("blur", () => {
                try { document.body.removeChild(input); } catch {}
              });
              if ((input as any).showPicker) (input as any).showPicker();
              else input.click();
            }}
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium tracking-wide cursor-pointer transition-colors"
            style={{
              backgroundColor: "#fefdfe",
              borderColor: "rgba(110,100,150,0.10)",
              color: "#2d2a34",
              boxShadow: "0 2px 14px rgba(100,90,140,0.06)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7e63c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dateStr}
          </button>

          {/* 分类下拉 */}
          <div className="relative ml-auto" ref={catDropdownRef}>
            <button
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-medium tracking-wide cursor-pointer transition-colors ${
                selectedCats.length > 0 ? "" : ""
              }`}
              style={{
                backgroundColor: selectedCats.length > 0 ? "rgba(126,99,201,0.08)" : "#fefdfe",
                borderColor: selectedCats.length > 0 ? "#7e63c9" : "rgba(110,100,150,0.10)",
                color: selectedCats.length > 0 ? "#7e63c9" : "#5c5a64",
                boxShadow: "0 2px 14px rgba(100,90,140,0.06)",
              }}
            >
              {selectedCats.length > 0
                ? selectedCats.map((k) => {
                    const cat = CATEGORIES.find((c) => c.key === k);
                    return cat ? (isZh ? cat.zh : cat.en) : "";
                  }).filter(Boolean).join(" · ")
                : t("cases.tags.all") || "分类"}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "transform 200ms ease", transform: showCatDropdown ? "rotate(180deg)" : undefined }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence>
              {showCatDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full right-0 mt-1.5 z-50 w-fit rounded-xl border bg-white py-1 shadow-lg"
                  style={{ borderColor: "rgba(110,100,150,0.10)" }}
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setSelectedCats((prev) =>
                          prev.includes(cat.key) ? prev.filter((k) => k !== cat.key) : [...prev, cat.key]
                        );
                      }}
                      className="flex w-full items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selectedCats.includes(cat.key) ? "rgba(126,99,201,0.08)" : "transparent",
                        color: selectedCats.includes(cat.key) ? "#7e63c9" : "#5c5a64",
                      }}
                    >
                      {cat.zh}
                      {selectedCats.includes(cat.key) && (
                        <span className="ml-auto text-[11px]" style={{ color: "#7e63c9" }}>✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 1. 问题输入框 */}
        <div
          className="rounded-[20px] border p-4 shadow-sm transition-colors"
          style={{
            backgroundColor: "#fefdfe",
            borderColor: "rgba(110,100,150,0.10)",
          }}
        >
          <div className="mb-2.5 flex items-center gap-1.5" style={{ color: "#9794a2" }}>
            <span className="text-[11px] font-semibold tracking-widest uppercase">💬 {t("cases.questionLabel") || "你的问题"}</span>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("cases.questionPlaceholder") || "你想通过占卜了解什么？"}
            rows={2}
            className="w-full resize-none border-none bg-transparent p-0 text-[15px] leading-[1.65] font-serif outline-none"
            style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}
          />
          <div className="mt-2.5">
            <p className="mb-1.5 text-[10.5px]" style={{ color: "#9794a2" }}>{t("cases.quickFill") || "快速填入"}</p>
            <div className="flex flex-wrap gap-1.5">
              {(isZh ? PRESET_QUESTIONS_ZH : PRESET_QUESTIONS_EN).map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="rounded-full border px-3 py-1 text-[11.5px] cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "#f2eff8",
                    borderColor: "rgba(110,100,150,0.10)",
                    color: "#5c5a64",
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. 选择牌阵 + 牌阵照片 并排 */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowSpreadModal(true)}
            className="flex-1 rounded-[20px] border p-4 flex flex-col items-center gap-1.5 shadow-sm cursor-pointer transition-colors hover:border-[#7e63c9]"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}
          >
            <span className="text-[22px]">🔮</span>
            <span className="text-[13px] font-semibold" style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}>
              {t("cases.pickSpread") || "选择牌阵"}
            </span>
            <span className="text-[11px]" style={{ color: "#9794a2" }}>{t("cases.pickSpreadHint") || "点此选择"}</span>
          </button>
          <label
            className="flex-1 rounded-[20px] border p-4 flex flex-col items-center gap-1.5 shadow-sm cursor-pointer transition-colors hover:border-[#7e63c9]"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}
          >
            <span className="text-[22px]">📷</span>
            <span className="text-[13px] font-semibold" style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}>
              {t("cases.photoLabel") || "牌阵照片"}
            </span>
            <span className="text-[11px]" style={{ color: "#9794a2" }}>{t("cases.photoHint") || "上传实物照片"}</span>
            <input id="case-photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        {/* 已选牌阵展示条 */}
        {selectedSpread && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-[20px] border p-3.5 shadow-sm cursor-pointer transition-colors hover:bg-[#f2eff8]"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}
            onClick={() => setShowSpreadModal(true)}
          >
            <span className="text-[24px]">{selectedSpread.icon}</span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold" style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}>
                {isZh ? selectedSpread.nameZh : selectedSpread.name}
              </p>
              <p className="text-[12px]" style={{ color: "#9794a2" }}>
                {isZh ? selectedSpread.descZh : selectedSpread.desc}
              </p>
            </div>
            <span className="text-[12px] font-medium cursor-pointer" style={{ color: "#7e63c9" }}>
              {t("cases.change") || "更换"}
            </span>
          </motion.div>
        )}

        {/* 3. 牌阵画布 */}
        {selectedSpread && positions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border p-4 shadow-sm"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-wide" style={{ color: "#9794a2" }}>
                {isZh ? selectedSpread.nameZh : selectedSpread.name} — {t("cases.tapToPick") || "点击位置选牌"}
              </span>
              <button
                onClick={handleClearSpread}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors"
                style={{ color: "#c8708a", backgroundColor: "rgba(200,112,138,0.08)" }}
              >
                {t("cases.clearAll") || "清空重选"}
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {positions.map((pos, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenCardModal(i)}
                  onDoubleClick={() => {
                    if (cardSystem !== "lenormand" && pos.card) {
                      setPositions((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], card: { ...next[i].card!, upright: !next[i].card!.upright } };
                        return next;
                      });
                    }
                  }}
                  className={`relative flex w-[72px] min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border cursor-pointer transition-all ${
                    pos.card
                      ? pos.card.upright
                        ? "border-[rgba(126,99,201,0.18)]"
                        : "border-[rgba(200,112,138,0.18)]"
                      : "border-dashed"
                  }`}
                  style={
                    pos.card
                      ? { backgroundColor: "rgba(255,255,255,0.85)", borderColor: "rgba(110,100,150,0.12)" }
                      : { background: "#f2eff8", borderColor: "rgba(110,100,150,0.12)" }
                  }
                >
                  {pos.card ? (
                    <>
                      {/* 卡片图片 */}
                      <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: "2/3" }}>
                        {(() => {
                          const imgUrl = cardSystem === "lenormand"
                            ? getLenormandCardImageUrl(pos.card.id)
                            : getTarotCardImageUrl(pos.card.id);
                          return imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={pos.card.nameZh}
                              className={`h-full w-full object-cover ${!pos.card.upright && cardSystem !== "lenormand" ? "rotate-180" : ""}`}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#f2eff8] rounded-lg">
                              <span className="text-[10px] font-semibold text-center leading-tight px-1"
                                style={{ color: pos.card.upright ? "#7e63c9" : "#c8708a", fontFamily: "'Noto Serif SC', serif" }}>
                                {isZh ? pos.card.nameZh : pos.card.name}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      {/* 牌名 + 位名 */}
                      <div className="flex flex-col items-center leading-tight px-0.5">
                        <span className="text-[9px] font-semibold text-center" style={{ color: "#2d2a34" }}>
                          {isZh ? pos.card.nameZh : pos.card.name}
                        </span>
                        <span className="text-[8px]" style={{ color: "#9794a2" }}>
                          {pos.label}
                        </span>
                      </div>
                      {!pos.card.upright && cardSystem !== "lenormand" && (
                        <span className="absolute left-0.5 top-0.5 rounded-full bg-[#c8708a] px-1 py-px text-[7px] font-bold text-white">
                          逆
                        </span>
                      )}
                      <button
                        className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[9px] opacity-0 transition-opacity hover:opacity-100 cursor-pointer shadow-sm"
                        style={{ color: "#9794a2" }}
                        onClick={(e) => { e.stopPropagation(); handleRemoveCard(i); }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[28px] opacity-20">？</span>
                      <span className="text-[10px] text-center leading-tight px-1" style={{ color: "#9794a2" }}>
                        {pos.label}
                      </span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 照片预览区 */}
        {photoPreview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border p-4 shadow-sm overflow-hidden"
            style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}
          >
            <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#2d2a34" }}>
              📷 {t("cases.photoLabel") || "牌阵照片"}
            </p>
            <div className="relative rounded-xl overflow-hidden">
              <img src={photoPreview} alt="preview" className="w-full max-h-[220px] object-cover" />
              <button
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] text-white cursor-pointer"
                style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* 4. 笔记 + 复盘 手风琴 */}
        <div className="rounded-[20px] border shadow-sm overflow-hidden" style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}>
          {/* 解读想法 */}
          <div>
            <button
              onClick={() => toggleAccordion("notes")}
              className="flex w-full items-center justify-between px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#faf8ff]"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#2d2a34" }}>
                💭 {t("cases.notesLabel") || "解读想法"}
              </span>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9794a2" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: "transform 250ms ease", transform: openAccordions.has("notes") ? "rotate(180deg)" : undefined }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence>
              {openAccordions.has("notes") && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("cases.notesPlaceholder") || "记录你当时的直觉、感受或解读……"}
                      rows={2}
                      className="w-full resize-none rounded-xl border p-3 text-[13.5px] leading-[1.6] outline-none transition-all"
                      style={{
                        backgroundColor: "#f5f2fa",
                        borderColor: "rgba(110,100,150,0.10)",
                        color: "#2d2a34",
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 分割线 */}
          <div className="h-[1px] mx-5" style={{ backgroundColor: "rgba(110,100,150,0.08)" }} />

          {/* 复盘记录 */}
          <div>
            <button
              onClick={() => toggleAccordion("review")}
              className="flex w-full items-center justify-between px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#faf8ff]"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#2d2a34" }}>
                🔮 {t("cases.reviewLabel") || "复盘记录"}
              </span>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9794a2" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: "transform 250ms ease", transform: openAccordions.has("review") ? "rotate(180deg)" : undefined }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence>
              {openAccordions.has("review") && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder={t("cases.reviewPlaceholder") || "事后回顾：事件发展了么？预示应验了么？"}
                      rows={2}
                      className="w-full resize-none rounded-xl border p-3 text-[13.5px] leading-[1.6] outline-none transition-all"
                      style={{
                        backgroundColor: "#f5f2fa",
                        borderColor: "rgba(110,100,150,0.10)",
                        color: "#2d2a34",
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 5. 结果验证 */}
        <div className="rounded-[20px] border p-4 shadow-sm" style={{ backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)" }}>
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold tracking-widest uppercase" style={{ color: "#9794a2" }}>
            📊 {t("cases.resultLabel") || "结果验证"}
          </p>
          <div className="flex gap-2">
            {([
              { key: "pending", label: t("cases.resultPending") || "待验证", color: "#7e63c9", bg: "rgba(126,99,201,0.08)" },
              { key: "matched", label: "✓ " + (t("cases.resultMatched") || "结果吻合"), color: "#5cb88a", bg: "rgba(92,184,138,0.08)" },
              { key: "unmatched", label: t("cases.resultUnmatched") || "未吻合", color: "#dc5050", bg: "rgba(220,80,80,0.08)" },
            ] as { key: ResultStatus; label: string; color: string; bg: string }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setResultStatus(opt.key)}
                className={`flex-1 rounded-xl border px-2 py-2.5 text-[12px] font-medium tracking-wide cursor-pointer transition-all ${
                  resultStatus === opt.key ? "shadow-sm" : ""
                }`}
                style={
                  resultStatus === opt.key
                    ? { backgroundColor: opt.bg, borderColor: opt.color, color: opt.color }
                    : { backgroundColor: "#fefdfe", borderColor: "rgba(110,100,150,0.10)", color: "#5c5a64" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ 保存按钮（内联，紧跟结果验证） ══ */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full h-12 rounded-xl text-[15px] font-semibold tracking-widest text-white border-none cursor-pointer transition-all ${
            !canSave ? "opacity-40 cursor-not-allowed" : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #9b7dd4, #7a5db4)",
            boxShadow: "0 4px 18px rgba(126,99,201,0.25)",
          }}
        >
          {isEdit ? (t("cases.updateCase") || "更新案例") : (t("cases.saveCase") || "保存案例")}
        </motion.button>
      </div>

      {/* ══ 牌阵选择弹窗 ══ */}
      <AnimatePresence>
        {showSpreadModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[rgba(40,35,50,0.40)]"
              onClick={() => setShowSpreadModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-t-[22px] bg-white shadow-lg flex flex-col max-h-[68vh]"
            >
              <div className="mx-auto mt-2.5 h-1 w-9 rounded-full" style={{ backgroundColor: "rgba(110,100,150,0.12)" }} />
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <span className="text-[16px] font-semibold" style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}>
                  {t("cases.pickSpread") || "选择牌阵"}
                </span>
                <button
                  onClick={() => setShowSpreadModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full cursor-pointer transition-colors"
                  style={{ backgroundColor: "#f2eff8", color: "#9794a2" }}
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-0 px-4 pb-6 overflow-y-auto flex-1">
                {spreads.map((spread) => (
                  <motion.div
                    key={spread.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectSpread(spread)}
                    className={`flex items-center gap-3.5 rounded-xl p-3.5 cursor-pointer transition-all ${
                      selectedSpread?.id === spread.id ? "border" : "hover:bg-[#faf8ff]"
                    }`}
                    style={
                      selectedSpread?.id === spread.id
                        ? { backgroundColor: "rgba(126,99,201,0.05)", borderColor: "#7e63c9" }
                        : {}
                    }
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-[22px] flex-shrink-0"
                      style={{ backgroundColor: "#f2eff8" }}
                    >
                      {spread.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14.5px] font-semibold" style={{ color: "#2d2a34", fontFamily: "'Noto Serif SC', serif" }}>
                        {isZh ? spread.nameZh : spread.name}
                      </p>
                      <p className="text-[12px]" style={{ color: "#9794a2" }}>
                        {isZh ? spread.descZh : spread.desc}
                      </p>
                    </div>
                    <span
                      className="rounded-lg px-2.5 py-1 text-[11px] font-semibold flex-shrink-0"
                      style={
                        selectedSpread?.id === spread.id
                          ? { backgroundColor: "#7e63c9", color: "#fff" }
                          : { backgroundColor: "rgba(126,99,201,0.08)", color: "#7e63c9" }
                      }
                    >
                      {spread.n}张
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ 选牌弹窗（卡片图片网格） ══ */}
      <AnimatePresence>
        {showCardModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40"
              style={{ backgroundColor: "rgba(30,15,5,0.45)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowCardModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-[28px]"
              style={{ backgroundColor: "#f8f6fc", maxHeight: "80vh" }}
            >
              {/* 手柄 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-[#dbd5e8]" />
              </div>

              {/* 标题行 */}
              <div className="flex items-center justify-between border-b border-[#dbd5e8] px-6 pb-4">
                <div>
                  <h3 className="font-heading text-base font-bold text-[#2d2a34]">
                    {isZh ? `选择 ${maxSelectCount} 张牌` : `Pick ${maxSelectCount} Cards`}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#9794a2]">
                    {cardSystem === "lenormand"
                      ? (isZh
                        ? `点击选择卡牌（${pendingCards.length}/${maxSelectCount}），按顺序填入牌阵`
                        : `Tap to select cards (${pendingCards.length}/${maxSelectCount}), filled in order`)
                      : (isZh
                        ? `点击选择卡牌（${pendingCards.length}/${maxSelectCount}），双击切换为逆位`
                        : `Tap to select (${pendingCards.length}/${maxSelectCount}), double-click to reverse`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eae5f3] text-[#5c5a64] text-lg"
                >
                  ×
                </button>
              </div>

              {/* 分类标签 + 搜索 */}
              <div className="flex items-center gap-3 px-6 pt-4">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                  {cardCategories.map((cat) => {
                    const active = cardModalCategory === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCardModalCategory(cat.id)}
                        className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
                        style={{
                          backgroundColor: active ? "#eae5f3" : "rgba(255,255,255,0.7)",
                          borderColor: active ? "#7e63c9" : "#dbd5e8",
                          color: active ? "#7e63c9" : "#9794a2",
                        }}
                      >
                        {cat.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 搜索框 */}
              <div className="px-6 pt-2.5">
                <input
                  value={cardModalSearch}
                  onChange={(e) => setCardModalSearch(e.target.value)}
                  placeholder={t("cases.searchCard") || "搜索牌名…"}
                  className="w-full h-9 rounded-lg border px-3 text-[13px] outline-none transition-all"
                  style={{
                    backgroundColor: "#f5f2fa",
                    borderColor: "rgba(110,100,150,0.10)",
                    color: "#2d2a34",
                  }}
                />
              </div>

              {/* 卡片图片网格 */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {filteredModalCards.length === 0 ? (
                  <p className="w-full text-center py-8 text-[13px]" style={{ color: "#9794a2" }}>
                    {t("cases.noMatch") || "没有找到匹配的牌"}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {filteredModalCards.map((card) => {
                      const imgUrl =
                        cardSystem === "lenormand"
                          ? getLenormandCardImageUrl(card.id)
                          : getTarotCardImageUrl(card.id);
                      const selectedIdx = pendingCards.findIndex((c) => c.cardId === card.id);
                      const isSelected = selectedIdx >= 0;
                      const selectedCard = isSelected ? pendingCards[selectedIdx] : null;
                      return (
                        <motion.button
                          key={card.id}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleSelectCard(card)}
                          onDoubleClick={() => {
                            if (cardSystem !== "lenormand" && isSelected) {
                              handleCardReverseToggle(card.id);
                            }
                          }}
                          className="relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all"
                          style={{
                            backgroundColor: isSelected ? "#eae5f3" : "rgba(255,255,255,0.85)",
                            borderColor: isSelected ? "#7e63c9" : "#dbd5e8",
                            boxShadow: isSelected ? "0 2px 8px rgba(126,99,201,0.15)" : "none",
                          }}
                        >
                          {/* 序号标签 */}
                          {isSelected && (
                            <div className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#7e63c9] text-[10px] font-bold text-white">
                              {selectedIdx + 1}
                            </div>
                          )}
                          {/* 逆位标识 */}
                          {isSelected && selectedCard && !selectedCard.upright && cardSystem !== "lenormand" && (
                            <div className="absolute left-1 top-1 z-20 rounded-full bg-[#c8708a] px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {isZh ? "逆位" : "Reversed"}
                            </div>
                          )}
                          {/* 卡片图片 */}
                          <div className="w-full overflow-hidden rounded-xl" style={{ aspectRatio: "2/3" }}>
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={card.nameZh}
                                className={`h-full w-full object-cover ${isSelected && selectedCard && !selectedCard.upright && cardSystem !== "lenormand" ? "rotate-180" : ""}`}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f2eff8] rounded-xl">
                                <span className="text-[11px] text-[#9794a2] text-center leading-tight px-1">
                                  {isZh ? card.nameZh : card.name}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* 牌名 */}
                          <p className="text-center text-[10px] font-bold leading-tight text-[#2d2a34]">
                            {isZh ? card.nameZh : card.name}
                          </p>
                          <p className="text-center text-[8px] leading-tight text-[#2d2a34]/50">
                            {card.name}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 确认按钮 */}
              {pendingCards.length > 0 && (
                <motion.div initial={{ y: 60 }} animate={{ y: 0 }} className="flex-shrink-0 border-t border-[#dbd5e8] bg-[#f8f6fc] px-6 py-3"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmCard}
                    disabled={pendingCards.length !== maxSelectCount}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold tracking-widest text-white shadow-lg disabled:opacity-40"
                    style={{ background: "linear-gradient(90deg, #c8708a 0%, #7a5db4 100%)" }}>
                    {isZh ? `确认选择 (${pendingCards.length}/${maxSelectCount})` : `Confirm (${pendingCards.length}/${maxSelectCount})`}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
