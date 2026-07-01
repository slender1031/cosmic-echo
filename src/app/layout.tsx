import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { getServerLocale } from "@/lib/i18n/server-preference";
import { ConditionalBottomNav } from "@/components/layout/conditional-nav";
import { DemoProvider } from "@/components/demo/demo-provider";
import { SettingsProvider } from "@/lib/settings-context";
import { PwaRegister } from "@/components/pwa/pwa-register";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

// The platform stamps the real product title/description into .env at scaffold
// time (NEXT_PUBLIC_APP_TITLE / NEXT_PUBLIC_APP_DESCRIPTION). These drive the
// app's <title> / meta description. Fall back to a generic default when unset
// (e.g. local dev before any scaffold values are written).
const SITE_TITLE = process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "Eazo App";
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() || "An app build by eazo.ai";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_TITLE,
  },
  openGraph: {
    type: "website",
    siteName: "Cosmic Echo",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7e63c9",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased")}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#1a1a2e" }}>
        {/* Force-unregister any stale service workers before React boots */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(e){e.unregister()})})}`,
          }}
        />
        <PwaRegister />
        <I18nProvider>
          <DemoProvider>
            <SettingsProvider>
            {/* Phone simulator frame on desktop */}
            <div className="flex items-center justify-center min-h-svh py-4 md:py-8">
              <div className="w-full md:w-[393px] md:h-[852px] h-svh md:rounded-[3rem] md:shadow-2xl md:border md:border-neutral-700 overflow-hidden relative flex flex-col" style={{ backgroundColor: "#f8f6fc" }}>
                {/* Phone notch (desktop only) */}
                <div className="hidden md:flex items-center justify-center pt-2 pb-0 flex-shrink-0" style={{ backgroundColor: "#f8f6fc" }}>
                  <div className="w-[120px] h-[30px] bg-black rounded-b-2xl" />
                </div>
                {/* App content */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  <div className="flex-1 flex flex-col overflow-y-auto relative">
                    <div className="flex-1">
                      {children}
                    </div>
                    <ConditionalBottomNav />
                  </div>
                </div>
                {/* Home indicator (desktop only) */}
                <div className="hidden md:flex items-center justify-center pb-2 pt-1 flex-shrink-0" style={{ backgroundColor: "#f8f6fc" }}>
                  <div className="w-[134px] h-[5px] bg-neutral-800 rounded-full" />
                </div>
              </div>
            </div>
            <Toaster />
            </SettingsProvider>
          </DemoProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
