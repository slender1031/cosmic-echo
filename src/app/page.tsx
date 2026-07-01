import dynamic from "next/dynamic";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const MorningScreen = dynamic(() => import("@/components/screens/MorningScreen")), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

export const runtime = "edge";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MorningScreen />
    </Suspense>
  );
}
