"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const settingsService_1 = require("../services/settingsService");
exports.settingsRoutes = (0, express_1.Router)();
exports.settingsRoutes.use(auth_1.requireAdmin, (0, auth_1.requireRole)(["OWNER", "MANAGER"]));
exports.settingsRoutes.get("/admin/settings", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, settingsService_1.getAllSettings)(prisma_1.prisma)));
}));
exports.settingsRoutes.patch("/admin/settings", (0, auth_1.requireRole)(["OWNER", "MANAGER"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const patch = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).parse(req.body);
    res.json((0, apiResponse_1.ok)(await (0, settingsService_1.updateSettings)(prisma_1.prisma, req.adminUser, patch, (0, audit_1.auditMetaFrom)(req))));
}));
