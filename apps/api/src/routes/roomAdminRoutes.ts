import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { auditMetaFrom } from "../lib/audit";
import { createRoom, listRooms, updateRoom } from "../services/adminService";

export const roomAdminRoutes = Router();
roomAdminRoutes.use(requireAdmin);

roomAdminRoutes.get("/admin/rooms", asyncHandler(async (_req, res) => {
  res.json(ok(await listRooms(prisma)));
}));

const roomSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  unitType: z.string().optional(),
  inventoryCount: z.number().int().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  baseOccupancy: z.number().int().positive().optional(),
  maximumOccupancy: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

roomAdminRoutes.post("/admin/rooms", requireRole(["OWNER", "MANAGER"]), validateBody(roomSchema), asyncHandler(async (req, res) => {
  const room = await createRoom(prisma, req.adminUser!, req.body, auditMetaFrom(req));
  res.status(201).json(ok(room));
}));

roomAdminRoutes.patch("/admin/rooms/:id", requireRole(["OWNER", "MANAGER"]), validateBody(roomSchema.partial()), asyncHandler(async (req, res) => {
  res.json(ok(await updateRoom(prisma, req.adminUser!, String(req.params.id), req.body, auditMetaFrom(req))));
}));
