"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { changeLocale, getLocalePreference, type LocalePreference } from "@/i18n";
import { useEffect, useState } from "react";

const tabs = [
  {
    key: "morning",
    href: "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    key: "history",
    href: "/history",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    key: "cases",
    href: "/cases",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    key: "mine",
    href: "/mine",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      className="sticky bottom-0 left-0 right-0 z-20 border-t flex-shrink-0"
      style={{
        backgroundColor: "#fdfcfe",
        borderColor: "#dbd5e8",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              onClick={() => {
                // Dispatch custom event to notify screens to refresh
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("cosmic-echo:tab-change", { detail: { tab: tab.key } }));
                }
              }}
              className="flex flex-col items-center gap-1 min-w-[56px] min-h-[44px] justify-center relative"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                style={{ color: isActive ? "#7e63c9" : "#9794a2" }}
                className="transition-colors duration-150"
              >
                {tab.icon}
              </motion.div>
              <span
                className="text-[10px] font-semibold tracking-wider transition-colors duration-150"
                style={{ color: isActive ? "#7e63c9" : "#9794a2" }}
              >
                {t(`nav.${tab.key}`)}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full"
                  style={{ backgroundColor: "#7e63c9" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside
      className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r z-10"
      style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8" }}
    >
      <div className="px-6 pt-8 pb-4 border-b" style={{ borderColor: "#dbd5e8" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #c8708a, #7e63c9)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-sm font-bold" style={{ color: "#2d2a34" }}>
              {t("app.name")}
            </p>
            <p className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: "#9794a2" }}>
              Cosmic Echo
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
              style={{
                backgroundColor: isActive ? "#eae5f3" : "transparent",
                color: isActive ? "#7e63c9" : "#5c5a64",
              }}
            >
              {tab.icon}
              <span className="text-sm font-semibold">{t(`nav.${tab.key}`)}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#7e63c9" }} />
              )}
            </Link>
          );
        })}
      </nav>
      {/* Language switcher in sidebar footer */}
      <SidebarLocaleSwitcher />
    </aside>
  );
}

function SidebarLocaleSwitcher() {
  const { t, i18n } = useTranslation();
  const [pref, setPref] = useState<LocalePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPref(getLocalePreference());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setPref(getLocalePreference());
    i18n.on("languageChanged", sync);
    return () => { i18n.off("languageChanged", sync); };
  }, [mounted, i18n]);

  if (!mounted) return null;

  const options: { value: LocalePreference; label: string }[] = [
    { value: "system", label: t("language.followSystem") },
    { value: "en-US", label: t("language.enUS") },
    { value: "zh-CN", label: t("language.zhCN") },
  ];

  return (
    <div className="px-4 py-4 border-t" style={{ borderColor: "#dbd5e8" }}>
      <p className="text-[9px] uppercase font-bold tracking-widest mb-2" style={{ color: "#9794a2" }}>
        {t("language.label")}
      </p>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { changeLocale(opt.value); setPref(opt.value); }}
            className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-colors"
            style={pref === opt.value
              ? { backgroundColor: "#eae5f3", color: "#7e63c9" }
              : { backgroundColor: "transparent", color: "#9794a2" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
