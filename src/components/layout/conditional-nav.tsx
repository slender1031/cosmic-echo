"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./nav";

export function ConditionalBottomNav() {
  const pathname = usePathname();
  
  // Don't show bottom nav on cases new/edit routes (full-screen forms)
  if (
    pathname === "/cases/new" ||
    pathname.startsWith("/cases/edit")
  ) {
    return null;
  }
  
  return <BottomNav />;
}
