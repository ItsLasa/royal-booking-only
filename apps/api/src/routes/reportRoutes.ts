import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAdmin, requireRole } from "../middleware/auth";
import { exportBookingsCsv, exportPaymentsCsv, getCancellationReport, getOccupancyReport, getPaymentsReport, getRevenueReport } from "../services/reportService";
import { getBookingStatusReport } from "../services/adminService";

export const reportRoutes = Router();
reportRoutes.use(requireAdmin);

const rangeSchema = z.object({ from: z.string().date().optional(), to: z.string().date().optional() });

reportRoutes.get("/admin/reports", asyncHandler(async (_req, res) => {
  res.json(ok(await getBookingStatusReport(prisma)));
}));

reportRoutes.get("/admin/reports/revenue", asyncHandler(async (req, res) => {
  res.json(ok(await getRevenueReport(prisma, rangeSchema.parse(req.query))));
}));

reportRoutes.get("/admin/reports/occupancy", asyncHandler(async (req, res) => {
  res.json(ok(await getOccupancyReport(prisma, rangeSchema.parse(req.query))));
}));

reportRoutes.get("/admin/reports/payments", asyncHandler(async (req, res) => {
  res.json(ok(await getPaymentsReport(prisma, rangeSchema.parse(req.query))));
}));

reportRoutes.get("/admin/reports/cancellation", asyncHandler(async (req, res) => {
  res.json(ok(await getCancellationReport(prisma, rangeSchema.parse(req.query))));
}));

reportRoutes.get("/admin/reports/export/bookings", requireRole(["OWNER", "MANAGER", "ACCOUNTANT"]), asyncHandler(async (req, res) => {
  const { filename, csv } = await exportBookingsCsv(prisma, rangeSchema.parse(req.query));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}));

reportRoutes.get("/admin/reports/export/payments", requireRole(["OWNER", "MANAGER", "ACCOUNTANT"]), asyncHandler(async (req, res) => {
  const { filename, csv } = await exportPaymentsCsv(prisma, rangeSchema.parse(req.query));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}));
