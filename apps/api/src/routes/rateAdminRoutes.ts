import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { bulkApplyOverrides, bulkUpdatePackageRates, createSeasonalRate, deleteOverride, deleteSeasonalRate, listAllRates, listRatesForPackage, updateSeasonalRate } from "../services/rateManagerService";

export const rateAdminRoutes = Router();
rateAdminRoutes.use(requireAdmin, requireRole(["OWNER", "MANAGER"]));

rateAdminRoutes.get("/admin/rates", asyncHandler(async (_req, res) => {
  res.json(ok(await listAllRates(prisma)));
}));

rateAdminRoutes.get("/admin/rates/:packageId", asyncHandler(async (req, res) => {
  res.json(ok(await listRatesForPackage(prisma, String(req.params.packageId))));
}));

const seasonalSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  nightlyPrice: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]),
  weekendPrice: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable().optional(),
  minimumNights: z.number().int().positive().nullable().optional(),
  priority: z.number().int().optional(),
});

rateAdminRoutes.post("/admin/rates/:packageId/seasonal", requireRole(["OWNER", "MANAGER"]), validateBody(seasonalSchema), asyncHandler(async (req, res) => {
  res.status(201).json(ok(await createSeasonalRate(prisma, req.adminUser!, String(req.params.packageId), req.body, auditMetaFrom(req))));
}));

rateAdminRoutes.patch("/admin/rates/seasonal/:id", requireRole(["OWNER", "MANAGER"]), validateBody(seasonalSchema.partial().extend({ active: z.boolean().optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await updateSeasonalRate(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));

rateAdminRoutes.delete("/admin/rates/seasonal/:id", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (req, res) => {
  res.json(ok(await deleteSeasonalRate(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

rateAdminRoutes.post("/admin/rates/:packageId/overrides/bulk", requireRole(["OWNER", "MANAGER"]), validateBody(z.object({ startDate: z.string().date(), endDate: z.string().date(), price: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable().optional(), closed: z.boolean().optional(), closedToArrival: z.boolean().optional(), closedToDeparture: z.boolean().optional(), note: z.string().max(500).nullable().optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await bulkApplyOverrides(prisma, req.adminUser!, String(req.params.packageId), req.body, auditMetaFrom(req))));
}));

rateAdminRoutes.delete("/admin/rates/overrides/:id", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (req, res) => {
  res.json(ok(await deleteOverride(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

rateAdminRoutes.post("/admin/rates/bulk-update", requireRole(["OWNER", "MANAGER"]), validateBody(z.object({ packageIds: z.array(z.string().min(1)).min(1), adjustmentPercent: z.number().min(-99).max(500).optional(), fixedAmount: z.union([z.string().regex(/^-?\d+(\.\d{1,2})?$/), z.number()]).optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await bulkUpdatePackageRates(prisma, req.adminUser!, req.body, auditMetaFrom(req))));
}));
