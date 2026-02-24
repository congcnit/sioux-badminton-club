import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  valueClassName?: string;
  icon?: ReactNode;
  helperText?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  valueClassName,
  icon,
  helperText,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/80 p-5 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-lg",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold", valueClassName)}>{value}</p>
      {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
