"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type CardSystem = "tarot" | "lenormand";

interface SettingsContextValue {
  cardSystem: CardSystem;
  setCardSystem: (system: CardSystem) => void;
}

const SETTINGS_KEY = "cosmic-echo.card-system";

function readStored(): CardSystem {
  if (typeof window === "undefined") return "tarot";
  const stored = window.localStorage.getItem(SETTINGS_KEY);
  if (stored === "lenormand") return "lenormand";
  return "tarot";
}

const SettingsContext = createContext<SettingsContextValue>({
  cardSystem: "tarot",
  setCardSystem: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [cardSystem, setCardSystemState] = useState<CardSystem>("tarot");

  useEffect(() => {
    setCardSystemState(readStored());
  }, []);

  const setCardSystem = useCallback((system: CardSystem) => {
    setCardSystemState(system);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_KEY, system);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ cardSystem, setCardSystem }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
