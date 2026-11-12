import { customAlphabet } from "nanoid";
const code = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
export function createBookingReference(propertyPrefix = "RMV", checkIn = new Date()) {
  const y = checkIn.getUTCFullYear();
  const m = String(checkIn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(checkIn.getUTCDate()).padStart(2, "0");
  return `${propertyPrefix}-${y}${m}${d}-${code()}`;
}
