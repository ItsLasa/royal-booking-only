"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const prisma_1 = require("../lib/prisma");
const calendarService_1 = require("../services/calendarService");
exports.calendarRoutes = (0, express_1.Router)();
exports.calendarRoutes.get("/calendar/:token.ics", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const feed = await (0, calendarService_1.getCalendarFeed)(prisma_1.prisma, String(req.params.token));
    res.setHeader("Content-Type", "text/calendar");
    res.send(feed);
}));
