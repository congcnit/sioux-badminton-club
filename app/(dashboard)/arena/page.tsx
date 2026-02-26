import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { SportCard } from "@/components/ui/sport-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ArenaTabs, type ArenaTabValue } from "@/components/arena/arena-tabs";
import { ArenaInfoModal } from "@/components/arena/arena-info-modal";
import { CreateArenaEventForm } from "@/components/arena/create-arena-event-form";
import { ArenaEventCard, type ArenaEventWithParticipants } from "@/components/arena/arena-event-card";
import { Medal } from "lucide-react";

const TAB_PARAM = "tab";

function parseTab(value: string | undefined): ArenaTabValue {
  if (value === "women") return "women";
  return "men";
}

function toArenaCategory(tab: ArenaTabValue): "MEN" | "WOMEN" {
  return tab === "women" ? "WOMEN" : "MEN";
}

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = parseTab(params[TAB_PARAM] as string | undefined);
  const category = toArenaCategory(tab);

  const session = await getServerSession(authOptions);
  const canManage = session?.user?.role === Role.ADMIN;

  const events = await db.arenaEvent.findMany({
    where: { category },
    include: {
      participants: {
        include: { member: { include: { user: true } } },
        orderBy: { rank: "asc" },
      },
      matches: {
        include: {
          challenger: { include: { member: { include: { user: true } } } },
          opponent: { include: { member: { include: { user: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { matches: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { date: "desc" }],
    take: 20,
  });

  const searchParamsString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([k, v]) => k !== TAB_PARAM && v != null && v !== "" && typeof v === "string",
      ) as [string, string][],
    ),
  ).toString();

  return (
    <PageMotion className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HeroMotion
          title={
            <span className="inline-flex items-center gap-2">
              Arena
              <ArenaInfoModal />
            </span>
          }
          subtitle="Monthly competition events. Compete by challenging opponents within rank range to gain points and climb the leaderboard."
        />
        {canManage ? (
          <div className="flex gap-2">
            <CreateArenaEventForm defaultCategory={category} />
          </div>
        ) : null}
      </div>

      <ArenaTabs currentTab={tab} searchParams={searchParamsString} />

      {events.length === 0 ? (
        <SportCard variant="leaderboard" className="overflow-hidden">
          <div className="p-8">
            <EmptyState
              title="No arena events yet"
              description={
                canManage
                  ? "Create an arena event to start a monthly competition. Eligible members are those with enough session participation in the event month."
                  : "No arena events in this category yet."
              }
              icon={Medal}
            />
          </div>
        </SportCard>
      ) : (
        <div className="space-y-6">
          {events.map((event) => {
            const currentUserParticipantId =
              session?.user?.id != null
                ? event.participants.find(
                    (p) => p.member.user.id === session.user.id,
                  )?.id ?? null
                : null;
            return (
              <ArenaEventCard
                key={event.id}
                event={event as unknown as ArenaEventWithParticipants}
                canManage={canManage ?? false}
                currentUserParticipantId={currentUserParticipantId}
              />
            );
          })}
        </div>
      )}
    </PageMotion>
  );
}
