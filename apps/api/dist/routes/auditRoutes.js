"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
exports.auditRoutes = (0, express_1.Router)();
exports.auditRoutes.use(auth_1.requireAdmin, (0, auth_1.requireRole)(["OWNER", "MANAGER"]));
exports.auditRoutes.get("/admin/audit", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).optional(),
        pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(),
        action: zod_1.z.string().optional(),
        entityType: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
        adminId: zod_1.z.string().optional(),
        from: zod_1.z.string().date().optional(),
        to: zod_1.z.string().date().optional(),
    }).parse(req.query);
    res.json((0, apiResponse_1.ok)(await (0, auditService_1.listAuditLogs)(prisma_1.prisma, query)));
}));
