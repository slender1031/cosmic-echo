"use client";

import { createContext, useContext } from "react";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo";

const DemoContext = createContext({ demoMode: DEMO_MODE, demoUser: DEMO_USER });

export function DemoProvider({ children }: { children: React.ReactNode }) {
  return (
    <DemoContext.Provider value={{ demoMode: DEMO_MODE, demoUser: DEMO_USER }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
