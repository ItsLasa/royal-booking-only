import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { quoteSchema } from "../services/pricingService";
import { cancelBooking, changeRoom, checkInBooking, checkOutBooking, confirmBooking, createManualBooking, extendStay, getBookingDetail, listBookings, markNoShow, updateBooking } from "../services/bookingAdminService";

export const bookingAdminRoutes = Router();
bookingAdminRoutes.use(requireAdmin);

const listSchema = z.object({ page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(), status: z.string().optional(), paymentStatus: z.string().optional(), search: z.string().optional(), from: z.string().date().optional(), to: z.string().date().optional(), sort: z.string().optional() });

bookingAdminRoutes.get("/admin/bookings", asyncHandler(async (req, res) => {
  res.json(ok(await listBookings(prisma, listSchema.parse(req.query))));
}));

bookingAdminRoutes.get("/admin/bookings/:id", asyncHandler(async (req, res) => {
  res.json(ok(await getBookingDetail(prisma, String(req.params.id))));
}));

const createSchema = quoteSchema.extend({
  guest: z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), phone: z.string().min(7), country: z.string().optional(), address: z.string().optional() }),
  specialRequests: z.string().max(1000).optional(),
  internalNotes: z.string().max(2000).optional(),
  source: z.enum(["DIRECT_WEBSITE", "ADMIN", "PHONE", "WALK_IN", "BOOKING_COM", "AIRBNB", "AGODA", "OTHER"]).optional(),
});

bookingAdminRoutes.post("/admin/bookings", requireRole(["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT"]), validateBody(createSchema), asyncHandler(async (req, res) => {
  const booking = await createManualBooking(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(booking));
}));

bookingAdminRoutes.patch("/admin/bookings/:id", requireRole(["OWNER", "MANAGER", "RECEPTION"]), validateBody(z.object({ specialRequests: z.string().max(1000).optional(), internalNotes: z.string().max(2000).optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await updateBooking(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/confirm", requireRole(["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT"]), asyncHandler(async (req, res) => {
  res.json(ok(await confirmBooking(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/cancel", requireRole(["OWNER", "MANAGER"]), validateBody(z.object({ reason: z.string().max(1000).optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await cancelBooking(prisma, req.adminUser!, String(req.params.id), req.body.reason, auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/check-in", requireRole(["OWNER", "MANAGER", "RECEPTION"]), asyncHandler(async (req, res) => {
  res.json(ok(await checkInBooking(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/check-out", requireRole(["OWNER", "MANAGER", "RECEPTION"]), asyncHandler(async (req, res) => {
  res.json(ok(await checkOutBooking(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/no-show", requireRole(["OWNER", "MANAGER", "RECEPTION"]), asyncHandler(async (req, res) => {
  res.json(ok(await markNoShow(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/extend", requireRole(["OWNER", "MANAGER", "RECEPTION"]), validateBody(z.object({ checkOutDate: z.string().date() })), asyncHandler(async (req, res) => {
  res.json(ok(await extendStay(prisma, req.adminUser!, String(req.params.id), req.body.checkOutDate, auditMetaFrom(req))));
}));

bookingAdminRoutes.post("/admin/bookings/:id/change-room", requireRole(["OWNER", "MANAGER", "RECEPTION"]), validateBody(z.object({ unitId: z.string().min(1) })), asyncHandler(async (req, res) => {
  res.json(ok(await changeRoom(prisma, req.adminUser!, String(req.params.id), req.body.unitId, auditMetaFrom(req))));
}));
