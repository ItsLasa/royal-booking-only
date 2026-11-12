import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export async function getHousekeepingBoard(prisma: PrismaClient, date: string) {
  const scheduledDate = new Date(`${date}T00:00:00.000Z`);
  const [units, tasks, staff] = await Promise.all([
    prisma.unit.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { amenities: { include: { amenity: true } } } }),
    prisma.housekeepingTask.findMany({ where: { scheduledDate }, include: { assignedTo: true }, orderBy: { updatedAt: "desc" } }),
    prisma.adminUser.findMany({ where: { active: true, role: { in: ["HOUSEKEEPING", "MANAGER", "OWNER"] as never[] } }, select: { id: true, name: true, role: true } }),
  ]);

  const occupiedUnitIds = await prisma.booking.findMany({
    where: { bookingStatus: { in: ["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "HOLD"] as never[] }, checkInDate: { lte: scheduledDate }, checkOutDate: { gt: scheduledDate } },
    select: { unitId: true },
  });
  const occupied = new Set(occupiedUnitIds.map((b) => b.unitId));

  const taskByUnit = new Map(tasks.map((t) => [t.unitId, t]));
  const board = units.map((unit) => ({
    unit,
    status: taskByUnit.get(unit.id)?.status ?? (occupied.has(unit.id) ? "OCCUPIED" : "READY"),
    task: taskByUnit.get(unit.id) ?? null,
  }));

  const counts = board.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return { date, board, staff, counts, totalUnits: units.length };
}

export async function upsertHousekeepingTask(prisma: PrismaClient, actor: AdminActor, input: { unitId: string; scheduledDate: string; status: string; assignedToId?: string | null; notes?: string | null }, meta?: AuditMeta) {
  const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
  if (!unit) throw new ApiError(404, "UNIT_NOT_FOUND", "Unit not found.");
  const scheduledDate = new Date(`${input.scheduledDate}T00:00:00.000Z`);
  const existing = await prisma.housekeepingTask.findUnique({ where: { unitId_scheduledDate: { unitId: input.unitId, scheduledDate } } });

  if (existing) {
    const updated = await prisma.housekeepingTask.update({
      where: { unitId_scheduledDate: { unitId: input.unitId, scheduledDate } },
      data: { status: input.status as never, assignedToId: input.assignedToId ?? null, notes: input.notes ?? null, completedAt: input.status === "INSPECTED" ? new Date() : null },
    });
    await writeAudit(prisma, actor, "HOUSEKEEPING_STATUS_CHANGED", "Unit", unit.id, { status: existing.status }, { status: updated.status }, meta);
    return updated;
  }

  const created = await prisma.housekeepingTask.create({
    data: { propertyId: unit.propertyId, unitId: unit.id, scheduledDate, status: input.status as never, assignedToId: input.assignedToId ?? null, notes: input.notes ?? null, completedAt: input.status === "INSPECTED" ? new Date() : null },
  });
  await writeAudit(prisma, actor, "HOUSEKEEPING_TASK_CREATED", "Unit", unit.id, undefined, { status: created.status, date: input.scheduledDate }, meta);
  return created;
}
