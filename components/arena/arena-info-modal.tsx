"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CircleHelp, Gamepad2, Gift, Medal, Swords, Users } from "lucide-react";

const bold = "font-semibold text-foreground";

const sections: { icon: typeof Medal; title: string; body: React.ReactNode }[] = [
  {
    icon: Medal,
    title: "Monthly battles",
    body: (
      <>
        Arena runs <span className={bold}>monthly competition events</span>. Each
        event has a category (Men's or Women's), a date, and a minimum number of
        session attendances required to participate.
      </>
    ),
  },
  {
    icon: Users,
    title: "Eligibility & ranking",
    body: (
      <>
        Only members who attended at least that many sessions in the event month
        can join. Participants start with <span className={bold}>1000 points</span>{" "}
        and are ranked by points, then by historical achievements and participation.
      </>
    ),
  },
  {
    icon: Swords,
    title: "Challenges",
    body: (
      <>
        Each participant has a limited number of challenges per event. You may
        only challenge opponents whose rank is within the event's{" "}
        <span className={bold}>rank range</span> (e.g. 2 = within 2 positions),
        and you cannot challenge the same opponent twice.
      </>
    ),
  },
  {
    icon: Gamepad2,
    title: "Format",
    body: (
      <>
        One game to <span className={bold}>21 points</span>. At 20–20, win by 2;
        at 29–29, first to <span className={bold}>30</span> wins (30–29). One
        minute rest at 11 points and change ends.
      </>
    ),
  },
  {
    icon: Gift,
    title: "Rewards",
    body: (
      <>
        <span className={bold}>1st: 20k</span> · <span className={bold}>2nd: 15k</span> ·{" "}
        <span className={bold}>3rd: 10k</span>
      </>
    ),
  },
];

export function ArenaInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center text-muted-foreground hover:text-[var(--brand-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Open Arena description and rules"
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="size-5" aria-hidden />
      </button>
      <AlertDialogContent
        size="default"
        className="max-w-lg"
        onOverlayClick={() => setOpen(false)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-col gap-1 text-left">
            <span className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <span aria-hidden className="text-3xl">🏸</span>
              Arena of Glory
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Climb the ranks. Challenge within range. Claim the podium.
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="mt-4 space-y-4 text-left">
              {sections.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange)]/15 text-[var(--brand-orange)]">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
