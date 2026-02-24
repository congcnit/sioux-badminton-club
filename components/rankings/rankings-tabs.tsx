"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type TabValue = "mens" | "womens";

const tabs: { value: TabValue; label: string }[] = [
  { value: "mens", label: "Men's Singles" },
  { value: "womens", label: "Women's Singles" },
];

export function RankingsTabs({ currentTab }: { currentTab: TabValue }) {
  return (
    <nav
      role="tablist"
      aria-label="Rankings category"
      className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={`/rankings?tab=${tab.value}`}
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
