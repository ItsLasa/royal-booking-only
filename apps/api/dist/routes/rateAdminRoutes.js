"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateAdminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const rateManagerService_1 = require("../services/rateManagerService");
exports.rateAdminRoutes = (0, express_1.Router)();
exports.rateAdminRoutes.use(auth_1.requireAdmin);
exports.rateAdminRoutes.get("/admin/rates", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.listAllRates)(prisma_1.prisma)));
}));
exports.rateAdminRoutes.get("/admin/rates/:packageId", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.listRatesForPackage)(prisma_1.prisma, String(req.params.packageId))));
}));
const seasonalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    startDate: zod_1.z.string().date(),
    endDate: zod_1.z.string().date(),
    nightlyPrice: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().nonnegative()]),
    weekendPrice: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().nonnegative()]).nullable().optional(),
    minimumNights: zod_1.z.number().int().positive().nullable().optional(),
    priority: zod_1.z.number().int().optional(),
});
exports.rateAdminRoutes.post("/admin/rates/:packageId/seasonal", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(seasonalSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(201).json((0, apiResponse_1.ok)(await (0, rateManagerService_1.createSeasonalRate)(prisma_1.prisma, req.adminUser, String(req.params.packageId), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.rateAdminRoutes.patch("/admin/rates/seasonal/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(seasonalSchema.partial().extend({ active: zod_1.z.boolean().optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.updateSeasonalRate)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.rateAdminRoutes.delete("/admin/rates/seasonal/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.deleteSeasonalRate)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.rateAdminRoutes.post("/admin/rates/:packageId/overrides/bulk", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(zod_1.z.object({ startDate: zod_1.z.string().date(), endDate: zod_1.z.string().date(), price: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().nonnegative()]).nullable().optional(), closed: zod_1.z.boolean().optional(), closedToArrival: zod_1.z.boolean().optional(), closedToDeparture: zod_1.z.boolean().optional(), note: zod_1.z.string().max(500).nullable().optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.bulkApplyOverrides)(prisma_1.prisma, req.adminUser, String(req.params.packageId), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.rateAdminRoutes.delete("/admin/rates/overrides/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.deleteOverride)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.rateAdminRoutes.post("/admin/rates/bulk-update", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(zod_1.z.object({ packageIds: zod_1.z.array(zod_1.z.string().min(1)).min(1), adjustmentPercent: zod_1.z.number().min(-99).max(500).optional(), fixedAmount: zod_1.z.union([zod_1.z.string().regex(/^-?\d+(\.\d{1,2})?$/), zod_1.z.number()]).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, rateManagerService_1.bulkUpdatePackageRates)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req))));
}));
