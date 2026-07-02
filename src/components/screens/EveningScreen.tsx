"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api/request";
import { useDemo } from "@/components/demo/demo-provider";
import { CardFront } from "@/components/tarot/tarot-card-display";
import { getCardById } from "@/lib/tarot-data";
import { getLenormandCardById } from "@/lib/lenormand-data";

interface JournalEntry {
  id: string;
  cardId: string;
  cardOrientation: string;
  cardSystem?: string;
  morningTheme: string | null;
  morningQuestion: string | null;
  journalText: string | null;
  eveningSummary: string | null;
  behaviorPatterns: string | null;
  patternMapping: string | null;
  eveningEcho: string | null;
  // Score deltas from AI analysis (stored for rollback on delete)
  stabilityDelta?: number | null;
  explorationDelta?: number | null;
  introspectionDelta?: number | null;
  actionDelta?: number | null;
}

const PATTERN_COLORS = [
  { bg: "#f0e0f4", text: "#7e63c9", dot: "#7e63c9" },
  { bg: "#f5eed8", text: "#c8708a", dot: "#c8708a" },
  { bg: "#E8F2E2", text: "#5C6B50", dot: "#7C9A6F" },
  { bg: "#E8EEF8", text: "#4A6090", dot: "#6A88C8" },
];

