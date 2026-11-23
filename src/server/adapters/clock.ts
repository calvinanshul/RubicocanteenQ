/** All business times are Asia/Kolkata (IST, UTC+05:30, no DST) — assumption A11. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Current instant. Uses the `x-test-now` value captured by the testClock middleware when enabled. */
export function now(req?: { testNow?: Date }): Date {
  return req?.testNow ? new Date(req.testNow.getTime()) : new Date();
}

/** IST calendar date (`YYYY-MM-DD`) of an instant. */
export function toISTDate(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayIST(instant: Date = new Date()): string {
  return toISTDate(instant);
}

/** The instant for an IST date + `HH:mm` time. */
export function combineIST(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+05:30`);
}

/** Add whole days to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday of an IST calendar date, 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Convert a `YYYY-MM-DD` string to the Date Prisma uses for `@db.Date` columns. */
export function dbDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function fromDbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
