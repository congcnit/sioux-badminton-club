"use client";

import Image from "next/image";
import Link from "next/link";

import { ClubRulesProvider } from "@/components/club-rules/club-rules-context";
import { ClubRulesTrigger } from "@/components/club-rules/club-rules-trigger";
import { DashboardNav } from "@/components/layout/dashboard-nav";

type NavItem = { href: string; label: string; icon?: string };

type UserInfo = {
  name: string | null;
  email: string | null;
  image: string | null;
} | null;

type DashboardHeaderClientProps = {
  navigation: NavItem[];
  currentUser: UserInfo;
  initials: string;
  children: React.ReactNode;
};

export function DashboardHeaderClient({
  navigation,
  currentUser,
  initials,
  children,
}: DashboardHeaderClientProps) {
  return (
    <ClubRulesProvider>
      <div className="min-h-screen pb-10">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 shadow-lg backdrop-blur-xl">
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-80"
            aria-hidden
          />
          <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-muted/50 hover:scale-[1.01]"
              >
                <Image
                  src="/sbc-logo.jpg"
                  alt="Sioux Badminton Club logo"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-cover ring-1 ring-border/50"
                  unoptimized
                />
                <div>
                  <p className="text-sm font-bold tracking-tight text-foreground">
                    Sioux Badminton Club
                  </p>
                  <p className="text-xs text-muted-foreground">Club Operations</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <ClubRulesTrigger
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-full border-amber-500/60 bg-amber-500/15 text-amber-700 hover:border-amber-500 hover:bg-amber-500/25 dark:text-amber-400 dark:hover:bg-amber-500/20"
                />
                <Link
                  href="/settings/profile"
                  className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted text-xs font-semibold transition-all duration-200 hover:scale-105 hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open profile settings"
                  title="Profile settings"
                >
                  {currentUser?.image ? (
                    <Image
                      src={currentUser.image}
                      alt={currentUser.name ?? "User avatar"}
                      className="h-full w-full object-cover"
                      width={36}
                      height={36}
                      unoptimized
                    />
                  ) : (
                    initials
                  )}
                </Link>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto pb-1">
              <DashboardNav items={navigation} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </ClubRulesProvider>
  );
}
