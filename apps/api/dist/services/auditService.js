"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
async function listAuditLogs(prisma, query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const where = {
        ...(query.action ? { action: { contains: query.action } } : {}),
        ...(query.entityType ? { entityType: { contains: query.entityType } } : {}),
        ...(query.adminId ? { adminUserId: query.adminId } : {}),
        ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}) } } : {}),
        ...(query.search ? { OR: [{ action: { contains: query.search } }, { entityType: { contains: query.search } }, { entityId: { contains: query.search } }] } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.auditLog.findMany({ where, include: { adminUser: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
