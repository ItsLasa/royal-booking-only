"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentAdminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../lib/audit");
const paymentAdminService_1 = require("../services/paymentAdminService");
exports.paymentAdminRoutes = (0, express_1.Router)();
exports.paymentAdminRoutes.use(auth_1.requireAdmin);
const listSchema = zod_1.z.object({ page: zod_1.z.coerce.number().int().min(1).optional(), pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(), status: zod_1.z.string().optional(), provider: zod_1.z.string().optional(), search: zod_1.z.string().optional() });
exports.paymentAdminRoutes.get("/admin/payments", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, paymentAdminService_1.listPayments)(prisma_1.prisma, listSchema.parse(req.query))));
}));
exports.paymentAdminRoutes.get("/admin/payments/:id", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, paymentAdminService_1.getPaymentDetail)(prisma_1.prisma, String(req.params.id))));
}));
exports.paymentAdminRoutes.post("/admin/payments/:id/verify", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, paymentAdminService_1.verifyPayment)(prisma_1.prisma, req.adminUser, String(req.params.id), (0, audit_1.auditMetaFrom)(req))));
}));
exports.paymentAdminRoutes.post("/admin/payments", (0, auth_1.requireRole)(["OWNER", "MANAGER", "ACCOUNTANT", "RECEPTION"]), (0, validation_1.validateBody)(zod_1.z.object({ bookingId: zod_1.z.string().min(1), amount: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().positive()]), provider: zod_1.z.enum(["CASH", "BANK_TRANSFER"]).optional(), paymentMethod: zod_1.z.string().max(100).optional(), note: zod_1.z.string().max(500).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await (0, paymentAdminService_1.recordManualPayment)(prisma_1.prisma, req.adminUser, req.body, (0, audit_1.auditMetaFrom)(req));
    res.status(201).json((0, apiResponse_1.ok)(payment));
}));
exports.paymentAdminRoutes.post("/admin/payments/:id/refund", (0, auth_1.requireRole)(["OWNER", "MANAGER", "ACCOUNTANT"]), (0, validation_1.validateBody)(zod_1.z.object({ amount: zod_1.z.union([zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/), zod_1.z.number().positive()]).optional(), reason: zod_1.z.string().max(500).optional() })), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, paymentAdminService_1.refundPayment)(prisma_1.prisma, req.adminUser, String(req.params.id), req.body, (0, audit_1.auditMetaFrom)(req))));
}));
