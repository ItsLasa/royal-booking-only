import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { getPaymentDetail, listPayments, recordManualPayment, refundPayment, verifyPayment } from "../services/paymentAdminService";

export const paymentAdminRoutes = Router();
paymentAdminRoutes.use(requireAdmin);

const listSchema = z.object({ page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(), status: z.string().optional(), provider: z.string().optional(), search: z.string().optional() });

paymentAdminRoutes.get("/admin/payments", asyncHandler(async (req, res) => {
  res.json(ok(await listPayments(prisma, listSchema.parse(req.query))));
}));

paymentAdminRoutes.get("/admin/payments/:id", asyncHandler(async (req, res) => {
  res.json(ok(await getPaymentDetail(prisma, String(req.params.id))));
}));

paymentAdminRoutes.post("/admin/payments/:id/verify", asyncHandler(async (req, res) => {
  res.json(ok(await verifyPayment(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

paymentAdminRoutes.post("/admin/payments", requireRole(["OWNER", "MANAGER", "ACCOUNTANT", "RECEPTION"]), validateBody(z.object({ bookingId: z.string().min(1), amount: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().positive()]), provider: z.enum(["CASH", "BANK_TRANSFER"]).optional(), paymentMethod: z.string().max(100).optional(), note: z.string().max(500).optional() })), asyncHandler(async (req, res) => {
  const payment = await recordManualPayment(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(payment));
}));

paymentAdminRoutes.post("/admin/payments/:id/refund", requireRole(["OWNER", "MANAGER", "ACCOUNTANT"]), validateBody(z.object({ amount: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().positive()]).optional(), reason: z.string().max(500).optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await refundPayment(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));
