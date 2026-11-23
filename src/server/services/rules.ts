import { addDays, combineIST, todayIST, weekdayOf } from '../adapters/clock';

export interface SlotSettings {
  slotStart: string;
  slotEnd: string;
  slotMinutes: number;
}

export interface Slot {
  start: string;
  end: string;
}

function toMinutes(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** BR1: orders for date D can be placed or cancelled only while now < D + cut-off (IST). */
export function isOrderingOpen(date: string, nowInstant: Date, settings: { orderCutoff: string }): boolean {
  return nowInstant.getTime() < combineIST(date, settings.orderCutoff).getTime();
}

/** BR1: orders can be placed for today or tomorrow (IST) only. */
export function isValidOrderDate(date: string, nowInstant: Date): boolean {
  const today = todayIST(nowInstant);
  return date === today || date === addDays(today, 1);
}

/** Pickup slots for the window; a partial slot at the end is dropped. */
export function generateSlots(settings: SlotSettings): Slot[] {
  const start = toMinutes(settings.slotStart);
  const end = toMinutes(settings.slotEnd);
  const slots: Slot[] = [];
  for (let t = start; t + settings.slotMinutes <= end; t += settings.slotMinutes) {
    slots.push({ start: toHHMM(t), end: toHHMM(t + settings.slotMinutes) });
  }
  return slots;
}

/** A slot start must be `HH:mm`, on a slot boundary and inside the window (US-09 AC8). */
export function isValidSlot(slotStart: string, settings: SlotSettings): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slotStart)) return false;
  return generateSlots(settings).some((s) => s.start === slotStart);
}

/** End time of a slot that starts at `slotStart`. */
export function slotEndOf(slotStart: string, slotMinutes: number): string {
  return toHHMM(toMinutes(slotStart) + slotMinutes);
}

/** BR5: closed weekdays or closed dates. */
export function isClosedDay(
  date: string,
  settings: { closedWeekdays: readonly number[] },
  closedDates: readonly string[] = [],
): boolean {
  return settings.closedWeekdays.includes(weekdayOf(date)) || closedDates.includes(date);
}

export function isPastDate(date: string, nowInstant: Date): boolean {
  return date < todayIST(nowInstant);
}
