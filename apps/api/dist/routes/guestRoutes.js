"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const guestService_1 = require("../services/guestService");
exports.guestRoutes = (0, express_1.Router)();
exports.guestRoutes.use(auth_1.requireAdmin);
exports.guestRoutes.get("/admin/guests", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = zod_1.z.object({ search: zod_1.z.string().optional(), page: zod_1.z.coerce.number().int().min(1).optional(), pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
    res.json((0, apiResponse_1.ok)(await (0, guestService_1.listGuests)(prisma_1.prisma, query)));
}));
exports.guestRoutes.get("/admin/guests/:id", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, guestService_1.getGuestDetail)(prisma_1.prisma, String(req.params.id))));
}));
exports.guestRoutes.patch("/admin/guests/:id", (0, validation_1.validateBody)(zod_1.z.object({
    country: zod_1.z.string().max(100).nullable().optional(),
    address: zod_1.z.string().max(500).nullable().optional(),
    identityDocumentReference: zod_1.z.string().max(200).nullable().optional(),
    marketingConsent: zod_1.z.boolean().optional(),
    preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    internalNotes: zod_1.z.string().max(2000).nullable().optional(),
})), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json((0, apiResponse_1.ok)(await (0, guestService_1.updateGuest)(prisma_1.prisma, String(req.params.id), req.body)));
}));
