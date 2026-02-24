"use client";

import { useClubRules } from "@/components/club-rules/club-rules-context";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

type ClubRulesTriggerProps = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "sport";
  size?: "default" | "sm" | "lg" | "icon";
};

export function ClubRulesTrigger({
  className,
  variant = "outline",
  size = "icon",
}: ClubRulesTriggerProps) {
  const { openRules } = useClubRules();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={openRules}
      className={className}
      aria-label="Open club rules and information"
      title="Club rules"
    >
      <BookOpen className="size-4" aria-hidden />
    </Button>
  );
}
