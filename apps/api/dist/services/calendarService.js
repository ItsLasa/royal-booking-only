"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarFeed = getCalendarFeed;
const ical_generator_1 = __importDefault(require("ical-generator"));
const apiResponse_1 = require("../lib/apiResponse");
async function getCalendarFeed(prisma, token) {
    const property = await prisma.property.findUnique({ where: { calendarFeedToken: token } });
    if (!property)
        throw new apiResponse_1.ApiError(404, "CALENDAR_NOT_FOUND", "Calendar feed not found.");
    const [bookings, blocks] = await Promise.all([
        prisma.booking.findMany({ where: { propertyId: property.id, bookingStatus: "CONFIRMED" }, include: { package: true } }),
        prisma.availabilityBlock.findMany({ where: { unit: { propertyId: property.id } } }),
    ]);
    const calendar = (0, ical_generator_1.default)({ name: `${property.name} availability` });
    for (const booking of bookings) {
        calendar.createEvent({ start: booking.checkInDate, end: booking.checkOutDate, summary: `Booked - ${booking.package.name}`, description: `Reference ${booking.reference}` });
    }
    for (const block of blocks) {
        calendar.createEvent({ start: block.startDate, end: block.endDate, summary: `Blocked - ${block.reason}` });
    }
    return calendar.toString();
}
