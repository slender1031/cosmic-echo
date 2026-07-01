import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const runtime = 'edge';

/**
 * Daily digest cron job.
 * Not supported on Cloudflare Pages (Eazo SDK removed).
 * To re-enable: use Cloudflare Cron Triggers with D1 database.
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  console.log("[Daily Digest] Cron job is disabled (Eazo SDK removed).");
  return NextResponse.json({ message: "Cron job disabled" });
}
