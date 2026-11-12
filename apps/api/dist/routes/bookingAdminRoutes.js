"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingAdminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const pricingService_1 = require("../services/pricingService");
const bookingAdminService_1 = require("../services/bookingAdminService");
exports.bookingAdminRoutes = (0, express_1.Router)();
exports.bookingAdminRoutes.use(auth_1.requireAdmin);
const listSchema = zod_1.z.object({ page: zod_1.z.coerce.number().int().min(1).optional(), pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(), status: zod_1.z.string().optional(), paymentStatus: zod_1.z.string().optional(), search: zod_1.z.string().optional(), from: zod_1.z.string().date().optional(), to: zod_1.z.string().date().optional(), sort: zod_1.z.string().optional() });
exports.bookingAdminRoutes.get("/admin/bookings", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.listBookings)(prisma_1.prisma, listSchema.parse(req.query))));
}));
exports.bookingAdminRoutes.get("/admin/bookings/:id", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.getBookingDetail)(prisma_1.prisma, String(req.params.id))));
}));
const createSchema = pricingService_1.quoteSchema.extend({
    guest: zod_1.z.object({ firstName: zod_1.z.string().min(1), lastName: zod_1.z.string().min(1), email: zod_1.z.string().email(), phone: zod_1.z.string().min(7), country: zod_1.z.string().optional(), address: zod_1.z.string().optional() }),
    specialRequests: zod_1.z.string().max(1000).optional(),
    internalNotes: zod_1.z.string().max(2000).optional(),
    source: zod_1.z.enum(["DIRECT_WEBSITE", "ADMIN", "PHONE", "WALK_IN", "BOOKING_COM", "AIRBNB", "AGODA", "OTHER"]).optional(),
});
exports.bookingAdminRoutes.post("/admin/bookings", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT"]), (0, validation_1.validateBody)(createSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const booking = await (0, bookingAdminService_1.createManualBooking)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(booking));
}));
exports.bookingAdminRoutes.patch("/admin/bookings/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, validation_1.validateBody)(zod_1.z.object({ specialRequests: zod_1.z.string().max(1000).optional(), internalNotes: zod_1.z.string().max(2000).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.updateBooking)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/confirm", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.confirmBooking)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/cancel", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(zod_1.z.object({ reason: zod_1.z.string().max(1000).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.cancelBooking)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body.reason, (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/check-in", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.checkInBooking)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/check-out", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.checkOutBooking)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/no-show", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.markNoShow)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/extend", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, validation_1.validateBody)(zod_1.z.object({ checkOutDate: zod_1.z.string().date() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.extendStay)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body.checkOutDate, (0, audit_1.auditMetaFrom)(req))));
}));
exports.bookingAdminRoutes.post("/admin/bookings/:id/change-room", (0, auth_1.requireRole)(["OWNER", "MANAGER", "RECEPTION"]), (0, validation_1.validateBody)(zod_1.z.object({ unitId: zod_1.z.string().min(1) })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, bookingAdminService_1.changeRoom)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body.unitId, (0, audit_1.auditMetaFrom)(req))));
}));
