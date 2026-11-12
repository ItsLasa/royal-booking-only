import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { createMaintenanceIssue, listMaintenanceIssues, updateMaintenanceIssue } from "../services/maintenanceService";

export const maintenanceRoutes = Router();
maintenanceRoutes.use(requireAdmin);

maintenanceRoutes.get("/admin/maintenance", asyncHandler(async (req, res) => {
  const query = z.object({ page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(), status: z.string().optional(), priority: z.string().optional(), unitId: z.string().optional() }).parse(req.query);
  res.json(ok(await listMaintenanceIssues(prisma, query)));
}));

const issueSchema = z.object({
  unitId: z.string().nullable().optional(),
  title: z.string().min(3),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().nullable().optional(),
});

maintenanceRoutes.post("/admin/maintenance", validateBody(issueSchema), asyncHandler(async (req, res) => {
  const issue = await createMaintenanceIssue(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(issue));
}));

maintenanceRoutes.patch("/admin/maintenance/:id", validateBody(issueSchema.partial().extend({ status: z.enum(["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]).optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await updateMaintenanceIssue(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));
