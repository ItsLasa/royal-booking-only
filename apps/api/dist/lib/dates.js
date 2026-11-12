"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateOnly = parseDateOnly;
exports.nightsBetween = nightsBetween;
exports.occupiedNights = occupiedNights;
exports.dateKey = dateKey;
exports.assertStayDates = assertStayDates;
exports.rangesOverlap = rangesOverlap;
const date_fns_1 = require("date-fns");
function parseDateOnly(value) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day)
        throw new Error("Invalid date");
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
        throw new Error("Invalid date");
    return date;
}
function nightsBetween(checkIn, checkOut) {
    return (0, date_fns_1.differenceInCalendarDays)(checkOut, checkIn);
}
function occupiedNights(checkIn, checkOut) {
    const nights = [];
    const cursor = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()));
    const end = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
    while (cursor.getTime() < end) {
        nights.push(new Date(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return nights;
}
function dateKey(date) {
    return (0, date_fns_1.format)(date, "yyyy-MM-dd");
}
function assertStayDates(checkIn, checkOut) {
    if (!(0, date_fns_1.isBefore)(checkIn, checkOut))
        throw new Error("Check-out must be after check-in.");
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
}
