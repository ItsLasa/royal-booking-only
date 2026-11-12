import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { getHousekeepingBoard, upsertHousekeepingTask } from "../services/housekeepingService";

export const housekeepingRoutes = Router();
housekeepingRoutes.use(requireAdmin);

housekeepingRoutes.get("/admin/housekeeping", asyncHandler(async (req, res) => {
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  res.json(ok(await getHousekeepingBoard(prisma, date)));
}));

housekeepingRoutes.patch("/admin/housekeeping/tasks", validateBody(z.object({
  unitId: z.string().min(1),
  scheduledDate: z.string().date(),
  status: z.enum(["DIRTY", "ASSIGNED", "CLEANING", "READY", "INSPECTED"]),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})), asyncHandler(async (req, res) => {
  res.json(ok(await upsertHousekeepingTask(prisma, req.adminUser!, req.body, auditMetaFrom(req))));
}));
