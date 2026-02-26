"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type ArenaTabValue = "men" | "women";

const tabs: { value: ArenaTabValue; label: string }[] = [
  { value: "men", label: "Men's" },
  { value: "women", label: "Women's" },
];

export function ArenaTabs({
  currentTab,
  searchParams,
}: {
  currentTab: ArenaTabValue;
  searchParams: string;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Arena category"
      className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.value;
        const href = `/arena?tab=${tab.value}${searchParams ? `&${searchParams}` : ""}`;
        return (
          <Link
            key={tab.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative rounded-md px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
