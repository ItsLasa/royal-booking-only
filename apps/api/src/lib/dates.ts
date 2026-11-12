import { differenceInCalendarDays, format, isBefore } from "date-fns";

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid date");
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  return differenceInCalendarDays(checkOut, checkIn);
}

export function occupiedNights(checkIn: Date, checkOut: Date) {
  const nights: Date[] = [];
  const cursor = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()));
  const end = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  while (cursor.getTime() < end) {
    nights.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function assertStayDates(checkIn: Date, checkOut: Date) {
  if (!isBefore(checkIn, checkOut)) throw new Error("Check-out must be after check-in.");
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}
