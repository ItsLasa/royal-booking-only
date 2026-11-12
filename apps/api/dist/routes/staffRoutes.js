"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const staffService_1 = require("../services/staffService");
exports.staffRoutes = (0, express_1.Router)();
exports.staffRoutes.use(auth_1.requireAdmin, (0, auth_1.requireRole)(["OWNER"]));
const roles = ["OWNER", "MANAGER", "STAFF", "RECEPTION", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT"];
exports.staffRoutes.get("/admin/staff", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = zod_1.z.object({ search: zod_1.z.string().optional(), role: zod_1.z.string().optional() }).parse(req.query);
    res.json((0, apiResponse_1.ok)(await (0, staffService_1.listStaff)(prisma_1.prisma, query)));
}));
exports.staffRoutes.post("/admin/staff", (0, validation_1.validateBody)(zod_1.z.object({ name: zod_1.z.string().min(1), email: zod_1.z.string().email(), password: zod_1.z.string().min(8), role: zod_1.z.enum(roles) })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const staff = await (0, staffService_1.createStaff)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(staff));
}));
exports.staffRoutes.patch("/admin/staff/:id", (0, validation_1.validateBody)(zod_1.z.object({ name: zod_1.z.string().min(1).optional(), role: zod_1.z.enum(roles).optional(), active: zod_1.z.boolean().optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, staffService_1.updateStaff)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
exports.staffRoutes.post("/admin/staff/:id/reset-password", (0, validation_1.validateBody)(zod_1.z.object({ password: zod_1.z.string().min(8) })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, staffService_1.resetStaffPassword)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body.password, (0, audit_1.auditMetaFrom)(req))));
}));