export function EveningScreen() {
  const { t, i18n } = useTranslation();
  const { demoUser } = useDemo();
  const router = useRouter();
  const user = demoUser;
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [journalText, setJournalText] = useState("");
  const [phase, setPhase] = useState<"loading" | "no-morning" | "write" | "submitting" | "done">("loading");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const loadEntry = useCallback(async (date: string) => {
    try {
      const res = await request(`/api/journal?date=${date}`);
      const data = await res.json();
      if (!data.entry || !data.entry.morningTheme) {
        // Fallback: check localStorage cached morning theme (demo store may reset)
        if (typeof window !== "undefined") {
          try {
            const cached = window.localStorage.getItem("cosmic-echo.cached-morning");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.date === date && parsed.morningTheme) {
                // data.entry may be null (store reset) — build synthetic entry from cache
                const patchedEntry = data.entry
                  ? {
                      ...data.entry,
                      morningTheme: parsed.morningTheme,
                      morningQuestion: parsed.morningQuestion ?? null,
                      morningQuestionDescription: parsed.morningQuestionDescription ?? null,
                    }
                  : {
                      // Minimal synthetic entry from localStorage cache
                      id: "",
                      date: parsed.date,
                      morningTheme: parsed.morningTheme,
                      morningQuestion: parsed.morningQuestion ?? null,
                      morningQuestionDescription: parsed.morningQuestionDescription ?? null,
                      cardId: "",
                      cardName: "",
                      cardOrientation: "upright",
                      isComplete: false,
                    };
                setEntry(patchedEntry as any);
                if (patchedEntry.journalText) setJournalText(patchedEntry.journalText);
                setPhase(patchedEntry.eveningEcho ? "done" : "write");
                return;
              }
            }
          } catch { /* ignore cache errors */ }
        }
        setPhase("no-morning");
      } else {
        setEntry(data.entry);
        if (data.entry.journalText) setJournalText(data.entry.journalText);
        setPhase(data.entry.eveningEcho ? "done" : "write");
      }
    } catch {
      setPhase("no-morning");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(
        window.localStorage.getItem("cosmic-echo.selected-date") ?? new Date().toISOString().split("T")[0],
      );
    }

    const timer = window.setTimeout(() => {
      if (user) {
        const nextDate =
          typeof window !== "undefined"
            ? window.localStorage.getItem("cosmic-echo.selected-date") ?? new Date().toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
        setSelectedDate(nextDate);
        void loadEntry(nextDate);
      } else {
        setPhase("no-morning");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadEntry]);

  const handleSubmit = async () => {
    if (!entry || journalText.trim().length < 10 || phase === "submitting") return;
    setPhase("submitting");
    let currentEntry = entry;
    try {
      // If entry has no id (synthetic from localStorage cache), create one first
      if (!currentEntry.id) {
        const postBody: Record<string, unknown> = {
          date: selectedDate,
          cardId: currentEntry.cardId || undefined,
        };
        // Pass cached morning data so the created entry includes them
        if (currentEntry.morningTheme) {
          postBody.morningTheme = currentEntry.morningTheme;
          if (currentEntry.morningQuestion) postBody.morningQuestion = currentEntry.morningQuestion;
          if ((currentEntry as any).morningQuestionDescription) {
            postBody.morningQuestionDescription = (currentEntry as any).morningQuestionDescription;
          }
          if (currentEntry.cardOrientation) postBody.cardOrientation = currentEntry.cardOrientation;
        }
        const createRes = await request("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });
        const createData = await createRes.json();
        if (!createData.entry?.id) throw new Error("Failed to create entry");
        currentEntry = { ...currentEntry, id: createData.entry.id };
        setEntry(currentEntry);
      }

      const genRes = await request("/api/journal/evening-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentEntry.cardId || "0",
          cardOrientation: currentEntry.cardOrientation || "upright",
          morningTheme: currentEntry.morningTheme,
          morningQuestion: currentEntry.morningQuestion,
          journalText,
          locale: i18n.language,
          cardSystem: currentEntry.cardSystem ?? "tarot",
        }),
      });

      if (!genRes.ok) {
        const errText = await genRes.text();
        console.error("[EveningScreen] evening-generate failed:", genRes.status, errText);
        throw new Error("Evening generate failed");
      }

      const ai = await genRes.json();
      
      // Save forest score deltas to localStorage
      // Guard: skip score update if this entry already has an eveningEcho (re-generate)
      const isRegenerate = !!currentEntry.eveningEcho;
      if (typeof window !== "undefined" && !isRegenerate) {
        console.log("[EveningScreen] AI returned scores:", {
          stabilityDelta: ai.stabilityDelta,
          explorationDelta: ai.explorationDelta,
          introspectionDelta: ai.introspectionDelta,
          actionDelta: ai.actionDelta,
        });
        
        // Check if AI returned valid score deltas
        if (typeof ai.stabilityDelta === 'number' && 
            typeof ai.explorationDelta === 'number' && 
            typeof ai.introspectionDelta === 'number' && 
            typeof ai.actionDelta === 'number') {
          
          const currentScores = JSON.parse(window.localStorage.getItem("cosmic-echo:forest-scores") ?? "{\"stability\":0,\"exploration\":0,\"introspection\":0,\"action\":0,\"history\":[]}");
          console.log("[EveningScreen] Current scores from localStorage:", currentScores);
          
          const newScores = {
            stability: Math.max(0, Math.min(100, currentScores.stability + ai.stabilityDelta)),
            exploration: Math.max(0, Math.min(100, currentScores.exploration + ai.explorationDelta)),
            introspection: Math.max(0, Math.min(100, currentScores.introspection + ai.introspectionDelta)),
            action: Math.max(0, Math.min(100, currentScores.action + ai.actionDelta)),
            lastUpdated: new Date().toISOString(),
            history: [...(currentScores.history || []), {
              date: new Date().toISOString(),
              deltas: {
                stability: ai.stabilityDelta,
                exploration: ai.explorationDelta,
                introspection: ai.introspectionDelta,
                action: ai.actionDelta,
              }
            }]
          };
          
          window.localStorage.setItem("cosmic-echo:forest-scores", JSON.stringify(newScores));
          console.log("[EveningScreen] Scores saved to localStorage:", newScores);
        } else {
          console.warn("[EveningScreen] AI did not return valid score deltas, skipping score update");
        }
      } else if (isRegenerate) {
        console.log("[EveningScreen] Re-generating echo for existing entry, skipping score update to avoid double-counting");
      }
      
      const patchRes = await request("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentEntry.id,
          journalText,
          eveningSummary: ai.eveningSummary,
          behaviorPatterns: JSON.stringify(ai.behaviorPatterns ?? []),
          patternMapping: ai.patternMapping,
          eveningEcho: ai.eveningEcho,
          // Save score deltas to entry for rollback on delete
          stabilityDelta: ai.stabilityDelta ?? null,
          explorationDelta: ai.explorationDelta ?? null,
          introspectionDelta: ai.introspectionDelta ?? null,
          actionDelta: ai.actionDelta ?? null,
        }),
      });
      const patchData = await patchRes.json();
      // Merge to preserve fields from synthetic entry that PATCH may not return
      setEntry((prev) => (prev ? { ...prev, ...patchData.entry } : patchData.entry));
      setPhase("done");
    } catch {
      setPhase("write");
      alert("Generation failed, please try again.");
    }
  };

  const patterns: string[] = (() => {
    try {
      return JSON.parse(entry?.behaviorPatterns ?? "[]");
    } catch {
      return [];
    }
  })();

  const card = (() => {
    if (!entry?.cardId) return null;
    return getCardById(entry.cardId) ?? getLenormandCardById(entry.cardId) ?? null;
  })();
  const cardOrientation = (entry?.cardOrientation ?? "upright") as "upright" | "reversed";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full pointer-events-none -z-10 opacity-10" style={{ background: "radial-gradient(#f8f6fc)", filter: "blur(80px)" }} />

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
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold" style={{ color: "#2d2a34" }}>{t("evening.title")}</h1>
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#7e63c9" }}>Evening Resonance</span>
        </div>
        {phase === "done" && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPhase("write")}
            className="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold"
            style={{ borderColor: "#dbd5e8", color: "#5c5a64", backgroundColor: "#fefdfe" }}
          >
            {t("common.edit")}
          </motion.button>
        )}
      </header>

      <div className="mx-auto max-w-lg px-7 pt-1 pb-18 space-y-5">
        {entry?.morningTheme && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="relative w-full rounded-[26px] border bg-white/75 px-4 py-3 text-left shadow-[0_12px_30px_rgba(80,42,18,0.06)] backdrop-blur-sm" style={{ borderColor: "#dbd5e8" }}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center text-lg leading-none">
                🌌
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: "#9794a2" }}>{t("morning.lesson")}</p>
                <p className="font-heading text-sm font-semibold leading-snug">{entry.morningTheme}</p>
              </div>
            </div>
            <p className="absolute right-3 top-3 text-[10px] font-medium" style={{ color: "#9794a2" }}>{selectedDate}</p>
          </motion.div>
        )}

        {phase === "no-morning" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold mb-3" style={{ color: "#5c5a64" }}>{t("evening.noMorning")}</p>
            <Link href="/">
              <motion.div whileTap={{ scale: 0.97 }} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer" style={{ background: "linear-gradient(135deg, #9b7dd4, #7e63c9)" }}>
                {t("morning.drawCard")}
              </motion.div>
            </Link>
          </div>
        )}

        {(phase === "write" || phase === "submitting" || phase === "done") && entry && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {phase !== "done" && (
              <>
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#9794a2" }}>{t("evening.subtitle")}</p>
                  <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder={t("evening.placeholder")} rows={10} className="w-full resize-none rounded-2xl border px-4 py-4 text-sm leading-relaxed outline-none focus:ring-1 transition-shadow" style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8", color: "#2d2a34", fontSize: "16px", lineHeight: "1.7" }} />
                  <p className="text-xs mt-1 text-right" style={{ color: "#9794a2" }}>{journalText.length} 字</p>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!journalText.trim() || phase === "submitting"} className="w-full py-4 rounded-[20px] text-white text-sm font-bold tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all" style={{ background: !journalText.trim() ? "#c0b8a8" : "linear-gradient(135deg, #9b7dd4, #7e63c9)" }}>
                  {phase === "submitting" ? t("evening.submitting") : t("evening.submit")}
                </motion.button>

              </>
            )}

            {phase === "done" && (
              <div />
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {phase === "done" && entry && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6 border shadow-sm relative overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.8)", borderColor: "#dbd5e8" }}>
              {entry.eveningEcho && (
                <div className="border-l-[3px] pl-4 mb-3" style={{ borderLeftColor: "#7e63c9" }}>
                  <span className="text-[9px] font-bold tracking-widest uppercase block mb-1" style={{ color: "#7e63c9" }}>{t("evening.echo")}</span>
                  <p className="font-heading text-base font-bold leading-relaxed" style={{ color: "#2d2a34" }}>&ldquo;{entry.eveningEcho}&rdquo;</p>
                </div>
              )}

              {patterns.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold tracking-wider block mb-3" style={{ color: "#9794a2" }}>{t("evening.patterns")}</span>
                  <div className="flex flex-wrap gap-2">
                    {patterns.map((p, i) => {
                      const color = PATTERN_COLORS[i % PATTERN_COLORS.length];
                      return <span key={i} className="px-3 py-1 rounded-[10px] text-xs font-bold flex items-center gap-1.5" style={{ backgroundColor: color.bg, color: color.text }}><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.dot }} />#{p}</span>;
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t space-y-2" style={{ borderColor: "#dbd5e8" }}>
                {entry.eveningSummary && <div><h4 className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#2d2a34" }}>{t("evening.echoTitle")}</h4><p className="text-xs leading-loose" style={{ color: "#5c5a64" }}>{entry.eveningSummary}</p></div>}
                {entry.patternMapping && <div><h4 className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#2d2a34" }}>{t("evening.mapping")}</h4><p className="text-xs leading-loose" style={{ color: "#5c5a64" }}>{entry.patternMapping}</p></div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
