"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMaintenanceIssues = listMaintenanceIssues;
exports.createMaintenanceIssue = createMaintenanceIssue;
exports.updateMaintenanceIssue = updateMaintenanceIssue;
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
async function listMaintenanceIssues(prisma, query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.unitId ? { unitId: query.unitId } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.maintenanceIssue.findMany({ where, include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } }, reportedBy: { select: { id: true, name: true, role: true } } }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        prisma.maintenanceIssue.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
async function createMaintenanceIssue(prisma, actor, input, meta) {
    const issue = await prisma.maintenanceIssue.create({
        data: { propertyId: (await prisma.property.findFirst())?.id ?? "prop", unitId: input.unitId ?? null, title: input.title, description: input.description ?? null, priority: (input.priority ?? "MEDIUM"), assignedToId: input.assignedToId ?? null, reportedById: actor.id },
        include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } } },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "MAINTENANCE_REPORTED", "MaintenanceIssue", issue.id, undefined, input, meta);
    return issue;
}
async function updateMaintenanceIssue(prisma, actor, id, patch, meta) {
    const existing = await prisma.maintenanceIssue.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "ISSUE_NOT_FOUND", "Maintenance issue not found.");
    const updated = await prisma.maintenanceIssue.update({
        where: { id },
        data: { ...patch, status: patch.status, priority: patch.priority, resolvedAt: patch.status === "COMPLETED" ? new Date() : null },
        include: { unit: true, assignedTo: { select: { id: true, name: true, role: true } } },
    });
    await (0, audit_1.writeAudit)(prisma, actor, "MAINTENANCE_UPDATED", "MaintenanceIssue", id, existing, patch, meta);
    return updated;
}
