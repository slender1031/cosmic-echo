import dynamic from "next/dynamic";
import { Suspense } from "react";

const CasesScreen = dynamic(() => import("@/components/screens/CasesScreen")), {
  loading: () => <div className="flex-1 flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-[#7e63c9] border-t-transparent animate-spin" /></div>,
  ssr: true,
});

export const runtime = "edge";

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-[#7e63c9] border-t-transparent animate-spin" /></div>}>
      <CasesScreen />
    </Suspense>
  );
}
