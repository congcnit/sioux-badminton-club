"use client";

import Image from "next/image";

/**
 * Static club rules content. Edit here when rules change, then bump CLUB_RULES_VERSION in lib/club-rules.ts.
 */
export function ClubRulesContent() {
  return (
    <div className="space-y-6 text-sm text-foreground">
      <section>
        <h2 className="mb-2 font-semibold text-base">Weekly Schedule</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>Tuesday: 6:00 AM – 8:00 AM</li>
          <li>Saturday: 7:00 AM – 9:00 AM</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-base">Participation Rules</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            Checked in but did not attend without a valid reason → <strong className="text-foreground">Fine: 25,000 VND</strong>
          </li>
          <li>
            Arriving 15 minutes late or more without a valid reason → <strong className="text-foreground">Fine: 15,000 VND</strong>
          </li>
          <li>
            Did not check in but still participated → Charged as guest fee (same as spouse guest fee)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-base">Guest Policy</h2>
        <p className="mb-2 text-muted-foreground">
          Guests are limited to spouses or acquaintances of club members and must have basic badminton skills (know the rules, serve properly, positioning, etc.).
        </p>

        <h3 className="mb-1 font-medium text-foreground">Spouse of Club Member</h3>
        <ul className="mb-3 list-inside list-disc space-y-1 text-muted-foreground">
          <li>Admission depends on the number of registered members attending</li>
          <li>
            Fee:{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              Male 25,000 VND · Female 20,000 VND
            </span>
          </li>
        </ul>

        <h3 className="mb-1 font-medium text-foreground">Acquaintances / Friends</h3>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>Only allowed when fewer than 6 members have registered</li>
          <li>
            Fee:{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              Male 40,000 VND · Female 30,000 VND
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-base">Club Fund Transfer</h2>
        <p className="text-muted-foreground">
          Please scan the QR code below to transfer money to the club fund.
        </p>
        <div className="mt-3 flex justify-center">
          <Image
            src="/payment-qr.jpg"
            alt="QR code for club fund transfer"
            width={400}
            height={400}
            className="min-w-[400px] max-w-full rounded-lg border border-border object-contain"
            unoptimized
          />
        </div>
      </section>
    </div>
  );
}
