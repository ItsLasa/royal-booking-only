import { Router } from "express";
import { requireCronSecret } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { expireHolds } from "../services/availabilityService";

export const cronRoutes = Router();
cronRoutes.post("/cron/expire-holds", requireCronSecret, asyncHandler(async (_req, res) => {
  const result = await expireHolds(prisma);
  res.json(ok({ expired: result.count }));
}));
