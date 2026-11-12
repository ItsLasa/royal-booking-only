import type { PrismaClient } from "@prisma/client";
import ical from "ical-generator";
import { ApiError } from "../lib/apiResponse";

export async function getCalendarFeed(prisma: PrismaClient, token: string) {
  const property = await prisma.property.findUnique({ where: { calendarFeedToken: token } });
  if (!property) throw new ApiError(404, "CALENDAR_NOT_FOUND", "Calendar feed not found.");

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ where: { propertyId: property.id, bookingStatus: "CONFIRMED" }, include: { package: true } }),
    prisma.availabilityBlock.findMany({ where: { unit: { propertyId: property.id } } }),
  ]);

  const calendar = ical({ name: `${property.name} availability` });
  for (const booking of bookings) {
    calendar.createEvent({ start: booking.checkInDate, end: booking.checkOutDate, summary: `Booked - ${booking.package.name}`, description: `Reference ${booking.reference}` });
  }
  for (const block of blocks) {
    calendar.createEvent({ start: block.startDate, end: block.endDate, summary: `Blocked - ${block.reason}` });
  }
  return calendar.toString();
}
