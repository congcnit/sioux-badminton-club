"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SportCardVariant = "default" | "glass" | "gradient" | "leaderboard";

type SportCardProps = {
  children: ReactNode;
  className?: string;
  variant?: SportCardVariant;
  hover?: boolean;
};

export function SportCard({
  children,
  className,
  variant = "default",
  hover = true,
}: SportCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border shadow-sm transition-all duration-300",
        variant === "default" && "bg-card border-border",
        variant === "glass" && "card-glass",
        variant === "gradient" && "card-gradient",
        variant === "leaderboard" &&
          "bg-card/80 border-border/80 backdrop-blur-sm",
        hover &&
          "hover:shadow-lg hover:border-accent/30 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SportCardHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function SportCardHeader({
  title,
  subtitle,
  action,
  className,
}: SportCardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-2 border-b border-border/60 px-4 py-3",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ?? null}
    </div>
  );
}
