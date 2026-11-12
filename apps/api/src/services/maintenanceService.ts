import { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/apiResponse";
import { writeAudit, AdminActor, AuditMeta } from "../lib/audit";

export type MaintenanceListQuery = { page?: number; pageSize?: number; status?: string; priority?: string; unitId?: string };

export async function listMaintenanceIssues(prisma: PrismaClient, query: MaintenanceListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const where: Prisma.MaintenanceIssueWhereInput = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.priority ? { priority: query.priority as never } : {}),
    ...(query.unitId ? { unitId: query.unitId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.maintenanceIssue.findMany({ where, include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } }, reportedBy: { select: { id: true, name: true, role: true } } }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.maintenanceIssue.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function createMaintenanceIssue(prisma: PrismaClient, actor: AdminActor, input: { unitId?: string | null; title: string; description?: string | null; priority?: string; assignedToId?: string | null }, meta?: AuditMeta) {
  const issue = await prisma.maintenanceIssue.create({
    data: { propertyId: (await prisma.property.findFirst())?.id ?? "prop", unitId: input.unitId ?? null, title: input.title, description: input.description ?? null, priority: (input.priority ?? "MEDIUM") as never, assignedToId: input.assignedToId ?? null, reportedById: actor.id },
    include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } } },
  });
  await writeAudit(prisma, actor, "MAINTENANCE_REPORTED", "MaintenanceIssue", issue.id, undefined, input, meta);
  return issue;
}

export async function updateMaintenanceIssue(prisma: PrismaClient, actor: AdminActor, id: string, patch: Partial<{ title: string; description: string | null; status: string; priority: string; unitId: string | null; assignedToId: string | null }>, meta?: AuditMeta) {
  const existing = await prisma.maintenanceIssue.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "ISSUE_NOT_FOUND", "Maintenance issue not found.");
  const updated = await prisma.maintenanceIssue.update({
    where: { id },
    data: { ...patch, status: patch.status as never, priority: patch.priority as never, resolvedAt: patch.status === "COMPLETED" ? new Date() : null },
    include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } } },
  });
  await writeAudit(prisma, actor, "MAINTENANCE_UPDATED", "MaintenanceIssue", id, existing, patch, meta);
  return updated;
}
