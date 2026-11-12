"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const asyncHandler_1 = require("../lib/asyncHandler");
const availabilityService_1 = require("../services/availabilityService");
exports.cronRoutes = (0, express_1.Router)();
exports.cronRoutes.post("/cron/expire-holds", auth_1.requireCronSecret, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const result = await (0, availabilityService_1.expireHolds)(prisma_1.prisma);
    res.json((0, apiResponse_1.ok)({ expired: result.count }));
}));
