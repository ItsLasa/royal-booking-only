import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAdmin, requireRole } from "../middleware/auth";
import { listAuditLogs } from "../services/auditService";

export const auditRoutes = Router();
auditRoutes.use(requireAdmin, requireRole(["OWNER", "MANAGER"]));

auditRoutes.get("/admin/audit", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    action: z.string().optional(),
    entityType: z.string().optional(),
    search: z.string().optional(),
    adminId: z.string().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  }).parse(req.query);
  res.json(ok(await listAuditLogs(prisma, query)));
}));
