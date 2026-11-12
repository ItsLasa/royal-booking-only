"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCronSecret = requireCronSecret;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const apiResponse_1 = require("../lib/apiResponse");
const adminSession_1 = require("../lib/adminSession");
const prisma_1 = require("../lib/prisma");
function requireCronSecret(req, _res, next) {
    const provided = req.header("x-cron-secret") || "";
    const bufProvided = crypto_1.default.createHash("sha256").update(provided).digest();
    const bufExpected = crypto_1.default.createHash("sha256").update(env_1.env.CRON_SECRET).digest();
    if (!crypto_1.default.timingSafeEqual(bufProvided, bufExpected)) {
        return next(new apiResponse_1.ApiError(401, "UNAUTHORIZED", "Cron secret is invalid."));
    }
    next();
}
async function requireAdmin(req, _res, next) {
    try {
        const signedToken = req.signedCookies?.[adminSession_1.ADMIN_SESSION_COOKIE];
        const legacyHeader = req.header("x-admin-session");
        const token = signedToken || legacyHeader;
        if (!token)
            throw new apiResponse_1.ApiError(401, "UNAUTHORIZED", "Admin login is required.");
        const session = await prisma_1.prisma.adminSession.findUnique({
            where: { tokenHash: (0, adminSession_1.hashSessionToken)(token) },
            include: { adminUser: true },
        });
        if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.adminUser.active) {
            throw new apiResponse_1.ApiError(401, "UNAUTHORIZED", "Admin session expired. Please log in again.");
        }
        req.adminSessionId = session.id;
        req.adminUser = {
            id: session.adminUser.id,
            name: session.adminUser.name,
            email: session.adminUser.email,
            role: session.adminUser.role,
        };
        await prisma_1.prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
        next();
    }
    catch (error) {
        next(error);
    }
}
function requireRole(roles) {
    return (req, _res, next) => {
        if (!req.adminUser || !roles.includes(req.adminUser.role))
            return next(new apiResponse_1.ApiError(403, "FORBIDDEN", "You do not have permission for this admin action."));
        next();
    };
}
