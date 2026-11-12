import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { getCalendarFeed } from "../services/calendarService";

export const calendarRoutes = Router();

calendarRoutes.get("/calendar/:token.ics", asyncHandler(async (req, res) => {
  const feed = await getCalendarFeed(prisma, String(req.params.token));
  res.setHeader("Content-Type", "text/calendar");
  res.send(feed);
}));
