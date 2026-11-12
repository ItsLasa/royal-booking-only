import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { addDays } from "date-fns";
import { prisma } from "../lib/prisma";
import { ApiError, ok } from "../lib/apiResponse";
import { validateBody } from "../middleware/validation";
import { requireAdmin } from "../middleware/auth";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DAYS, createSessionToken, hashSessionToken, publicAdminUser } from "../lib/adminSession";
import { env } from "../config/env";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many login attempts. Please try again after 15 minutes.",
    },
  },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function cookieOptions() {
  return {
    httpOnly: true,
    signed: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export const adminAuthRoutes = Router();

adminAuthRoutes.post("/admin/auth/login", loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.adminUser.findUnique({ where: { email: req.body.email.toLowerCase() } });
    if (!user || !user.active) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) {
      await prisma.auditLog.create({ data: { action: "ADMIN_LOGIN_FAILED", entityType: "AdminUser", entityId: user.id, ipAddress: req.ip, userAgent: req.get("user-agent") } });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    const token = createSessionToken();
    const expiresAt = addDays(new Date(), ADMIN_SESSION_DAYS);
    const session = await prisma.adminSession.create({
      data: { adminUserId: user.id, tokenHash: hashSessionToken(token), ipAddress: req.ip, userAgent: req.get("user-agent"), expiresAt },
    });
    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { adminUserId: user.id, action: "ADMIN_LOGIN_SUCCESS", entityType: "AdminSession", entityId: session.id, ipAddress: req.ip, userAgent: req.get("user-agent") } });
    res.cookie(ADMIN_SESSION_COOKIE, token, cookieOptions());
    res.json(ok({ user: publicAdminUser(user), expiresAt }));
  } catch (error) {
    next(error);
  }
});

adminAuthRoutes.get("/admin/auth/me", requireAdmin, async (req, res) => {
  res.json(ok({ user: req.adminUser }));
});

adminAuthRoutes.post("/admin/auth/logout", requireAdmin, async (req, res, next) => {
  try {
    if (req.adminSessionId) await prisma.adminSession.update({ where: { id: req.adminSessionId }, data: { revokedAt: new Date() } });
    res.clearCookie(ADMIN_SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.json(ok({ loggedOut: true }));
  } catch (error) {
    next(error);
  }
});
