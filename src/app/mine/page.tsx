"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useDemo } from "@/components/demo/demo-provider";

const MotionDiv = dynamic(
  () => import("framer-motion").then(mod => ({ default: mod.motion.div })),
  { ssr: false, loading: () => <div /> }
);

export const runtime = "edge";

export default function MinePage() {
  const { t } = useTranslation();
  const { demoUser } = useDemo();
  const user = demoUser;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full pointer-events-none -z-10 opacity-10"
           style={{ background: "radial-gradient(#f8f6fc)", filter: "blur(80px)" }} />

      <div className="mx-auto max-w-lg px-7 pt-8 pb-18 space-y-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="font-heading text-2xl font-bold" style={{ color: "#2d2a34" }}>{t("nav.mine")}</h1>
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#7e63c9" }}>My Profile</span>
        </div>

        {/* User Info Card */}
        <div className="rounded-[22px] border p-6" style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                 style={{ background: "linear-gradient(135deg, #c8708a, #7e63c9)" }}>
              {user?.name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold" style={{ color: "#2d2a34" }}>
                {user?.name || "Demo User"}
              </h2>
              <p className="text-[11px]" style={{ color: "#9794a2" }}>
                {user?.email || "demo@cosmic-echo.com"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-[22px] border p-6" style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8" }}>
          <h3 className="text-[10px] uppercase font-bold tracking-widest mb-4" style={{ color: "#9794a2" }}>
            {t("forest.stats") || "Statistics"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#7e63c9" }}>0</p>
              <p className="text-[10px]" style={{ color: "#9794a2" }}>{t("forest.days") || "Days"}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#7A9B68" }}>0</p>
              <p className="text-[10px]" style={{ color: "#9794a2" }}>{t("history.entries") || "Entries"}</p>
            </div>
          </div>
        </div>

        {/* 宇宙森林入口 */}
        <Link href="/forest" className="block">
          <div
            className="rounded-[22px] border p-6 flex items-center gap-4 transition-shadow hover:shadow-md active:scale-[0.98] transition-transform duration-100"
            style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8" }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eae5f3" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7e63c9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L12 22" />
                <path d="M12 2C12 2 8 6 8 10C8 14 12 14 12 14C12 14 16 14 16 10C16 6 12 2 12 2Z" />
                <path d="M9 18Q6 18 5 20" />
                <path d="M15 18Q18 18 19 20" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-base font-bold" style={{ color: "#2d2a34" }}>
                {t("nav.forest")}
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: "#9794a2" }}>
                Cosmic Forest
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9794a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Settings Placeholder */}
        <div className="rounded-[22px] border p-6" style={{ backgroundColor: "#fefdfe", borderColor: "#dbd5e8" }}>
          <h3 className="text-[10px] uppercase font-bold tracking-widest mb-4" style={{ color: "#9794a2" }}>
            {t("common.settings") || "Settings"}
          </h3>
          <p className="text-[11px]" style={{ color: "#9794a2" }}>
            {t("common.comingSoon") || "Coming soon..."}
          </p>
        </div>
      </div>
    </div>
  );
}
