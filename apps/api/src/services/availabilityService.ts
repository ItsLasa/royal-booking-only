import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";

const blockingStatuses = ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED"];

export async function expireHolds(prisma: PrismaClient, now = new Date()) {
  return prisma.booking.updateMany({
    where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT"] }, expiresAt: { lt: now }, paymentStatus: { in: ["UNPAID", "FAILED"] } },
    data: { bookingStatus: "EXPIRED" },
  });
}

export async function getReservedCount(prisma: PrismaClient, unitId: string, checkInDate: Date, checkOutDate: Date) {
  await expireHolds(prisma);
  return prisma.booking.count({
    where: { unitId, bookingStatus: { in: blockingStatuses as any }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate } },
  });
}

export async function assertAvailable(prisma: PrismaClient, unitId: string, checkInDate: Date, checkOutDate: Date) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || !unit.active) throw new ApiError(404, "UNIT_NOT_FOUND", "The villa unit is not available.");
  const [reserved, blocks] = await Promise.all([
    getReservedCount(prisma, unitId, checkInDate, checkOutDate),
    prisma.availabilityBlock.count({ where: { unitId, startDate: { lt: checkOutDate }, endDate: { gt: checkInDate } } }),
  ]);
  if (blocks > 0) throw new ApiError(409, "DATES_UNAVAILABLE", "These dates are blocked for maintenance or an owner hold. Please choose different dates.");
  if (reserved >= unit.inventoryCount) throw new ApiError(409, "DATES_UNAVAILABLE", "These dates are already booked. Please choose different dates.");
  return { available: true, remaining: unit.inventoryCount - reserved };
}


