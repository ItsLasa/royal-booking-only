"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const audit_1 = require("../lib/audit");
const adminService_1 = require("../services/adminService");
const packageAdminService_1 = require("../services/packageAdminService");
exports.adminRoutes = (0, express_1.Router)();
exports.adminRoutes.use(auth_1.requireAdmin);
exports.adminRoutes.get("/admin/dashboard", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.getDashboardSummary)(prisma_1.prisma)));
}));
exports.adminRoutes.get("/admin/packages", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.listAdminPackages)(prisma_1.prisma)));
}));
const packageCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1).regex(/^[a-z0-9-]+$/),
    shortDescription: zod_1.z.string().min(1),
    fullDescription: zod_1.z.string().min(1),
    basePrice: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().nonnegative()]),
    pricingType: zod_1.z.enum(["PER_NIGHT", "PER_BOOKING"]).optional(),
    includedAdults: zod_1.z.number().int().min(0).optional(),
    includedChildren: zod_1.z.number().int().min(0).optional(),
    maximumGuests: zod_1.z.number().int().positive().optional(),
    minimumNights: zod_1.z.number().int().positive().optional(),
    maximumNights: zod_1.z.number().int().positive().optional(),
    depositPercentage: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number()]).optional(),
    mealPlan: zod_1.z.string().nullable().optional(),
    cancellationPolicy: zod_1.z.string().optional(),
    terms: zod_1.z.string().optional(),
    featured: zod_1.z.boolean().optional(),
    active: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    imageUrls: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.adminRoutes.post("/admin/packages", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(packageCreateSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const pkg = await (0, packageAdminService_1.createPackage)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(pkg));
}));
exports.adminRoutes.patch("/admin/packages/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(packageCreateSchema.partial()), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, packageAdminService_1.updatePackage)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.adminRoutes.post("/admin/packages/:id/deactivate", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, packageAdminService_1.deactivatePackage)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.adminRoutes.get("/admin/calendar", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.getAdminCalendarSummary)(prisma_1.prisma, month)));
}));
const blockSchema = zod_1.z.object({
    unitId: zod_1.z.string().min(1),
    startDate: zod_1.z.string().date(),
    endDate: zod_1.z.string().date(),
    reason: zod_1.z.string().min(1),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.adminRoutes.post("/admin/availability-blocks", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(blockSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const block = await (0, adminService_1.createAvailabilityBlock)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(block));
}));
exports.adminRoutes.patch("/admin/availability-blocks/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(blockSchema.partial()), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.updateAvailabilityBlock)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.adminRoutes.delete("/admin/availability-blocks/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.deleteAvailabilityBlock)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
