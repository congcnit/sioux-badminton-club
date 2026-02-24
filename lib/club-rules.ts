/**
 * Club Rules version. Bump this when rules content changes so users see the modal again.
 */
export const CLUB_RULES_VERSION = "1.0";

const STORAGE_KEY = "sbc-club-rules-seen-version";

/** Get the last seen rules version from storage (client-only). */
export function getClubRulesSeenVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Mark the current rules version as seen (client-only). */
export function markClubRulesAsSeen(version: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // ignore
  }
}

/** Whether the user has seen the current rules version. */
export function hasSeenCurrentClubRules(): boolean {
  return getClubRulesSeenVersion() === CLUB_RULES_VERSION;
}
