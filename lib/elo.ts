const ELO_K_FACTOR = 32;
const DEFAULT_RATING = 1000;

export function getDefaultRating() {
  return DEFAULT_RATING;
}

export function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateNewRating(
  currentRating: number,
  opponentRating: number,
  actualScore: number,
) {
  const expected = expectedScore(currentRating, opponentRating);
  const next = currentRating + ELO_K_FACTOR * (actualScore - expected);
  return {
    expected,
    newRating: Math.round(next),
    delta: Math.round(next - currentRating),
  };
}
