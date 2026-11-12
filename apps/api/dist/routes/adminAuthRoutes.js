"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const date_fns_1 = require("date-fns");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const adminSession_1 = require("../lib/adminSession");
const env_1 = require("../config/env");
const loginLimiter = (0, express_rate_limit_1.default)({
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
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
function cookieOptions() {
    return {
        httpOnly: true,
        signed: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: adminSession_1.ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
    };
}
exports.adminAuthRoutes = (0, express_1.Router)();
exports.adminAuthRoutes.post("/admin/auth/login", loginLimiter, (0, validation_1.validateBody)(loginSchema), async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.adminUser.findUnique({ where: { email: req.body.email.toLowerCase() } });
        if (!user || !user.active)
            throw new apiResponse_1.ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
        const valid = await bcryptjs_1.default.compare(req.body.password, user.passwordHash);
        if (!valid) {
            await prisma_1.prisma.auditLog.create({ data: { action: "ADMIN_LOGIN_FAILED", entityType: "AdminUser", entityId: user.id, ipAddress: req.ip, userAgent: req.get("user-agent") } });
            throw new apiResponse_1.ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
        }
        const token = (0, adminSession_1.createSessionToken)();
        const expiresAt = (0, date_fns_1.addDays)(new Date(), adminSession_1.ADMIN_SESSION_DAYS);
        const session = await prisma_1.prisma.adminSession.create({
            data: { adminUserId: user.id, tokenHash: (0, adminSession_1.hashSessionToken)(token), ipAddress: req.ip, userAgent: req.get("user-agent"), expiresAt },
        });
        await prisma_1.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await prisma_1.prisma.auditLog.create({ data: { adminUserId: user.id, action: "ADMIN_LOGIN_SUCCESS", entityType: "AdminSession", entityId: session.id, ipAddress: req.ip, userAgent: req.get("user-agent") } });
        res.cookie(adminSession_1.ADMIN_SESSION_COOKIE, token, cookieOptions());
        res.json((0, apiResponse_1.ok)({ user: (0, adminSession_1.publicAdminUser)(user), expiresAt }));
    }
    catch (error) {
        next(error);
    }
});
exports.adminAuthRoutes.get("/admin/auth/me", auth_1.requireAdmin, async (req, res) => {
    res.json((0, apiResponse_1.ok)({ user: req.adminUser }));
});
exports.adminAuthRoutes.post("/admin/auth/logout", auth_1.requireAdmin, async (req, res, next) => {
    try {
        if (req.adminSessionId)
            await prisma_1.prisma.adminSession.update({ where: { id: req.adminSessionId }, data: { revokedAt: new Date() } });
        res.clearCookie(adminSession_1.ADMIN_SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
        res.json((0, apiResponse_1.ok)({ loggedOut: true }));
    }
    catch (error) {
        next(error);
    }
});
