import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { createStaff, listStaff, resetStaffPassword, updateStaff } from "../services/staffService";

export const staffRoutes = Router();
staffRoutes.use(requireAdmin, requireRole(["OWNER", "MANAGER"]));

const roles = ["OWNER", "MANAGER", "STAFF", "RECEPTION", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT"] as const;

staffRoutes.get("/admin/staff", asyncHandler(async (req, res) => {
  const query = z.object({ search: z.string().optional(), role: z.string().optional() }).parse(req.query);
  res.json(ok(await listStaff(prisma, query)));
}));

staffRoutes.post("/admin/staff", validateBody(z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8), role: z.enum(roles) })), asyncHandler(async (req, res) => {
  const staff = await createStaff(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(staff));
}));

staffRoutes.patch("/admin/staff/:id", validateBody(z.object({ name: z.string().min(1).optional(), role: z.enum(roles).optional(), active: z.boolean().optional() })), asyncHandler(async (req, res) => {
  res.json(ok(await updateStaff(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));

staffRoutes.post("/admin/staff/:id/reset-password", validateBody(z.object({ password: z.string().min(8) })), asyncHandler(async (req, res) => {
  res.json(ok(await resetStaffPassword(prisma, req.adminUser!, String(req.params.id), req.body.password, auditMetaFrom(req))));
}));
