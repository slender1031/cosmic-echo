import { NextRequest, NextResponse } from "next/server";
import { getTodayAstrology, ASTROLOGY_ICONS } from "@/lib/tarot-data";
import { getTodayDateInfo } from "@/lib/lunar";

// Public endpoint — no auth required for today's astrology tag
export async function GET(_request: NextRequest) {
  const astrology = getTodayAstrology();
  const dateInfo = getTodayDateInfo();
  return NextResponse.json({ astrology: { ...astrology, icon: ASTROLOGY_ICONS[astrology.id] }, dateInfo });
}
