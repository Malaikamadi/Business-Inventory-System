/**
 * All timestamps are stored in UTC. Reporting periods ("today", "this month")
 * are business-calendar concepts, so they must be resolved against the
 * business timezone rather than the server's or the viewer's.
 */

export const BUSINESS_TIMEZONE =
  process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE ?? "UTC";

/** Offset between the business timezone and UTC at a given instant, in ms. */
function timezoneOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  return local.getTime() - utc.getTime();
}

/** The business-local calendar date of an instant, as `YYYY-MM-DD`. */
export function businessDateString(
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** UTC instant at which the business day containing `date` begins. */
export function startOfBusinessDay(
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): Date {
  const [year, month, day] = businessDateString(date, timeZone)
    .split("-")
    .map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return new Date(guess.getTime() - timezoneOffsetMs(guess, timeZone));
}

export function endOfBusinessDay(
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): Date {
  const start = startOfBusinessDay(date, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** UTC instant at which the business month containing `date` begins. */
export function startOfBusinessMonth(
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): Date {
  const [year, month] = businessDateString(date, timeZone).split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  return new Date(guess.getTime() - timezoneOffsetMs(guess, timeZone));
}

/** Start of the business day `days` before the day containing `date`. */
export function startOfBusinessDaysAgo(
  days: number,
  date: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE
): Date {
  const start = startOfBusinessDay(date, timeZone);
  return startOfBusinessDay(
    new Date(start.getTime() - days * 24 * 60 * 60 * 1000),
    timeZone
  );
}
