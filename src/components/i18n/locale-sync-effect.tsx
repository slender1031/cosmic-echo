"use client";

import { useEffect } from "react";
import { getLocalePreference, normalizeLocale } from "@/i18n";
import i18n from "@/i18n";
import { useDemo } from "@/components/demo/demo-provider";

/**
 * When preference is "system", align app locale with browser locale.
 */
export function LocaleSyncEffect() {
  const { demoMode } = useDemo();

  useEffect(() => {
    if (getLocalePreference() !== "system") return;

    const browserLocale = normalizeLocale(navigator.language);
    if (!browserLocale) return;

    const active = normalizeLocale(i18n.resolvedLanguage || i18n.language);
    if (active !== browserLocale) {
      void i18n.changeLanguage(browserLocale);
    }
  }, [demoMode]);

  return null;
}
