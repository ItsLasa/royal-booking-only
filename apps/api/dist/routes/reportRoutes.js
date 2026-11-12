"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../middleware/auth");
const reportService_1 = require("../services/reportService");
const adminService_1 = require("../services/adminService");
exports.reportRoutes = (0, express_1.Router)();
exports.reportRoutes.use(auth_1.requireAdmin);
const rangeSchema = zod_1.z.object({ from: zod_1.z.string().date().optional(), to: zod_1.z.string().date().optional() });
exports.reportRoutes.get("/admin/reports", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, adminService_1.getBookingStatusReport)(prisma_1.prisma)));
}));
exports.reportRoutes.get("/admin/reports/revenue", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, reportService_1.getRevenueReport)(prisma_1.prisma, rangeSchema.parse(req.query))));
}));
exports.reportRoutes.get("/admin/reports/occupancy", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, reportService_1.getOccupancyReport)(prisma_1.prisma, rangeSchema.parse(req.query))));
}));
exports.reportRoutes.get("/admin/reports/payments", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, reportService_1.getPaymentsReport)(prisma_1.prisma, rangeSchema.parse(req.query))));
}));
exports.reportRoutes.get("/admin/reports/cancellation", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, reportService_1.getCancellationReport)(prisma_1.prisma, rangeSchema.parse(req.query))));
}));
exports.reportRoutes.get("/admin/reports/export/bookings", (0, auth_1.requireRole)(["OWNER", "MANAGER", "ACCOUNTANT"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { filename, csv } = await (0, reportService_1.exportBookingsCsv)(prisma_1.prisma, rangeSchema.parse(req.query));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
}));
exports.reportRoutes.get("/admin/reports/export/payments", (0, auth_1.requireRole)(["OWNER", "MANAGER", "ACCOUNTANT"]), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { filename, csv } = await (0, reportService_1.exportPaymentsCsv)(prisma_1.prisma, rangeSchema.parse(req.query));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
}));
