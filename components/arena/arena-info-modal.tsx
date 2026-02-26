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
import { CircleHelp } from "lucide-react";

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
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <span aria-hidden>🏸</span>
            Arena – How it works
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>
                Arena runs <strong className="text-foreground">monthly competition events</strong>.
                Each event has a category (Men&apos;s or Women&apos;s), a date, and a minimum number of
                session attendances required to participate.
              </p>
              <p>
                <strong className="text-foreground">Eligibility:</strong> Only members who attended
                at least that many sessions in the event month can join. Participants start with{" "}
                <strong className="text-foreground">1000 points</strong> and are ranked by points,
                then by historical achievements and participation.
              </p>
              <p>
                <strong className="text-foreground">Challenges:</strong> Each participant has a
                limited number of challenges per event (set when the event is created). You may only
                challenge opponents whose rank is within the <strong className="text-foreground">rank range</strong>{" "}
                configured for that event (e.g. 2 = within 2 positions), and you cannot challenge the same opponent twice.
              </p>
              <p>
                <strong className="text-foreground">Competition format:</strong> 1 game to 21
                points. At 20–20, win by 2; at 29–29, first to 30 wins (30–29). 1 minute rest at 11
                points and change ends.
              </p>
              <p>
                <strong className="text-foreground">Rewards:</strong> 20k – 15k – 10k (1st – 2nd – 3rd).
              </p>
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
