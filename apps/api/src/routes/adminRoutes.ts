import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok, ApiError } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAdmin, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { auditMetaFrom, writeAudit } from "../lib/audit";
import { createAvailabilityBlock, deleteAvailabilityBlock, getAdminCalendarSummary, getDashboardSummary, listAdminPackages, updateAvailabilityBlock } from "../services/adminService";
import { createPackage, deactivatePackage, updatePackage } from "../services/packageAdminService";

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);

adminRoutes.get("/admin/dashboard", asyncHandler(async (_req, res) => {
  res.json(ok(await getDashboardSummary(prisma)));
}));

adminRoutes.get("/admin/packages", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (_req, res) => {
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

/* ---------- Available Extras / Add-ons Management ---------- */

const addOnSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  pricingType: z.enum(["PER_BOOKING", "PER_NIGHT", "PER_GUEST", "PER_GUEST_PER_NIGHT"]).default("PER_BOOKING"),
  price: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"), z.number().nonnegative("Price must be non-negative")]),
  maximumQuantity: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

adminRoutes.get("/admin/add-ons", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (_req, res) => {
  const addOns = await prisma.addOn.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  res.json(ok(addOns));
}));

adminRoutes.post("/admin/add-ons", requireRole(["OWNER", "MANAGER"]), validateBody(addOnSchema), asyncHandler(async (req, res) => {
  const property = await prisma.property.findFirst();
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "No property configured.");

  const { name, description, pricingType, price, maximumQuantity, active } = req.body;
  const addOn = await prisma.addOn.create({
    data: {
      propertyId: property.id,
      name,
      description: description ?? null,
      pricingType,
      price: price,
      maximumQuantity: maximumQuantity ?? 1,
      active: active !== false,
    },
  });

  await writeAudit(prisma, req.adminUser!, "ADD_ON_CREATED", "AddOn", addOn.id, undefined, { name: addOn.name, price: addOn.price, pricingType: addOn.pricingType }, auditMetaFrom(req));
  res.status(201).json(ok(addOn));
}));

adminRoutes.patch("/admin/add-ons/:id", requireRole(["OWNER", "MANAGER"]), validateBody(addOnSchema.partial()), asyncHandler(async (req, res) => {
  const existing = await prisma.addOn.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw new ApiError(404, "ADD_ON_NOT_FOUND", "Add-on not found.");

  const updated = await prisma.addOn.update({
    where: { id: existing.id },
    data: {
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.pricingType !== undefined && { pricingType: req.body.pricingType }),
      ...(req.body.price !== undefined && { price: req.body.price }),
      ...(req.body.maximumQuantity !== undefined && { maximumQuantity: req.body.maximumQuantity }),
      ...(req.body.active !== undefined && { active: req.body.active }),
    },
  });

  await writeAudit(prisma, req.adminUser!, "ADD_ON_UPDATED", "AddOn", updated.id, existing, updated, auditMetaFrom(req));
  res.json(ok(updated));
}));

adminRoutes.delete("/admin/add-ons/:id", requireRole(["OWNER", "MANAGER"]), asyncHandler(async (req, res) => {
  const existing = await prisma.addOn.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw new ApiError(404, "ADD_ON_NOT_FOUND", "Add-on not found.");

  const bookingCount = await prisma.bookingAddOn.count({ where: { addOnId: existing.id } });
  if (bookingCount > 0) {
    const deactivated = await prisma.addOn.update({
      where: { id: existing.id },
      data: { active: false },
    });
    await writeAudit(prisma, req.adminUser!, "ADD_ON_DEACTIVATED", "AddOn", existing.id, existing, deactivated, auditMetaFrom(req));
    return res.json(ok({ deleted: false, deactivated: true, message: "Add-on has associated bookings and was deactivated instead of deleted." }));
  }

  await prisma.addOn.delete({ where: { id: existing.id } });
  await writeAudit(prisma, req.adminUser!, "ADD_ON_DELETED", "AddOn", existing.id, existing, undefined, auditMetaFrom(req));
  res.json(ok({ deleted: true }));
}));

