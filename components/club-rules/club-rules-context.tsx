"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  CLUB_RULES_VERSION,
  hasSeenCurrentClubRules,
  markClubRulesAsSeen,
} from "@/lib/club-rules";
import { ClubRulesModal } from "@/components/club-rules/club-rules-modal";

type ClubRulesContextValue = {
  openRules: () => void;
};

const ClubRulesContext = createContext<ClubRulesContextValue | null>(null);

export function useClubRules(): ClubRulesContextValue {
  const ctx = useContext(ClubRulesContext);
  if (!ctx) {
    throw new Error("useClubRules must be used within ClubRulesProvider");
  }
  return ctx;
}

type ClubRulesProviderProps = {
  children: React.ReactNode;
  /** If true, auto-show modal when user hasn't seen current version. Default true. */
  autoShow?: boolean;
};

export function ClubRulesProvider({ children, autoShow = true }: ClubRulesProviderProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !autoShow) return;
    if (!hasSeenCurrentClubRules()) {
      setOpen(true);
    }
  }, [mounted, autoShow]);

  const openRules = useCallback(() => setOpen(true), []);

  const handleClose = useCallback(() => {
    markClubRulesAsSeen(CLUB_RULES_VERSION);
  }, []);

  const value: ClubRulesContextValue = { openRules };

  return (
    <ClubRulesContext.Provider value={value}>
      {children}
      <ClubRulesModal open={open} onOpenChange={setOpen} onClose={handleClose} />
    </ClubRulesContext.Provider>
  );
}
