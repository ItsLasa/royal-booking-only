"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHousekeepingBoard = getHousekeepingBoard;
exports.upsertHousekeepingTask = upsertHousekeepingTask;
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
async function getHousekeepingBoard(prisma, date) {
    const scheduledDate = new Date(`${date}T00:00:00.000Z`);
    const [units, tasks, staff] = await Promise.all([
        prisma.unit.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { amenities: { include: { amenity: true } } } }),
        prisma.housekeepingTask.findMany({ where: { scheduledDate }, include: { assignedTo: true }, orderBy: { updatedAt: "desc" } }),
        prisma.adminUser.findMany({ where: { active: true, role: { in: ["HOUSEKEEPING", "MANAGER", "OWNER"] } }, select: { id: true, name: true, role: true } }),
    ]);
    const occupiedUnitIds = await prisma.booking.findMany({
        where: { bookingStatus: { in: ["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "HOLD"] }, checkInDate: { lte: scheduledDate }, checkOutDate: { gt: scheduledDate } },
        select: { unitId: true },
    });
    const occupied = new Set(occupiedUnitIds.map((b) => b.unitId));
    const taskByUnit = new Map(tasks.map((t) => [t.unitId, t]));
    const board = units.map((unit) => ({
        unit,
        status: taskByUnit.get(unit.id)?.status ?? (occupied.has(unit.id) ? "OCCUPIED" : "READY"),
        task: taskByUnit.get(unit.id) ?? null,
    }));
    const counts = board.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
    }, {});
    return { date, board, staff, counts, totalUnits: units.length };
}
async function upsertHousekeepingTask(prisma, actor, input, meta) {
    const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
    if (!unit)
        throw new apiResponse_1.ApiError(404, "UNIT_NOT_FOUND", "Unit not found.");
    const scheduledDate = new Date(`${input.scheduledDate}T00:00:00.000Z`);
    const existing = await prisma.housekeepingTask.findUnique({ where: { unitId_scheduledDate: { unitId: input.unitId, scheduledDate } } });
    if (existing) {
        const updated = await prisma.housekeepingTask.update({
            where: { unitId_scheduledDate: { unitId: input.unitId, scheduledDate } },
            data: { status: input.status, assignedToId: input.assignedToId ?? null, notes: input.notes ?? null, completedAt: input.status === "INSPECTED" ? new Date() : null },
        });
        await (0, audit_1.writeAudit)(prisma, actor, "HOUSEKEEPING_STATUS_CHANGED", "Unit", unit.id, { status: existing.status }, { status: updated.status }, meta);
        return updated;
    }
    const created = await prisma.housekeepingTask.create({
        data: { propertyId: unit.propertyId, unitId: unit.id, scheduledDate, status: input.status, assignedToId: input.assignedToId ?? null, notes: input.notes ?? null, completedAt: input.status === "INSPECTED" ? new Date() : null },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "HOUSEKEEPING_TASK_CREATED", "Unit", unit.id, undefined, { status: created.status, date: input.scheduledDate }, meta);
    return created;
}
