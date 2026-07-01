"use client";

import { useParams } from "next/navigation";
import { CasesNewScreen } from "@/components/screens/CasesNewScreen";

export default function CasesEditPage() {
  const params = useParams();
  const caseId = params.id ? parseInt(params.id as string, 10) : undefined;
  return <CasesNewScreen caseId={caseId} />;
}
