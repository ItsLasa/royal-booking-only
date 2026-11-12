"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.housekeepingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const housekeepingService_1 = require("../services/housekeepingService");
exports.housekeepingRoutes = (0, express_1.Router)();
exports.housekeepingRoutes.use(auth_1.requireAdmin);
exports.housekeepingRoutes.get("/admin/housekeeping", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));
    res.json((0, apiResponse_1.ok)(await (0, housekeepingService_1.getHousekeepingBoard)(prisma_1.prisma, date)));
}));
exports.housekeepingRoutes.patch("/admin/housekeeping/tasks", (0, validation_1.validateBody)(zod_1.z.object({
    unitId: zod_1.z.string().min(1),
    scheduledDate: zod_1.z.string().date(),
    status: zod_1.z.enum(["DIRTY", "ASSIGNED", "CLEANING", "READY", "INSPECTED"]),
    assignedToId: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().max(1000).nullable().optional(),
})), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, housekeepingService_1.upsertHousekeepingTask)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req))));
}));
