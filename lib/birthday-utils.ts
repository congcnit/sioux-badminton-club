/** Month-day in `MM-DD` form for a calendar date interpreted in `timeZone`. */
export function monthDayInTimezone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "1";
  const day = parts.find((p) => p.type === "day")?.value ?? "1";
  return `${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function isBirthdayTodayInTimezone(
  dateOfBirth: Date,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return (
    monthDayInTimezone(now, timeZone) === monthDayInTimezone(dateOfBirth, timeZone)
  );
}
