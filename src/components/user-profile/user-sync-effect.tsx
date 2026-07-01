"use client";

import { useEffect } from "react";
import { useDemo } from "@/components/demo/demo-provider";

/**
 * Simplified UserSyncEffect for Cloudflare Pages deployment.
 * No Eazo SDK sync needed - demo mode only.
 */
export function UserSyncEffect() {
  const { demoMode } = useDemo();

  useEffect(() => {
    if (!demoMode) return;
    // No-op in demo mode; extend here with real auth sync if needed later.
  }, [demoMode]);

  return null;
}
