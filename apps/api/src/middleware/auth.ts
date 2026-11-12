import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../lib/apiResponse";
import { ADMIN_SESSION_COOKIE, hashSessionToken } from "../lib/adminSession";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      adminUser?: { id: string; name: string; email: string; role: string };
      adminSessionId?: string;
    }
  }
}

export function requireCronSecret(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header("x-cron-secret") || "";
  const bufProvided = crypto.createHash("sha256").update(provided).digest();
  const bufExpected = crypto.createHash("sha256").update(env.CRON_SECRET).digest();

  if (!crypto.timingSafeEqual(bufProvided, bufExpected)) {
    return next(new ApiError(401, "UNAUTHORIZED", "Cron secret is invalid."));
  }
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const signedToken = req.signedCookies?.[ADMIN_SESSION_COOKIE];
    const legacyHeader = req.header("x-admin-session");
    const token = signedToken || legacyHeader;
    if (!token) throw new ApiError(401, "UNAUTHORIZED", "Admin login is required.");

    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { adminUser: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.adminUser.active) {
      throw new ApiError(401, "UNAUTHORIZED", "Admin session expired. Please log in again.");
    }

    req.adminSessionId = session.id;
    req.adminUser = {
      id: session.adminUser.id,
      name: session.adminUser.name,
      email: session.adminUser.email,
      role: session.adminUser.role,
    };
    await prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.adminUser || !roles.includes(req.adminUser.role)) return next(new ApiError(403, "FORBIDDEN", "You do not have permission for this admin action."));
    next();
  };
}
