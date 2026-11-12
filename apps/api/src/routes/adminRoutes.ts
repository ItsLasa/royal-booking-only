import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAdmin, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { auditMetaFrom } from "../lib/audit";
import { createAvailabilityBlock, deleteAvailabilityBlock, getAdminCalendarSummary, getDashboardSummary, listAdminPackages, updateAvailabilityBlock } from "../services/adminService";
import { createPackage, deactivatePackage, updatePackage } from "../services/packageAdminService";

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);

adminRoutes.get("/admin/dashboard", asyncHandler(async (_req, res) => {
  res.json(ok(await getDashboardSummary(prisma)));
}));

adminRoutes.get("/admin/packages", asyncHandler(async (_req, res) => {
  res.json(ok(await listAdminPackages(prisma)));
}));

const packageCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  shortDescription: z.string().min(1),
  fullDescription: z.string().min(1),
  basePrice: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]),
  pricingType: z.enum(["PER_NIGHT", "PER_BOOKING"]).optional(),
  includedAdults: z.number().int().min(0).optional(),
  includedChildren: z.number().int().min(0).optional(),
  maximumGuests: z.number().int().positive().optional(),
  minimumNights: z.number().int().positive().optional(),
  maximumNights: z.number().int().positive().optional(),
  depositPercentage: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number()]).optional(),
  mealPlan: z.string().nullable().optional(),
  cancellationPolicy: z.string().optional(),
  terms: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  imageUrls: z.array(z.string()).optional(),
});

adminRoutes.post("/admin/packages", requireRole(["OWNER", "MANAGER"]), validateBody(packageCreateSchema), asyncHandler(async (req, res) => {
  const pkg = await createPackage(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(pkg));
}));

adminRoutes.patch("/admin/packages/:id", requireRole(["OWNER", "MANAGER"]), validateBody(packageCreateSchema.partial()), asyncHandler(async (req, res) => {
  res.json(ok(await updatePackage(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));

adminRoutes.post("/admin/packages/:id/deactivate", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (req, res) => {
  res.json(ok(await deactivatePackage(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));

adminRoutes.get("/admin/calendar", asyncHandler(async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : undefined;
  res.json(ok(await getAdminCalendarSummary(prisma, month)));
}));

const blockSchema = z.object({
  unitId: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

adminRoutes.post("/admin/availability-blocks", requireRole(["OWNER", "MANAGER"]), validateBody(blockSchema), asyncHandler(async (req, res) => {
  const block = await createAvailabilityBlock(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(block));
}));

adminRoutes.patch("/admin/availability-blocks/:id", requireRole(["OWNER", "MANAGER"]), validateBody(blockSchema.partial()), asyncHandler(async (req, res) => {
  res.json(ok(await updateAvailabilityBlock(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));

adminRoutes.delete("/admin/availability-blocks/:id", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (req, res) => {
  res.json(ok(await deleteAvailabilityBlock(prisma, req.adminUser!, String(req.params.id), auditMetaFrom(req))));
}));
