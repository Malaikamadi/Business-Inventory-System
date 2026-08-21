/**
 * All timestamps are stored in UTC. Reporting periods ("today", "this month")
 * are business-calendar concepts, so they must be resolved against the
 * business timezone rather than the server's or the viewer's.
 *
 * Locales and timezones are resolved against what this Node build actually
 * ships. Vercel’s ICU data does not include `en-CA` / `en-SL`, and
 * `DateTimeFormat` throws at module load if we insist on them.
 */

function timeZoneIsSupported(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const PREFERRED_TIMEZONE =
  process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE ?? "UTC";

export const BUSINESS_TIMEZONE = timeZoneIsSupported(PREFERRED_TIMEZONE)
  ? PREFERRED_TIMEZONE
  : "UTC";

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
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
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

/** Hour of day (0–23) in the business timezone. */
export function businessHour(
  date: Date,
  timeZone: string = BUSINESS_TIMEZONE
): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(formatted);
}

/**
 * Stock and sales after close are unusual for this business. 22:00–06:00
 * local is treated as outside normal hours.
 */
export function isOutsideBusinessHours(
  date: Date,
  timeZone: string = BUSINESS_TIMEZONE
): boolean {
  const hour = businessHour(date, timeZone);
  return hour >= 22 || hour < 6;
}
