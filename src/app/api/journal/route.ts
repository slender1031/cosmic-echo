import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
import {
  getEntryByDate,
  getEntryById,
  createEntry,
  updateEntry,
  getUserEntries,
  getUserStreak,
  deleteEntry,
} from "@/lib/db/queries/journal";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { userForestScores } from "@/lib/db/schema/journal";
import { getRandomCard, getCardById, getTodayAstrology } from "@/lib/tarot-data";
import { getRandomLenormandCards, getLenormandCardById } from "@/lib/lenormand-data";
import { nanoid } from "nanoid";
import {
  DEMO_MODE,
  createDemoEntry,
  deleteDemoEntry,
  getDemoEntryByDate,
  getDemoStreak,
  getStoreSnapshot,
  restoreStoreSnapshot,
  updateDemoEntry,
  listDemoEntries,
} from "@/lib/demo";
import * as fs from "fs";
import * as path from "path";

const DEMO_STORE_FILE = path.join(process.cwd(), ".demo-store.json");

/** Restore demo store from file on first request (survives dev server restarts) */
let _demoStoreLoaded = false;
function ensureDemoStoreLoaded() {
  if (!DEMO_MODE || _demoStoreLoaded) return;
  _demoStoreLoaded = true;
  try {
    if (fs.existsSync(DEMO_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEMO_STORE_FILE, "utf-8"));
      restoreStoreSnapshot(data);
    }
  } catch { /* ignore */ }
}

/** Persist demo store to file after mutations */
function persistDemoStore() {
  if (!DEMO_MODE) return;
  try {
    fs.writeFileSync(DEMO_STORE_FILE, JSON.stringify(getStoreSnapshot(), null, 2));
  } catch { /* ignore */ }
}

export async function GET(request: NextRequest) {
  ensureDemoStoreLoaded();
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const { id: userId } = authResult.user;

  const { searchParams } = new URL(request.url);

  if (searchParams.get("list") === "1") {
    if (DEMO_MODE) {
      return NextResponse.json({
        entries: listDemoEntries(userId),
        streak: getDemoStreak(userId),
      });
    }

    const [entries, streak] = await Promise.all([
      getUserEntries(userId, 60),
      getUserStreak(userId),
    ]);
    return NextResponse.json({ entries, streak });
  }

  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  if (DEMO_MODE) {
    return NextResponse.json({ entry: getDemoEntryByDate(userId, date) });
  }

  const entry = await getEntryByDate(userId, date);
  return NextResponse.json({ entry });
}

export async function POST(request: NextRequest) {
  ensureDemoStoreLoaded();
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const { id: userId } = authResult.user;

  const today = new Date().toISOString().split("T")[0];

  let body: {
    cardId?: string;
    cardIds?: string[];
    cards?: Array<{ cardId: string; orientation?: "upright" | "reversed" }>;
    count?: number;
    reset?: boolean;
    date?: string;
    cardSystem?: string;
    morningTheme?: string;
    morningQuestion?: string;
    morningQuestionDescription?: string;
    cardOrientation?: string;
  } = {};
  try {
    body = await request.json();
  } catch {}

  const targetDate = body.date && body.date <= today ? body.date : today;

  if (DEMO_MODE) {
    const requestedCards = body.cards;
    const cardIds = requestedCards?.map((card) => card.cardId) ?? body.cardIds ?? (body.cardId ? [body.cardId] : undefined);
    const numCards = body.count ?? requestedCards?.length ?? cardIds?.length ?? 1;
    const ids = cardIds ?? Array(numCards).fill(undefined);
    let entry = createDemoEntry(userId, ids, body.reset, targetDate, requestedCards, body.cardSystem);
    // Apply optional cached fields from synthetic entry path
    if (body.morningTheme) {
      const updated = updateDemoEntry(entry.id, userId, {
        morningTheme: body.morningTheme,
        morningQuestion: body.morningQuestion ?? null,
        morningQuestionDescription: body.morningQuestionDescription ?? null,
        cardOrientation: (body.cardOrientation as "upright" | "reversed") ?? entry.cardOrientation,
      });
      entry = updated ?? entry;
    }
    persistDemoStore();
    return NextResponse.json({ entry });
  }

  if (!body.reset) {
    const existing = await getEntryByDate(userId, targetDate);
    if (existing) {
      return NextResponse.json({ entry: existing });
    }
  }

  // Production path: handle multi-card
  const useLenormand = body.cardSystem === "lenormand";
  const requestedCards = body.cards;
  const cardIds = requestedCards?.map((card) => card.cardId) ?? body.cardIds ?? (body.cardId ? [body.cardId] : undefined);
  const numCards = body.count ?? requestedCards?.length ?? cardIds?.length ?? 1;
  const usedIds = new Set<string>();
  const cards: Array<{ card: { id: string; name: string; nameZh: string }; orientation: "upright" | "reversed" }> = [];

  for (let i = 0; i < numCards; i++) {
    let card: { id: string; name: string; nameZh: string };
    if (cardIds && cardIds[i]) {
      if (useLenormand) {
        card = getLenormandCardById(cardIds[i]) ?? getRandomCard(usedIds);
      } else {
        card = getCardById(cardIds[i]) ?? getRandomCard(usedIds);
      }
    } else {
      if (useLenormand) {
        const lenormandCards = getRandomLenormandCards(1);
        card = lenormandCards[0].card;
        while (usedIds.has(card.id)) {
          const retry = getRandomLenormandCards(1);
          card = retry[0].card;
        }
      } else {
        card = getRandomCard(usedIds);
      }
    }
    usedIds.add(card.id);
    const requestedOrientation = requestedCards?.[i]?.orientation;
    const orientation: "upright" | "reversed" =
      useLenormand
        ? "upright"
        : requestedOrientation === "upright" || requestedOrientation === "reversed"
          ? requestedOrientation
          : Math.random() > 0.8
            ? "reversed"
            : "upright";
    cards.push({ card, orientation });
  }

  const astrology = getTodayAstrology(new Date(`${targetDate}T00:00:00`));
  const primary = cards[0];

  const entry = await createEntry({
    id: nanoid(),
    userId,
    date: targetDate,
    cardId: primary.card.id,
    cardName: primary.card.nameZh,
    cardOrientation: primary.orientation,
    astrologyTag: astrology.name,
    astrologyDescription: astrology.description,
    morningDrawnAt: new Date(),
    streakDay: 1,
  });

  const cardInfos = cards.map((c) => ({
    cardId: c.card.id,
    cardName: c.card.nameZh,
    cardOrientation: c.orientation,
  }));

  return NextResponse.json({ entry: { ...entry, cards: cardInfos, cardSystem: body.cardSystem }, cards, astrology });
}

