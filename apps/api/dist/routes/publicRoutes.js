"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const availabilityService_1 = require("../services/availabilityService");
const pricingService_1 = require("../services/pricingService");
const bookingService_1 = require("../services/bookingService");
const validation_1 = require("../middleware/validation");
exports.publicRoutes = (0, express_1.Router)();
exports.publicRoutes.get("/public/packages", async (_req, res, next) => { try {
    const packages = await prisma_1.prisma.package.findMany({ where: { active: true }, orderBy: [{ featured: "desc" }, { displayOrder: "asc" }], include: { images: { orderBy: { displayOrder: "asc" } }, unit: true, amenities: { include: { amenity: true } } } });
    res.json((0, apiResponse_1.ok)(packages));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.get("/public/packages/:slug", async (req, res, next) => { try {
    const pkg = await prisma_1.prisma.package.findFirst({ where: { slug: req.params.slug, active: true }, include: { images: { orderBy: { displayOrder: "asc" } }, unit: true, property: true, amenities: { include: { amenity: true } } } });
    res.json((0, apiResponse_1.ok)(pkg));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.get("/public/add-ons", async (_req, res, next) => { try {
    const addOns = await prisma_1.prisma.addOn.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    res.json((0, apiResponse_1.ok)(addOns));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.post("/availability/search", (0, validation_1.validateBody)(zod_1.z.object({ packageId: zod_1.z.string(), checkInDate: zod_1.z.string().date(), checkOutDate: zod_1.z.string().date() })), async (req, res, next) => { try {
    const pkg = await prisma_1.prisma.package.findUniqueOrThrow({ where: { id: req.body.packageId } });
    const result = await (0, availabilityService_1.assertAvailable)(prisma_1.prisma, pkg.unitId, new Date(`${req.body.checkInDate}T00:00:00.000Z`), new Date(`${req.body.checkOutDate}T00:00:00.000Z`));
    res.json((0, apiResponse_1.ok)(result));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.post("/quotes", (0, validation_1.validateBody)(pricingService_1.quoteSchema), async (req, res, next) => { try {
    res.json((0, apiResponse_1.ok)(await (0, pricingService_1.calculateQuote)(prisma_1.prisma, req.body)));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.post("/bookings/hold", (0, validation_1.validateBody)(pricingService_1.quoteSchema.extend({ guest: zod_1.z.object({ firstName: zod_1.z.string().min(1), lastName: zod_1.z.string().min(1), email: zod_1.z.string().email(), phone: zod_1.z.string().min(7), country: zod_1.z.string().optional(), address: zod_1.z.string().optional(), marketingConsent: zod_1.z.boolean().optional() }), specialRequests: zod_1.z.string().max(1000).optional(), termsAccepted: zod_1.z.literal(true) })), async (req, res, next) => { try {
    const hold = await (0, bookingService_1.createBookingHold)(prisma_1.prisma, req.body);
    res.status(201).json((0, apiResponse_1.ok)({ booking: (0, bookingService_1.publicBooking)(hold.booking), quote: hold.quote }));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.get("/bookings/:reference/status", async (req, res, next) => { try {
    const booking = await prisma_1.prisma.booking.findUnique({ where: { reference: req.params.reference }, include: { package: true, guest: true, priceLines: true, payments: true } });
    res.json((0, apiResponse_1.ok)(booking ? (0, bookingService_1.publicBooking)(booking) : null));
}
catch (e) {
    next(e);
} });
exports.publicRoutes.post("/bookings/:reference/cancellation-request", async (req, res, next) => { try {
    await prisma_1.prisma.auditLog.create({ data: { action: "GUEST_CANCELLATION_REQUEST", entityType: "Booking", entityId: req.params.reference, newValues: { reason: req.body?.reason ?? null } } });
    res.json((0, apiResponse_1.ok)({ received: true }));
}
catch (e) {
    next(e);
} });
