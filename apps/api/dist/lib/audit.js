"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
exports.auditMetaFrom = auditMetaFrom;
async function writeAudit(prisma, actor, action, entityType, entityId, oldValues, newValues, meta) {
    return prisma.auditLog.create({
        data: {
            adminUserId: actor?.id,
            action,
            entityType,
            entityId,
            oldValues: oldValues,
            newValues: newValues,
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
        },
    });
}
function auditMetaFrom(req) {
    return { ipAddress: req.ip, userAgent: req.get?.("user-agent") };
}