export async function PATCH(request: NextRequest) {
  ensureDemoStoreLoaded();
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const { id: userId } = authResult.user;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Entry id required" }, { status: 400 });
  }

  if (updates.eveningEcho) {
    updates.isComplete = true;
    updates.journalSubmittedAt = new Date();
  }

  if (DEMO_MODE) {
    const updated = updateDemoEntry(id, userId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    persistDemoStore();
    return NextResponse.json({ entry: updated });
  }

  const updated = await updateEntry(id, userId, updates);
  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ entry: updated });
}

export async function DELETE(request: NextRequest) {
  ensureDemoStoreLoaded();
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const { id: userId } = authResult.user;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Entry id required" }, { status: 400 });
  }

  if (DEMO_MODE) {
    const ok = deleteDemoEntry(id, userId);
    if (!ok) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }
    persistDemoStore();
    return NextResponse.json({ success: true });
  }

  // Production mode: deduct score deltas before deleting the entry
  try {
    // 1. Fetch the entry to get its score deltas
    const entry = await getEntryById(id, userId);
    if (entry) {
      // 2. Deduct deltas from user_forest_scores
      const currentScores = await db
        .select()
        .from(userForestScores)
        .where(eq(userForestScores.userId, userId))
        .limit(1);

      if (currentScores.length > 0) {
        const scores = currentScores[0];
        await db
          .update(userForestScores)
          .set({
            stabilityScore: Math.max(0, Math.min(100, (scores.stabilityScore ?? 0) - (entry.stabilityDelta ?? 0))),
            explorationScore: Math.max(0, Math.min(100, (scores.explorationScore ?? 0) - (entry.explorationDelta ?? 0))),
            introspectionScore: Math.max(0, Math.min(100, (scores.introspectionScore ?? 0) - (entry.introspectionDelta ?? 0))),
            actionScore: Math.max(0, Math.min(100, (scores.actionScore ?? 0) - (entry.actionDelta ?? 0))),
            updatedAt: new Date(),
          })
          .where(eq(userForestScores.userId, userId));
        console.log("[DELETE] Deducted score deltas for entry", id, {
          stabilityDelta: entry.stabilityDelta,
          explorationDelta: entry.explorationDelta,
          introspectionDelta: entry.introspectionDelta,
          actionDelta: entry.actionDelta,
        });
      }
    }

    // 3. Delete the entry
    const ok = await deleteEntry(id, userId);
    if (!ok) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE] Error deducting scores:", err);
    // Still try to delete the entry even if score deduction fails
    const ok = await deleteEntry(id, userId);
    if (!ok) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }
}
