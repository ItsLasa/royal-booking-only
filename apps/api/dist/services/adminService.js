"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = getDashboardSummary;
exports.listAdminBookings = listAdminBookings;
exports.listAdminPackages = listAdminPackages;
exports.getAdminCalendarSummary = getAdminCalendarSummary;
exports.createAvailabilityBlock = createAvailabilityBlock;
exports.updateAvailabilityBlock = updateAvailabilityBlock;
exports.deleteAvailabilityBlock = deleteAvailabilityBlock;
exports.listAdminPayments = listAdminPayments;
exports.getBookingStatusReport = getBookingStatusReport;
exports.listRooms = listRooms;
exports.createRoom = createRoom;
exports.updateRoom = updateRoom;
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
const dates_1 = require("../lib/dates");
async function getDashboardSummary(prisma) {
    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const [units, totalBookings, revenue, arrivals, todayBookings, pendingBookings, pendingPayments, recentBookings, recentPayments, notifications, bookingTrendRows, revenueTrendRows, inHouseRows] = await Promise.all([
        prisma.unit.findMany({ select: { id: true, inventoryCount: true, active: true } }),
        prisma.booking.count(),
        prisma.booking.aggregate({ _sum: { grandTotal: true, amountPaid: true } }),
        prisma.booking.findMany({ where: { checkInDate: { gte: todayStart, lt: tomorrow }, bookingStatus: { not: "CANCELLED" } }, take: 8, orderBy: { checkInDate: "asc" }, include: { guest: true, package: true } }),
        prisma.booking.findMany({ where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED"] }, checkInDate: { lt: tomorrow }, checkOutDate: { gt: todayStart } } }),
        prisma.booking.count({ where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT"] } } }),
        prisma.booking.count({ where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] }, bookingStatus: { notIn: ["CANCELLED", "EXPIRED"] } } }),
        prisma.booking.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { guest: true, package: true, payments: true } }),
        prisma.payment.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { booking: { include: { guest: true } } } }),
        prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { adminUser: true } }),
        prisma.booking.findMany({ where: { createdAt: { gte: new Date(todayStart.getTime() - 90 * 86_400_000) } }, select: { createdAt: true }, take: 3000 }),
        prisma.booking.findMany({ where: { bookingStatus: { not: "CANCELLED" }, createdAt: { gte: new Date(todayStart.getTime() - 180 * 86_400_000) } }, select: { createdAt: true, grandTotal: true }, take: 3000 }),
        prisma.booking.findMany({ where: { bookingStatus: { in: ["CONFIRMED", "COMPLETED"] }, checkInDate: { lt: tomorrow }, checkOutDate: { gt: todayStart } } }),
    ]);
    const activeUnits = units.filter((u) => u.active).reduce((sum, u) => sum + u.inventoryCount, 0);
    const inHouseCount = inHouseRows.length;
    const occupancyPct = activeUnits > 0 ? Math.round((inHouseCount / activeUnits) * 100) : 0;
    const checkIns = todayBookings.filter((b) => b.checkInDate >= todayStart).length;
    const checkOuts = todayBookings.filter((b) => b.checkOutDate <= tomorrow && b.checkOutDate >= todayStart).length;
    const totalGuests = todayBookings.reduce((sum, b) => sum + b.adults + b.children + b.infants, 0);
    const availableRooms = Math.max(0, activeUnits - inHouseCount);
    const aggregateByDay = (rows) => {
        const map = new Map();
        for (const row of rows) {
            const key = row.createdAt.toISOString().slice(0, 10);
            const entry = map.get(key) ?? { bookings: 0, revenue: 0 };
            entry.bookings += 1;
            if (row.grandTotal)
                entry.revenue += Number(row.grandTotal);
            map.set(key, entry);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, ...value }));
    };
    return {
        kpis: {
            todayRevenue: revenue._sum.grandTotal ?? 0,
            todayPaid: revenue._sum.amountPaid ?? 0,
            occupancyPct,
            checkInsToday: checkIns,
            checkOutsToday: checkOuts,
            pendingBookings,
            pendingPayments,
            availableRooms,
            totalGuests,
            totalBookings,
        },
        charts: {
            bookingTrend: aggregateByDay(bookingTrendRows),
            revenueTrend: aggregateByDay(revenueTrendRows),
            occupancy: { inHouse: inHouseCount, available: activeUnits, pct: occupancyPct },
        },
        arrivals,
        recentBookings,
        recentPayments,
        notifications,
    };
}
async function listAdminBookings(prisma) {
    return prisma.booking.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { guest: true, package: true, payments: true } });
}
async function listAdminPackages(prisma) {
    return prisma.package.findMany({ include: { unit: true, images: true, seasonalRates: true, dateOverrides: true } });
}
async function getAdminCalendarSummary(prisma, month) {
    const [units, bookings, blocks, maintenance] = await Promise.all([
        prisma.unit.findMany({ where: { active: true }, include: { packages: true } }),
        prisma.booking.findMany({ where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED"] } }, include: { package: true, guest: true } }),
        prisma.availabilityBlock.findMany({ include: { unit: true, createdBy: { select: { id: true, name: true } } } }),
        prisma.maintenanceIssue.findMany({ where: { status: { not: "COMPLETED" } }, include: { unit: true } }),
    ]);
    return { units, bookings, blocks, maintenance };
}
async function createAvailabilityBlock(prisma, actor, input, meta) {
    const block = await prisma.availabilityBlock.create({
        data: { unitId: input.unitId, startDate: (0, dates_1.parseDateOnly)(input.startDate), endDate: (0, dates_1.parseDateOnly)(input.endDate), reason: input.reason, notes: input.notes, createdById: actor.id },
        include: { unit: true, createdBy: { select: { id: true, name: true } } },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "BLOCK_CREATED", "AvailabilityBlock", block.id, undefined, input, meta);
    return block;
}
async function updateAvailabilityBlock(prisma, actor, id, patch, meta) {
    const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "BLOCK_NOT_FOUND", "Availability block not found.");
    const data = {};
    if (patch.unitId !== undefined)
        data.unitId = patch.unitId;
    if (patch.startDate !== undefined)
        data.startDate = (0, dates_1.parseDateOnly)(patch.startDate);
    if (patch.endDate !== undefined)
        data.endDate = (0, dates_1.parseDateOnly)(patch.endDate);
    if (patch.reason !== undefined)
        data.reason = patch.reason;
    if (patch.notes !== undefined)
        data.notes = patch.notes;
    const updated = await prisma.availabilityBlock.update({ where: { id }, data, include: { unit: true } });
    await (0, audit_1.writeAudit)(prisma, actor, "BLOCK_UPDATED", "AvailabilityBlock", id, existing, patch, meta);
    return updated;
}
async function deleteAvailabilityBlock(prisma, actor, id, meta) {
    const existing = await prisma.availabilityBlock.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "BLOCK_NOT_FOUND", "Availability block not found.");
    await prisma.availabilityBlock.delete({ where: { id } });
    await (0, audit_1.writeAudit)(prisma, actor, "BLOCK_DELETED", "AvailabilityBlock", id, existing, undefined, meta);
    return { deleted: true };
}
async function listAdminPayments(prisma) {
    return prisma.payment.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { booking: true, events: true } });
}
async function getBookingStatusReport(prisma) {
    const byStatus = await prisma.booking.groupBy({ by: ["bookingStatus"], _count: true, _sum: { grandTotal: true } });
    return { byStatus };
}
// ---- Rooms module ----
async function listRooms(prisma) {
    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const [units, inHouse, tasks, issues, blocks] = await Promise.all([
        prisma.unit.findMany({ include: { amenities: { include: { amenity: true } }, packages: true, housekeepingTasks: { orderBy: { scheduledDate: "desc" }, take: 1 } } }),
        prisma.booking.findMany({ where: { bookingStatus: { in: ["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_PROCESSING"] }, checkInDate: { lt: tomorrow }, checkOutDate: { gt: todayStart } }, include: { guest: true, package: true } }),
        prisma.housekeepingTask.findMany({ where: { scheduledDate: todayStart }, orderBy: { updatedAt: "desc" } }),
        prisma.maintenanceIssue.findMany({ where: { status: { not: "COMPLETED" } } }),
        prisma.availabilityBlock.findMany({ where: { startDate: { lt: tomorrow }, endDate: { gt: todayStart } } }),
    ]);
    const bookingsByUnit = new Map();
    for (const booking of inHouse) {
        const list = bookingsByUnit.get(booking.unitId) ?? [];
        list.push(booking);
        bookingsByUnit.set(booking.unitId, list);
    }
    const rooms = units.map((unit) => {
        const activeBookings = bookingsByUnit.get(unit.id) ?? [];
        const task = tasks.find((t) => t.unitId === unit.id);
        const openIssue = issues.find((i) => i.unitId === unit.id);
        const isBlocked = blocks.some((b) => b.unitId === unit.id);
        const status = isBlocked ? "BLOCKED" : openIssue ? "MAINTENANCE" : activeBookings.length > 0 ? "OCCUPIED" : task ? task.status : "AVAILABLE";
        return { unit, status, activeBookings, housekeeping: task ?? null, maintenance: openIssue ?? null };
    });
    return { rooms, today: todayStart.toISOString().slice(0, 10) };
}
async function createRoom(prisma, actor, input, meta) {
    const property = await prisma.property.findFirst();
    if (!property)
        throw new apiResponse_1.ApiError(404, "PROPERTY_NOT_FOUND", "No property configured.");
    const existing = await prisma.unit.findUnique({ where: { propertyId_slug: { propertyId: property.id, slug: input.slug } } });
    if (existing)
        throw new apiResponse_1.ApiError(409, "SLUG_IN_USE", "A room with this slug already exists.");
    const unit = await prisma.unit.create({
        data: { propertyId: property.id, name: input.name, slug: input.slug, description: input.description ?? null, unitType: input.unitType ?? "PRIVATE_VILLA", inventoryCount: input.inventoryCount ?? 1, bedrooms: input.bedrooms ?? 1, bathrooms: input.bathrooms ?? 1, baseOccupancy: input.baseOccupancy ?? 2, maximumOccupancy: input.maximumOccupancy ?? 10, active: input.active ?? true },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "ROOM_CREATED", "Unit", unit.id, undefined, input, meta);
    return unit;
}
async function updateRoom(prisma, actor, id, patch, meta) {
    const existing = await prisma.unit.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "ROOM_NOT_FOUND", "Room not found.");
    const updated = await prisma.unit.update({ where: { id }, data: patch });
    await (0, audit_1.writeAudit)(prisma, actor, "ROOM_UPDATED", "Unit", id, existing, patch, meta);
    return updated;
}
