export type SoloMatchPlayer = {
  id: string;
  user: { name: string | null; email: string; image: string | null };
};

export type SoloMatchWithPlayers = {
  id: string;
  year: number;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  player1Score: number;
  player2Score: number;
  matchDate: Date;
  notes: string | null;
  createdAt: Date;
  player1: SoloMatchPlayer;
  player2: SoloMatchPlayer;
};

export type SoloRankEntry = {
  memberId: string;
  memberName: string;
  memberImage: string | null;
  wins: number;
  losses: number;
  matches: number;
  gameDiff: number;
  sessionCount: number;
  rank: number;
};

/**
 * Compute the Solo leaderboard for a given set of matches.
 * Ranking order: wins DESC → gameDiff DESC → sessionCount DESC → memberId (stable tie-break).
 */
export function computeSoloLeaderboard(
  matches: SoloMatchWithPlayers[],
  attendanceByMember: Map<string, number>,
): SoloRankEntry[] {
  const statsMap = new Map<
    string,
    {
      memberId: string;
      memberName: string;
      memberImage: string | null;
      wins: number;
      losses: number;
      gameDiff: number;
    }
  >();

  function ensureMember(player: SoloMatchPlayer) {
    if (!statsMap.has(player.id)) {
      statsMap.set(player.id, {
        memberId: player.id,
        memberName: player.user.name ?? player.user.email,
        memberImage: player.user.image,
        wins: 0,
        losses: 0,
        gameDiff: 0,
      });
    }
    return statsMap.get(player.id)!;
  }

  for (const match of matches) {
    const s1 = ensureMember(match.player1);
    const s2 = ensureMember(match.player2);

    if (match.winnerId === match.player1Id) {
      s1.wins += 1;
      s2.losses += 1;
    } else {
      s2.wins += 1;
      s1.losses += 1;
    }

    s1.gameDiff += match.player1Score - match.player2Score;
    s2.gameDiff += match.player2Score - match.player1Score;
  }

  const entries = Array.from(statsMap.values()).map((s) => ({
    ...s,
    matches: s.wins + s.losses,
    sessionCount: attendanceByMember.get(s.memberId) ?? 0,
    rank: 0,
  }));

  entries.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
    if (a.sessionCount !== b.sessionCount) return b.sessionCount - a.sessionCount;
    return a.memberId.localeCompare(b.memberId);
  });

  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}
