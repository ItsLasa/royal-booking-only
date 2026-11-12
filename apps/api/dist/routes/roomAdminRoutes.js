"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomAdminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const adminService_1 = require("../services/adminService");
exports.roomAdminRoutes = (0, express_1.Router)();
exports.roomAdminRoutes.use(auth_1.requireAdmin);
exports.roomAdminRoutes.get("/admin/rooms", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.listRooms)(prisma_1.prisma)));
}));
const roomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1).regex(/^[a-z0-9-]+$/),
    unitType: zod_1.z.string().optional(),
    inventoryCount: zod_1.z.number().int().positive().optional(),
    bedrooms: zod_1.z.number().int().min(0).optional(),
    bathrooms: zod_1.z.number().int().min(0).optional(),
    baseOccupancy: zod_1.z.number().int().positive().optional(),
    maximumOccupancy: zod_1.z.number().int().positive().optional(),
    description: zod_1.z.string().max(2000).optional(),
    active: zod_1.z.boolean().optional(),
});
exports.roomAdminRoutes.post("/admin/rooms", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(roomSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const room = await (0, adminService_1.createRoom)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(room));
}));
exports.roomAdminRoutes.patch("/admin/rooms/:id", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, validation_1.validateBody)(roomSchema.partial()), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.updateRoom)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
