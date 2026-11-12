"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingReference = createBookingReference;
const nanoid_1 = require("nanoid");
const code = (0, nanoid_1.customAlphabet)("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
function createBookingReference(propertyPrefix = "RMV", checkIn = new Date()) {
    const y = checkIn.getUTCFullYear();
    const m = String(checkIn.getUTCMonth() + 1).padStart(2, "0");
    const d = String(checkIn.getUTCDate()).padStart(2, "0");
    return `${propertyPrefix}-${y}${m}${d}-${code()}`;
}
