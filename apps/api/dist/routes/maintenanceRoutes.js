"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const maintenanceService_1 = require("../services/maintenanceService");
exports.maintenanceRoutes = (0, express_1.Router)();
exports.maintenanceRoutes.use(auth_1.requireAdmin);
exports.maintenanceRoutes.get("/admin/maintenance", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = zod_1.z.object({ page: zod_1.z.coerce.number().int().min(1).optional(), pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(), status: zod_1.z.string().optional(), priority: zod_1.z.string().optional(), unitId: zod_1.z.string().optional() }).parse(req.query);
    res.json((0, apiResponse_1.ok)(await (0, maintenanceService_1.listMaintenanceIssues)(prisma_1.prisma, query)));
}));
const issueSchema = zod_1.z.object({
    unitId: zod_1.z.string().nullable().optional(),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().max(2000).nullable().optional(),
    priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedToId: zod_1.z.string().nullable().optional(),
});
exports.maintenanceRoutes.post("/admin/maintenance", (0, validation_1.validateBody)(issueSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const issue = await (0, maintenanceService_1.createMaintenanceIssue)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(issue));
}));
exports.maintenanceRoutes.patch("/admin/maintenance/:id", (0, validation_1.validateBody)(issueSchema.partial().extend({ status: zod_1.z.enum(["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, maintenanceService_1.updateMaintenanceIssue)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
