/**
 * Unit tests for Arena service:
 * 1. Ranking comparator (points → match diff → score diff → historical → monthly → yearly → memberId)
 * 2. Points calculation (rankDiff = winner rank − loser rank)
 *
 * This file tests pure functions: calculatePointsChange, compareArenaParticipants.
 */

import { describe, it, expect } from "vitest";
import {
  calculatePointsChange,
  compareArenaParticipants,
  type HistoricalRankCounts,
  type ArenaParticipantCompareFields,
} from "@/lib/arena-service";

const MAX_RANK_DIFF_2 = 2;
const MAX_RANK_DIFF_3 = 3;

function participant(overrides: Partial<ArenaParticipantCompareFields> = {}): ArenaParticipantCompareFields {
  return {
    points: 1000,
    wins: 0,
    losses: 0,
    scoreFor: 0,
    scoreAgainst: 0,
    monthlyParticipationCount: 0,
    yearlyParticipationCount: 0,
    memberId: "m",
    ...overrides,
  };
}

describe("calculatePointsChange", () => {
  // rankDiff = winner rank − loser rank. magnitude: rankDiff>0 ⇒ 5*(maxRankDiff+rankDiff); else 5*(maxRankDiff+rankDiff+1)

  it("#5 beats #2 (rankDiff 3), maxRankDiff 3: +30 / -30", () => {
    const r = calculatePointsChange(5, 2, MAX_RANK_DIFF_3);
    expect(r.winnerDelta).toBe(30); // 5*(3+3)=30
    expect(r.loserDelta).toBe(-30);
  });

  it("#2 beats #5 (rankDiff -3), maxRankDiff 3: +5 / -5", () => {
    const r = calculatePointsChange(2, 5, MAX_RANK_DIFF_3);
    expect(r.winnerDelta).toBe(5); // 5*(3-3+1)=5
    expect(r.loserDelta).toBe(-5);
  });

  it("#2 beats #1 (rankDiff 1), maxRankDiff 2: +15 / -15", () => {
    const r = calculatePointsChange(2, 1, MAX_RANK_DIFF_2);
    expect(r.winnerDelta).toBe(15); // 5*(2+1)=15
    expect(r.loserDelta).toBe(-15);
  });

  it("#1 beats #2 (rankDiff -1), maxRankDiff 2: +10 / -10", () => {
    const r = calculatePointsChange(1, 2, MAX_RANK_DIFF_2);
    expect(r.winnerDelta).toBe(10); // 5*(2-1+1)=10
    expect(r.loserDelta).toBe(-10);
  });

  it("#1 beats #3 (rankDiff -2), maxRankDiff 2: +5 / -5", () => {
    const r = calculatePointsChange(1, 3, MAX_RANK_DIFF_2);
    expect(r.winnerDelta).toBe(5); // 5*(2-2+1)=5
    expect(r.loserDelta).toBe(-5);
  });

  it("#5 beats #6 (rankDiff -1), maxRankDiff 2: +10 / -10", () => {
    const r = calculatePointsChange(5, 6, MAX_RANK_DIFF_2);
    expect(r.winnerDelta).toBe(10); // 5*(2-1+1)=10
    expect(r.loserDelta).toBe(-10);
  });

  it("same rank (rankDiff 0): +15 / -15 (maxRankDiff 2)", () => {
    const r = calculatePointsChange(2, 2, MAX_RANK_DIFF_2);
    expect(r.winnerDelta).toBe(15); // 5*(2+0+1)=15
    expect(r.loserDelta).toBe(-15);
  });
});

describe("compareArenaParticipants", () => {
  const emptyHist = new Map<string, HistoricalRankCounts>();

  it("higher points ranks first (DESC)", () => {
    const a = participant({ points: 900, memberId: "a" });
    const b = participant({ points: 1000, memberId: "b" });
    expect(compareArenaParticipants(a, b, emptyHist)).toBeGreaterThan(0); // b first
    expect(compareArenaParticipants(b, a, emptyHist)).toBeLessThan(0);
  });

  it("same points: higher match diff (wins−losses) first", () => {
    const a = participant({ points: 1000, wins: 1, losses: 2, memberId: "a" });
    const b = participant({ points: 1000, wins: 2, losses: 1, memberId: "b" });
    expect(compareArenaParticipants(a, b, emptyHist)).toBeGreaterThan(0); // b first
  });

  it("same points and match diff: higher score diff first", () => {
    const a = participant({ points: 1000, wins: 1, losses: 1, scoreFor: 40, scoreAgainst: 42, memberId: "a" });
    const b = participant({ points: 1000, wins: 1, losses: 1, scoreFor: 42, scoreAgainst: 40, memberId: "b" });
    expect(compareArenaParticipants(a, b, emptyHist)).toBeGreaterThan(0); // b first
  });

  it("same points, match diff, score diff: higher historical achievements first", () => {
    const hist = new Map<string, HistoricalRankCounts>([
      ["a", { 1: 1, 2: 2 }],
      ["b", { 1: 1, 2: 1 }],
    ]);
    const a = participant({ points: 1000, wins: 0, losses: 0, memberId: "a" });
    const b = participant({ points: 1000, wins: 0, losses: 0, memberId: "b" });
    expect(compareArenaParticipants(a, b, hist)).toBeLessThan(0); // a first (better hist)
  });

  it("same points and history: higher monthly participation first", () => {
    const a = participant({ points: 1000, monthlyParticipationCount: 3, memberId: "a" });
    const b = participant({ points: 1000, monthlyParticipationCount: 5, memberId: "b" });
    expect(compareArenaParticipants(a, b, emptyHist)).toBeGreaterThan(0); // b first
  });

  it("same points, history, monthly: higher yearly participation first", () => {
    const a = participant({ points: 1000, monthlyParticipationCount: 5, yearlyParticipationCount: 10, memberId: "a" });
    const b = participant({ points: 1000, monthlyParticipationCount: 5, yearlyParticipationCount: 30, memberId: "b" });
    expect(compareArenaParticipants(a, b, emptyHist)).toBeGreaterThan(0); // b first
  });

  it("all equal: deterministic tie-break by memberId", () => {
    const a = participant({ memberId: "member-a" });
    const b = participant({ memberId: "member-b" });
    const cmp = compareArenaParticipants(a, b, emptyHist);
    expect(cmp).not.toBe(0);
    expect(compareArenaParticipants(a, a, emptyHist)).toBe(0);
  });
});
