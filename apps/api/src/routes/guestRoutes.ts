import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validation";
import { requireAdmin, requireRole } from "../middleware/auth";
import { getGuestDetail, listGuests, updateGuest } from "../services/guestService";

export const guestRoutes = Router();
guestRoutes.use(requireAdmin, requireRole(["OWNER", "MANAGER", "RECEPTION"]));

guestRoutes.get("/admin/guests", asyncHandler(async (req, res) => {
  const query = z.object({ search: z.string().optional(), page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
  res.json(ok(await listGuests(prisma, query)));
}));

guestRoutes.get("/admin/guests/:id", asyncHandler(async (req, res) => {
  res.json(ok(await getGuestDetail(prisma, String(req.params.id))));
}));

guestRoutes.patch("/admin/guests/:id", validateBody(z.object({
  country: z.string().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  identityDocumentReference: z.string().max(200).nullable().optional(),
  marketingConsent: z.boolean().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
})), asyncHandler(async (req, res) => {
  res.json(ok(await updateGuest(prisma, String(req.params.id), req.body)));
}));
