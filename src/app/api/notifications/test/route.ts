import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const runtime = 'edge';

/**
 * Notifications are not supported on Cloudflare Pages (Eazo SDK removed).
 * This route is kept as a no-op for API compatibility.
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    { message: "Notifications are not available on this deployment." },
    { status: 501 },
  );
}
